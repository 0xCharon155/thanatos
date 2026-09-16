// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IBuyback} from "./interfaces/IExecutors.sol";

interface IPonsCurve {
    function buy(uint256 minTokensOut, address recipient) external payable returns (uint256 tokensOut);
}

/// @title Buyback
/// @notice Swaps ETH for $THANATOS on its Pons curve/pool and sends it to 0x…dEaD. Targets are
///         immutable. If the swap cannot be executed the call reverts and the Altar keeps the
///         ETH in the epoch fee pool. `route` is set once by the deployer after $THANATOS
///         launches, then frozen.
contract Buyback is IBuyback {
    using SafeERC20 for IERC20;

    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    address public immutable altar;
    address public owner;
    address public thanatosToken;
    address public route;
    bool public frozen;

    event RouteSet(address token, address route);
    event Burned(uint256 ethIn, uint256 tokensBurned);
    event Frozen();

    error NotAltar();
    error NotOwner();
    error IsFrozen();
    error NoRoute();

    constructor(address _altar, address _owner) {
        altar = _altar;
        owner = _owner;
    }

    function setRoute(address _token, address _route) external {
        if (msg.sender != owner) revert NotOwner();
        if (frozen) revert IsFrozen();
        thanatosToken = _token;
        route = _route;
        emit RouteSet(_token, _route);
    }

    function freeze() external {
        if (msg.sender != owner) revert NotOwner();
        frozen = true;
        emit Frozen();
    }

    function execute() external payable {
        if (msg.sender != altar) revert NotAltar();
        if (route == address(0)) revert NoRoute();
        uint256 out = IPonsCurve(route).buy{value: msg.value}(0, DEAD);
        emit Burned(msg.value, out);
    }
}
