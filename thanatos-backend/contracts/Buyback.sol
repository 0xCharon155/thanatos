// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IBuyback} from "./interfaces/IExecutors.sol";

/// @dev Pons v2 bonding curve. After graduation the token trades in a Uniswap v4 pool; a
///      route for that stage is any contract exposing this same signature.
interface IPonsCurve {
    function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) external payable returns (uint256 tokensOut);
}

/// @title Buyback
/// @notice Swaps ETH for $THANATOS and sends it to 0x…dEaD. Only the Altar can call it, and a
///         route change takes effect 48 hours after it is proposed, so the destination is
///         always visible on-chain before any ETH can follow it.
contract Buyback is IBuyback {
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant ROUTE_DELAY = 48 hours;

    address public immutable altar;
    address public immutable owner;
    address public route;
    address public pendingRoute;
    uint256 public routeEffectiveAt;

    event RouteProposed(address route, uint256 effectiveAt);
    event RouteSet(address route);
    event Burned(uint256 ethIn, uint256 tokensBurned);

    error NotAltar();
    error NotOwner();
    error NoRoute();
    error RouteNotReady();

    constructor(address _altar, address _owner) {
        altar = _altar;
        owner = _owner;
    }

    function proposeRoute(address _route) external {
        if (msg.sender != owner) revert NotOwner();
        pendingRoute = _route;
        routeEffectiveAt = block.timestamp + ROUTE_DELAY;
        emit RouteProposed(_route, routeEffectiveAt);
    }

    function applyRoute() external {
        if (pendingRoute == address(0) || block.timestamp < routeEffectiveAt) revert RouteNotReady();
        route = pendingRoute;
        pendingRoute = address(0);
        emit RouteSet(route);
    }

    function execute(uint256 minTokensOut) external payable {
        if (msg.sender != altar) revert NotAltar();
        if (route == address(0)) revert NoRoute();
        uint256 out = IPonsCurve(route).buy{value: msg.value}(msg.value, minTokensOut, DEAD);
        emit Burned(msg.value, out);
    }
}
