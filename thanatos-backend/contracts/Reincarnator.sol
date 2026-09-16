// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAltar, IReincarnator} from "./interfaces/IExecutors.sol";

struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }
struct TokenParams {
    string name;
    string symbol;
    string logo;
    string description;
    Socials socials;
    address creatorFeeRecipient;
    uint16 creatorTaxBps;
    bool buybackEnabled;
    bytes32 expectedEconomics;
    bytes32 salt;
}

interface IPonsForwarder {
    function launchAndBuy(
        TokenParams calldata params,
        uint256 launchConfigId,
        address pairToken,
        uint256 quoteIn,
        uint256 minTokensOut,
        address recipient,
        address[] calldata snipeTaxExemptions
    ) external payable returns (address token, address curve, uint256 tokensOut);
}

interface IPonsFactory {
    function previewLaunchEconomics(uint256 launchConfigId, address pairToken) external view returns (bytes32);
    function launchFee() external view returns (uint256);
}

/// @title Reincarnator
/// @notice Launches the epoch's rebirth token on Pons v2 with a fixed, immutable target and
///         holds the seed-bought tokens for a pro-rata airdrop by epoch karma. Metadata for the
///         next launch is staged by the keeper *before* the Altar calls `seed`, so the Altar's
///         rebirth() stays a pure treasury split with no calldata from the agent.
contract Reincarnator is IReincarnator {
    using SafeERC20 for IERC20;

    address public immutable altar;
    IPonsForwarder public immutable forwarder;
    IPonsFactory public immutable factory;
    address public immutable pairToken;
    uint256 public immutable launchConfigId;
    uint16 public immutable creatorTaxBps;

    struct Staged { string name; string symbol; string logo; string description; string twitter; string website; bool set; }
    mapping(uint256 => Staged) public staged;
    mapping(uint256 => address) public tokenOf;
    mapping(uint256 => uint256) public airdropSupplyOf;
    mapping(uint256 => mapping(address => bool)) public claimed;

    event Staged_(uint256 indexed epoch, string name, string symbol);
    event Launched(uint256 indexed epoch, address token, address curve, uint256 tokensOut, uint256 quoteIn);
    event AirdropClaimed(uint256 indexed epoch, address indexed wallet, uint256 amount);

    error NotAltar();
    error NotKeeper();
    error NotStaged();
    error AlreadyClaimed();
    error NothingToClaim();

    modifier onlyKeeper() { if (msg.sender != IAltar(altar).keeper()) revert NotKeeper(); _; }

    constructor(address _altar, address _forwarder, address _factory, address _pairToken, uint256 _launchConfigId, uint16 _creatorTaxBps) {
        altar = _altar;
        forwarder = IPonsForwarder(_forwarder);
        factory = IPonsFactory(_factory);
        pairToken = _pairToken;
        launchConfigId = _launchConfigId;
        creatorTaxBps = _creatorTaxBps;
    }

    function stage(uint256 epoch, string calldata name, string calldata symbol, string calldata logo, string calldata description, string calldata twitter, string calldata website) external onlyKeeper {
        staged[epoch] = Staged(name, symbol, logo, description, twitter, website, true);
        emit Staged_(epoch, name, symbol);
    }

    /// @dev Called by the Altar with the seed ETH. Reverting here makes the Altar keep the ETH
    ///      in the epoch fee pool, so a bad stage never strands treasury.
    function seed(uint256 epoch) external payable returns (address newToken) {
        if (msg.sender != altar) revert NotAltar();
        Staged memory s = staged[epoch];
        if (!s.set) revert NotStaged();

        uint256 fee = factory.launchFee();
        require(msg.value > fee, "seed<fee");

        TokenParams memory p = TokenParams({
            name: s.name,
            symbol: s.symbol,
            logo: s.logo,
            description: s.description,
            socials: Socials(s.twitter, "", "", s.website, ""),
            creatorFeeRecipient: altar,
            creatorTaxBps: creatorTaxBps,
            buybackEnabled: false,
            expectedEconomics: factory.previewLaunchEconomics(launchConfigId, pairToken),
            salt: keccak256(abi.encodePacked("thanatos-epoch-", epoch))
        });

        uint256 quoteIn = msg.value - fee;
        (address token, address curve, uint256 out) =
            forwarder.launchAndBuy{value: msg.value}(p, launchConfigId, pairToken, quoteIn, 0, address(this), new address[](0));
        tokenOf[epoch] = token;
        airdropSupplyOf[epoch] = out;
        emit Launched(epoch, token, curve, out, quoteIn);

        // A clamped opening buy is refunded here by the forwarder; hand it back to the treasury.
        if (address(this).balance > 0) {
            (bool ok, ) = altar.call{value: address(this).balance}("");
            ok;
        }
        return token;
    }

    /// @notice Share of the epoch's seed buy owed to `wallet`, by epoch karma.
    function airdropOf(uint256 epoch, address wallet) public view returns (uint256) {
        uint256 total = IAltar(altar).totalKarmaOf(epoch);
        return total == 0 ? 0 : (airdropSupplyOf[epoch] * IAltar(altar).karmaOf(epoch, wallet)) / total;
    }

    function claimAirdrop(uint256 epoch) external {
        if (claimed[epoch][msg.sender]) revert AlreadyClaimed();
        uint256 amount = airdropOf(epoch, msg.sender);
        if (amount == 0) revert NothingToClaim();
        claimed[epoch][msg.sender] = true;
        IERC20(tokenOf[epoch]).safeTransfer(msg.sender, amount);
        emit AirdropClaimed(epoch, msg.sender, amount);
    }

    receive() external payable {}
}
