// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IReincarnator, IBuyback, IFeeEscrow} from "./interfaces/IExecutors.sol";

/// @title THANATOS Altar v2
/// @notice Burns dead tokens to 0x…dEaD, scores karma on-chain, runs epochs, splits treasury
///         and pays fee share per epoch. The keeper can only trigger rebirth and buybacks; it
///         cannot move user funds. All setters are one-way frozen after setup.
contract ThanatosAltarV2 is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BPS = 10_000;
    uint256 public constant KARMA_SCALE = 1e18;
    uint256 public constant CLOCK_BONUS_PER_KARMA = 1 minutes;
    bytes32 public constant VOUCHER_TYPEHASH =
        keccak256("Voucher(address token,uint16 multBps,uint64 expiry,uint256 chainId,address altar)");

    enum Phase { Burning, Evaluating }

    IFeeEscrow public immutable feeEscrow;

    // ---- immutable-after-freeze config ----
    address public owner;
    address public keeper;
    address public verifier;
    address public protocolSplitter;
    IReincarnator public reincarnator;
    IBuyback public buyback;
    bool public frozen;

    uint256 public altarFee;
    uint256 public verifiedKarma;
    uint256 public unverifiedKarma;
    uint256 public unverifiedCap;
    uint256 public maxClockBonusPerWallet;
    uint256 public minEpochDuration;
    uint256 public epochDuration;
    uint256 public minTreasury;
    uint256 public targetGrowthBps;
    uint16 public protocolBps;
    uint16 public feeShareBps;
    uint16 public seedBps;
    uint16 public buybackBps;

    // ---- epoch state ----
    uint256 public epoch;
    uint256 public epochStartedAt;
    uint256 public epochEndsAt;
    uint256 public soulWeight;
    uint256 public soulTarget;
    Phase public phase;
    uint256 public totalDistributed;
    uint256 public reserved;
    uint256 public buybackReserve;

    mapping(uint256 => uint256) public totalKarmaOf;
    mapping(uint256 => mapping(address => uint256)) public karmaOf;
    mapping(uint256 => mapping(address => uint256)) public unverifiedKarmaOf;
    mapping(uint256 => mapping(address => uint256)) public clockBonusOf;
    mapping(uint256 => uint256) public feePoolOf;
    mapping(address => uint256) public claimCursor;
    mapping(uint256 => address) public rebornToken;

    event Offering(uint256 indexed epoch, address indexed wallet, address indexed token, uint256 amount, uint256 karma, bool verified, uint16 multBps, uint256 fee);
    event Sealed(uint256 indexed epoch, uint256 soulWeight, uint256 totalKarma);
    event Extended(uint256 indexed epoch, uint256 endsAt);
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
        address _feeEscrow,
        uint256 _firstEpochDuration,
        uint256 _soulTarget
    ) EIP712("THANATOS Altar", "2") {
        if (_owner == address(0) || _keeper == address(0) || _verifier == address(0) || _protocolSplitter == address(0) || _feeEscrow == address(0)) revert ZeroAddress();
        owner = _owner;
        keeper = _keeper;
        verifier = _verifier;
        protocolSplitter = _protocolSplitter;
        feeEscrow = IFeeEscrow(_feeEscrow);

        altarFee = 0.0005 ether;
        verifiedKarma = 38 * KARMA_SCALE;
        unverifiedKarma = 5 * KARMA_SCALE;
        unverifiedCap = 25 * KARMA_SCALE;
        maxClockBonusPerWallet = 30 minutes;
        minEpochDuration = 6 hours;
        epochDuration = 24 hours;
        minTreasury = 0.01 ether;
        targetGrowthBps = 12_500;
        protocolBps = 2000;
        feeShareBps = 3000;
        seedBps = 4000;
        buybackBps = 3000;

        epoch = 1;
        epochStartedAt = block.timestamp;
        epochEndsAt = block.timestamp + _firstEpochDuration;
        soulTarget = _soulTarget;
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
            karma = ((verifiedKarma + _amountBonus(token, burned)) * multBps) / BPS;
        } else {
            uint256 used = unverifiedKarmaOf[epoch][msg.sender];
            karma = used >= unverifiedCap ? 0 : Math.min(unverifiedKarma, unverifiedCap - used);
            unverifiedKarmaOf[epoch][msg.sender] = used + karma;
        }

        karmaOf[epoch][msg.sender] += karma;
        totalKarmaOf[epoch] += karma;
        soulWeight += karma;

        if (verified && soulWeight < soulTarget) {
            uint256 bonus = (karma * CLOCK_BONUS_PER_KARMA) / KARMA_SCALE;
            uint256 usedBonus = clockBonusOf[epoch][msg.sender];
            uint256 roomBonus = usedBonus >= maxClockBonusPerWallet ? 0 : maxClockBonusPerWallet - usedBonus;
            bonus = Math.min(bonus, roomBonus);
            clockBonusOf[epoch][msg.sender] = usedBonus + bonus;
            epochEndsAt += bonus;
        }

        emit TreasuryIn(msg.sender, msg.value);
        emit Offering(epoch, msg.sender, token, burned, karma, verified, multBps, msg.value);

        if (soulWeight >= soulTarget) _onTarget();
    }

    /// @dev log10(human amount + 1) scaled. Decimals read best-effort.
    function _amountBonus(address token, uint256 burned) internal view returns (uint256) {
        uint8 dec = 18;
        (bool ok, bytes memory ret) = token.staticcall(abi.encodeWithSignature("decimals()"));
        if (ok && ret.length >= 32) dec = abi.decode(ret, (uint8));
        return Math.log10(burned / (10 ** dec) + 1) * KARMA_SCALE;
    }

    // ------------------------------------------------------------ epoch lifecycle

    /// @dev A full bar never seals before minEpochDuration; it only pulls the clock down to it.
    function _onTarget() internal {
        uint256 minEnd = epochStartedAt + minEpochDuration;
        if (block.timestamp < minEnd) {
            if (epochEndsAt > minEnd) epochEndsAt = minEnd;
        } else if (treasury() >= minTreasury) {
            _seal();
        }
    }

    /// @notice Seals the epoch once the clock has run out. A treasury below minTreasury
    ///         extends the epoch instead, so altar fees keep accumulating toward the minimum.
    function seal() external {
        if (phase != Phase.Burning || block.timestamp < epochEndsAt) revert NotSealable();
        if (treasury() < minTreasury) {
            epochEndsAt = block.timestamp + minEpochDuration;
            emit Extended(epoch, epochEndsAt);
            return;
        }
        _seal();
    }

    function _seal() internal {
        phase = Phase.Evaluating;
        emit Sealed(epoch, soulWeight, totalKarmaOf[epoch]);
    }

    function rebirth(uint256 buybackMinOut) external onlyKeeper nonReentrant {
        if (phase != Phase.Evaluating) revert WrongPhase();
        if (address(reincarnator) == address(0) || address(buyback) == address(0)) revert ExecutorsUnset();

        uint256 pot = treasury();
        uint256 protocolCut = (pot * protocolBps) / BPS;
        uint256 rest = pot - protocolCut;
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

        buybackReserve += buybackAmt;
        uint256 bought = _runBuyback(buybackMinOut);

        reserved += feePoolOf[e];
        emit Reborn(e, newToken, feePoolOf[e], seedAmt, bought, protocolCut);

        epoch = e + 1;
        soulWeight = 0;
        soulTarget = (soulTarget * targetGrowthBps) / BPS;
        epochStartedAt = block.timestamp;
        epochEndsAt = block.timestamp + epochDuration;
        phase = Phase.Burning;
    }

    /// @notice Retries the buyback with the accumulated reserve, e.g. once a route exists.
    function runBuyback(uint256 minTokensOut) external onlyKeeper nonReentrant {
        _runBuyback(minTokensOut);
    }

    /// @dev A failed buyback keeps its ETH in buybackReserve; it is never merged into fee share.
    function _runBuyback(uint256 minTokensOut) internal returns (uint256 spent) {
        uint256 amt = buybackReserve;
        if (amt == 0) return 0;
        buybackReserve = 0;
        try buyback.execute{value: amt}(minTokensOut) {
            return amt;
        } catch {
            buybackReserve = amt;
            return 0;
        }
    }

    /// @notice Pulls creator revenue credited to this contract by Pons. Anyone may call.
    function collect() external {
        if (feeEscrow.balanceOf(address(this)) == 0) return;
        feeEscrow.claim();
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

    /// @notice ETH available for the next rebirth split.
    function treasury() public view returns (uint256) {
        return address(this).balance - reserved - buybackReserve;
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
        uint256 _verifiedKarma,
        uint256 _unverifiedKarma,
        uint256 _unverifiedCap,
        uint256 _maxClockBonusPerWallet,
        uint256 _minEpochDuration,
        uint256 _epochDuration,
        uint256 _minTreasury,
        uint256 _targetGrowthBps
    ) external onlyOwner notFrozen {
        require(_unverifiedCap < _verifiedKarma && _minEpochDuration <= _epochDuration, "params");
        altarFee = _altarFee;
        verifiedKarma = _verifiedKarma;
        unverifiedKarma = _unverifiedKarma;
        unverifiedCap = _unverifiedCap;
        maxClockBonusPerWallet = _maxClockBonusPerWallet;
        minEpochDuration = _minEpochDuration;
        epochDuration = _epochDuration;
        minTreasury = _minTreasury;
        targetGrowthBps = _targetGrowthBps;
        emit ConfigSet("altarFee", _altarFee);
        emit ConfigSet("verifiedKarma", _verifiedKarma);
        emit ConfigSet("unverifiedKarma", _unverifiedKarma);
        emit ConfigSet("unverifiedCap", _unverifiedCap);
        emit ConfigSet("maxClockBonusPerWallet", _maxClockBonusPerWallet);
        emit ConfigSet("minEpochDuration", _minEpochDuration);
        emit ConfigSet("epochDuration", _epochDuration);
        emit ConfigSet("minTreasury", _minTreasury);
        emit ConfigSet("targetGrowthBps", _targetGrowthBps);
    }

    function setSplit(uint16 _protocolBps, uint16 _feeShareBps, uint16 _seedBps, uint16 _buybackBps) external onlyOwner notFrozen {
        require(_protocolBps <= 3000 && uint256(_feeShareBps) + _seedBps + _buybackBps == BPS, "split");
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
}
