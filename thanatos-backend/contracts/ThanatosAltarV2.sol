// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IReincarnator, IBuyback} from "./interfaces/IExecutors.sol";

/// @title THANATOS Altar v2
/// @notice Burns dead tokens to 0x…dEaD, scores karma on-chain, runs epochs, splits treasury
///         and pays fee share per epoch. Agent (keeper) can only trigger rebirth; it cannot
///         move user funds. All setters are one-way frozen after setup.
contract ThanatosAltarV2 is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BPS = 10_000;
    uint256 public constant KARMA_SCALE = 1e18;
    bytes32 public constant VOUCHER_TYPEHASH =
        keccak256("Voucher(address token,uint16 multBps,uint64 expiry,uint256 chainId,address altar)");

    enum Phase { Burning, Evaluating, Rebirth }

    // ---- immutable-after-freeze config ----
    address public owner;
    address public keeper;
    address public verifier;
    address public protocolSplitter;
    IReincarnator public reincarnator;
    IBuyback public buyback;
    bool public frozen;

    uint256 public altarFee;
    uint256 public baseKarma;
    uint256 public baseCapPerWallet;
    uint256 public maxClockBonusPerWallet;
    uint256 public clockBonusPerKarma;
    uint256 public epochDuration;
    uint256 public targetGrowthBps;
    uint16 public protocolBps;
    uint16 public feeShareBps;
    uint16 public seedBps;
    uint16 public buybackBps;

    // ---- epoch state ----
    uint256 public epoch;
    uint256 public epochEndsAt;
    uint256 public soulWeight;
    uint256 public soulTarget;
    Phase public phase;
    uint256 public totalDistributed;
    uint256 public reserved;

    mapping(uint256 => uint256) public totalKarmaOf;
    mapping(uint256 => mapping(address => uint256)) public karmaOf;
    mapping(uint256 => mapping(address => uint256)) public unvouchedKarmaOf;
    mapping(uint256 => mapping(address => uint256)) public clockBonusOf;
    mapping(uint256 => uint256) public feePoolOf;
    mapping(address => uint256) public claimCursor;
    mapping(uint256 => address) public rebornToken;

    event Offering(uint256 indexed epoch, address indexed wallet, address indexed token, uint256 amount, uint256 karma, bool verified, uint16 multBps, uint256 fee);
    event Sealed(uint256 indexed epoch, uint256 soulWeight, uint256 totalKarma);
    event Reborn(uint256 indexed epoch, address newToken, uint256 feeShare, uint256 seeded, uint256 buyback, uint256 protocol);
    event Claimed(address indexed wallet, uint256 amount, uint256 fromEpoch, uint256 toEpoch);
    event TreasuryIn(address indexed from, uint256 amount);
    event ConfigSet(bytes32 indexed key, uint256 value);
    event AddressSet(bytes32 indexed key, address value);
    event Frozen();

    error NotOwner();
    error NotKeeper();
    error IsFrozen();
    error WrongPhase();
    error WrongFee();
    error ZeroAmount();
    error NothingBurned();
    error BadVoucher();
    error NotSealable();
    error ExecutorsUnset();
    error ZeroAddress();

    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }
    modifier onlyKeeper() { if (msg.sender != keeper) revert NotKeeper(); _; }
    modifier notFrozen() { if (frozen) revert IsFrozen(); _; }

    constructor(
        address _owner,
        address _keeper,
        address _verifier,
        address _protocolSplitter,
        uint256 _firstEpochDuration,
        uint256 _soulTarget
    ) EIP712("THANATOS Altar", "2") {
        if (_owner == address(0) || _keeper == address(0) || _verifier == address(0) || _protocolSplitter == address(0)) revert ZeroAddress();
        owner = _owner;
        keeper = _keeper;
        verifier = _verifier;
        protocolSplitter = _protocolSplitter;

        altarFee = 0.0005 ether;
        baseKarma = 38 * KARMA_SCALE;
        baseCapPerWallet = 380 * KARMA_SCALE;
        maxClockBonusPerWallet = 30 minutes;
        clockBonusPerKarma = 1 minutes;
        epochDuration = 24 hours;
        targetGrowthBps = 12_500;
        protocolBps = 2000;
        feeShareBps = 3000;
        seedBps = 4000;
        buybackBps = 3000;

        epoch = 1;
        epochEndsAt = block.timestamp + _firstEpochDuration;
        soulTarget = _soulTarget;
        phase = Phase.Burning;
    }

    receive() external payable {
        emit TreasuryIn(msg.sender, msg.value);
    }

    // ------------------------------------------------------------ offerings

    function sacrifice(address token, uint256 amount, uint16 multBps, uint64 expiry, bytes calldata sig)
        external
        payable
        nonReentrant
    {
        if (phase != Phase.Burning) revert WrongPhase();
        if (msg.value != altarFee) revert WrongFee();
        if (amount == 0) revert ZeroAmount();

        uint256 before = IERC20(token).balanceOf(DEAD);
        IERC20(token).safeTransferFrom(msg.sender, DEAD, amount);
        uint256 burned = IERC20(token).balanceOf(DEAD) - before;
        if (burned == 0) revert NothingBurned();

        bool verified = sig.length != 0;
        uint256 karma;
        if (verified) {
            if (expiry < block.timestamp || multBps == 0) revert BadVoucher();
            bytes32 digest = _hashTypedDataV4(
                keccak256(abi.encode(VOUCHER_TYPEHASH, token, multBps, expiry, block.chainid, address(this)))
            );
            if (ECDSA.recover(digest, sig) != verifier) revert BadVoucher();
            karma = (_baseFor(token, burned) * multBps) / BPS;
        } else {
            uint256 used = unvouchedKarmaOf[epoch][msg.sender];
            uint256 room = used >= baseCapPerWallet ? 0 : baseCapPerWallet - used;
            karma = Math.min(baseKarma, room);
            unvouchedKarmaOf[epoch][msg.sender] = used + karma;
        }

        karmaOf[epoch][msg.sender] += karma;
        totalKarmaOf[epoch] += karma;
        soulWeight += karma;

        if (verified && karma > 0) {
            uint256 bonus = (karma * clockBonusPerKarma) / KARMA_SCALE;
            uint256 usedBonus = clockBonusOf[epoch][msg.sender];
            uint256 roomBonus = usedBonus >= maxClockBonusPerWallet ? 0 : maxClockBonusPerWallet - usedBonus;
            bonus = Math.min(bonus, roomBonus);
            clockBonusOf[epoch][msg.sender] = usedBonus + bonus;
            epochEndsAt += bonus;
        }

        emit TreasuryIn(msg.sender, msg.value);
        emit Offering(epoch, msg.sender, token, burned, karma, verified, multBps, msg.value);

        if (soulWeight >= soulTarget) _seal();
    }

    /// @dev log10(human amount + 1) scaled; min 1 karma. Decimals read best-effort.
    function _baseFor(address token, uint256 burned) internal view returns (uint256) {
        uint8 dec = 18;
        (bool ok, bytes memory ret) = token.staticcall(abi.encodeWithSignature("decimals()"));
        if (ok && ret.length >= 32) dec = abi.decode(ret, (uint8));
        uint256 human = burned / (10 ** dec);
        uint256 lg = Math.log10(human + 1);
        uint256 k = lg * KARMA_SCALE;
        return k < KARMA_SCALE ? KARMA_SCALE : k;
    }

    // ------------------------------------------------------------ epoch lifecycle

    function seal() external {
        if (phase != Phase.Burning || block.timestamp < epochEndsAt) revert NotSealable();
        _seal();
    }

    function _seal() internal {
        phase = Phase.Evaluating;
        emit Sealed(epoch, soulWeight, totalKarmaOf[epoch]);
    }

    function rebirth() external onlyKeeper nonReentrant {
        if (phase != Phase.Evaluating) revert WrongPhase();
        if (address(reincarnator) == address(0) || address(buyback) == address(0)) revert ExecutorsUnset();
        phase = Phase.Rebirth;

        uint256 treasury = address(this).balance - reserved;
        uint256 protocolCut = (treasury * protocolBps) / BPS;
        uint256 rest = treasury - protocolCut;
        uint256 feeShare = (rest * feeShareBps) / BPS;
        uint256 seedAmt = (rest * seedBps) / BPS;
        uint256 buybackAmt = rest - feeShare - seedAmt;

        uint256 e = epoch;
        feePoolOf[e] = feeShare;

        if (protocolCut > 0) {
            (bool ok, ) = protocolSplitter.call{value: protocolCut}("");
            if (!ok) feePoolOf[e] += protocolCut;
        }

        address newToken = address(0);
        if (seedAmt > 0) {
            try reincarnator.seed{value: seedAmt}(e) returns (address t) {
                newToken = t;
            } catch {
                feePoolOf[e] += seedAmt;
                seedAmt = 0;
            }
        }
        rebornToken[e] = newToken;

        if (buybackAmt > 0) {
            try buyback.execute{value: buybackAmt}() {} catch {
                feePoolOf[e] += buybackAmt;
                buybackAmt = 0;
            }
        }

        reserved += feePoolOf[e];
        emit Reborn(e, newToken, feePoolOf[e], seedAmt, buybackAmt, protocolCut);

        epoch = e + 1;
        soulWeight = 0;
        soulTarget = (soulTarget * targetGrowthBps) / BPS;
        epochEndsAt = block.timestamp + epochDuration;
        phase = Phase.Burning;
    }

    // ------------------------------------------------------------ fee share

    function claimable(address wallet) public view returns (uint256 owed) {
        for (uint256 e = claimCursor[wallet] + 1; e < epoch; e++) {
            uint256 tk = totalKarmaOf[e];
            if (tk == 0) continue;
            owed += (feePoolOf[e] * karmaOf[e][wallet]) / tk;
        }
    }

    function claim() external nonReentrant {
        uint256 from = claimCursor[msg.sender] + 1;
        uint256 to = epoch - 1;
        uint256 owed = claimable(msg.sender);
        claimCursor[msg.sender] = to;
        if (owed == 0) return;
        totalDistributed += owed;
        reserved -= owed;
        (bool ok, ) = msg.sender.call{value: owed}("");
        require(ok, "send failed");
        emit Claimed(msg.sender, owed, from, to);
    }

    function treasury() external view returns (uint256) {
        return address(this).balance - reserved;
    }

    function soulOf(address wallet) external view returns (uint256) {
        return karmaOf[epoch][wallet];
    }

    // ------------------------------------------------------------ admin (frozen after setup)

    function setExecutors(address _reincarnator, address _buyback) external onlyOwner notFrozen {
        if (_reincarnator == address(0) || _buyback == address(0)) revert ZeroAddress();
        reincarnator = IReincarnator(_reincarnator);
        buyback = IBuyback(_buyback);
        emit AddressSet("reincarnator", _reincarnator);
        emit AddressSet("buyback", _buyback);
    }

    function setRoles(address _keeper, address _verifier, address _protocolSplitter) external onlyOwner notFrozen {
        if (_keeper == address(0) || _verifier == address(0) || _protocolSplitter == address(0)) revert ZeroAddress();
        keeper = _keeper;
        verifier = _verifier;
        protocolSplitter = _protocolSplitter;
        emit AddressSet("keeper", _keeper);
        emit AddressSet("verifier", _verifier);
        emit AddressSet("protocolSplitter", _protocolSplitter);
    }

    function setParams(
        uint256 _altarFee,
        uint256 _baseKarma,
        uint256 _baseCapPerWallet,
        uint256 _maxClockBonusPerWallet,
        uint256 _epochDuration,
        uint256 _targetGrowthBps
    ) external onlyOwner notFrozen {
        altarFee = _altarFee;
        baseKarma = _baseKarma;
        baseCapPerWallet = _baseCapPerWallet;
        maxClockBonusPerWallet = _maxClockBonusPerWallet;
        epochDuration = _epochDuration;
        targetGrowthBps = _targetGrowthBps;
        emit ConfigSet("altarFee", _altarFee);
        emit ConfigSet("baseKarma", _baseKarma);
        emit ConfigSet("baseCapPerWallet", _baseCapPerWallet);
        emit ConfigSet("maxClockBonusPerWallet", _maxClockBonusPerWallet);
        emit ConfigSet("epochDuration", _epochDuration);
        emit ConfigSet("targetGrowthBps", _targetGrowthBps);
    }

    function setSplit(uint16 _protocolBps, uint16 _feeShareBps, uint16 _seedBps, uint16 _buybackBps) external onlyOwner notFrozen {
        require(_protocolBps <= BPS && uint256(_feeShareBps) + _seedBps + _buybackBps == BPS, "split");
        protocolBps = _protocolBps;
        feeShareBps = _feeShareBps;
        seedBps = _seedBps;
        buybackBps = _buybackBps;
        emit ConfigSet("protocolBps", _protocolBps);
        emit ConfigSet("feeShareBps", _feeShareBps);
        emit ConfigSet("seedBps", _seedBps);
        emit ConfigSet("buybackBps", _buybackBps);
    }

    function freeze() external onlyOwner notFrozen {
        if (address(reincarnator) == address(0) || address(buyback) == address(0)) revert ExecutorsUnset();
        frozen = true;
        emit Frozen();
    }

    function voucherDigest(address token, uint16 multBps, uint64 expiry) external view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(VOUCHER_TYPEHASH, token, multBps, expiry, block.chainid, address(this))));
    }
}
