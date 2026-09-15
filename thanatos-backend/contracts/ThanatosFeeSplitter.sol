// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ThanatosFeeSplitter {
    address public owner;
    address public devWallet;
    address public altarContract;

    uint256 public totalDistributed;
    uint256 public dividendPool;
    uint256 public totalKarma;
    mapping(address => uint256) public karma;
    mapping(address => uint256) public claimed;

    address public agent;

    event FeesSplit(uint256 dev, uint256 altar, uint256 dividend);
    event DividendClaimed(address indexed user, uint256 amount);
    event KarmaUpdated(address indexed user, uint256 karma);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    modifier onlyAgent() { require(msg.sender == agent, "not agent"); _; }

    constructor(address _devWallet, address _altar, address _agent) {
        owner = msg.sender;
        devWallet = _devWallet;
        altarContract = _altar;
        agent = _agent;
    }

    receive() external payable {
        uint256 dev = (msg.value * 30) / 100;
        uint256 altar = (msg.value * 40) / 100;
        uint256 div = msg.value - dev - altar;
        (bool a, ) = devWallet.call{value: dev}("");
        (bool b, ) = altarContract.call{value: altar}("");
        require(a && b, "split failed");
        dividendPool += div;
        emit FeesSplit(dev, altar, div);
    }

    function setKarma(address[] calldata users, uint256[] calldata amounts) external onlyAgent {
        require(users.length == amounts.length, "len");
        for (uint256 i = 0; i < users.length; i++) {
            totalKarma = totalKarma - karma[users[i]] + amounts[i];
            karma[users[i]] = amounts[i];
            emit KarmaUpdated(users[i], amounts[i]);
        }
    }

    function claimable(address account) public view returns (uint256) {
        if (totalKarma == 0) return 0;
        uint256 entitled = ((dividendPool + totalDistributed) * karma[account]) / totalKarma;
        return entitled > claimed[account] ? entitled - claimed[account] : 0;
    }

    function claimDividends() external {
        uint256 amt = claimable(msg.sender);
        require(amt > 0, "nothing");
        claimed[msg.sender] += amt;
        dividendPool -= amt;
        totalDistributed += amt;
        (bool ok, ) = msg.sender.call{value: amt}("");
        require(ok, "send failed");
        emit DividendClaimed(msg.sender, amt);
    }

    function setAgent(address _agent) external onlyOwner { agent = _agent; }
    function setWallets(address _dev, address _altar) external onlyOwner { devWallet = _dev; altarContract = _altar; }
}
