// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title FounderSplitter
/// @notice Pull-based 50/50 ETH splitter between two founder wallets. Never reverts on receive,
///         so a broken payee can never block Altar rebirths (M-15).
contract FounderSplitter {
    address public immutable a;
    address public immutable b;
    uint256 public totalReceived;
    mapping(address => uint256) public released;

    event PaymentReceived(address from, uint256 amount);
    event PaymentReleased(address to, uint256 amount);

    constructor(address _a, address _b) {
        require(_a != address(0) && _b != address(0) && _a != _b, "payees");
        a = _a;
        b = _b;
    }

    receive() external payable {
        totalReceived += msg.value;
        emit PaymentReceived(msg.sender, msg.value);
    }

    function releasable(address who) public view returns (uint256) {
        if (who != a && who != b) return 0;
        return totalReceived / 2 - released[who];
    }

    function release(address payable who) external {
        uint256 amt = releasable(who);
        require(amt > 0, "nothing");
        released[who] += amt;
        (bool ok, ) = who.call{value: amt}("");
        require(ok, "send failed");
        emit PaymentReleased(who, amt);
    }
}
