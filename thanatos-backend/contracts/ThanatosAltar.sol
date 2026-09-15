// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract ThanatosAltar {
    address public owner;
    address public agent;

    event TokenSacrificed(address indexed user, address indexed tokenAddress, uint256 amount, uint256 timestamp);
    event RebirthSeeded(address indexed factory, uint256 ethSpent, bytes data);
    event AgentUpdated(address indexed agent);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    modifier onlyAgent() { require(msg.sender == agent, "not agent"); _; }

    constructor(address _agent) {
        owner = msg.sender;
        agent = _agent;
    }

    receive() external payable {}

    function setAgent(address _agent) external onlyOwner {
        agent = _agent;
        emit AgentUpdated(_agent);
    }

    function sacrificeToken(address tokenAddress, uint256 amount) external {
        require(amount > 0, "zero");
        require(IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount), "transfer failed");
        emit TokenSacrificed(msg.sender, tokenAddress, amount, block.timestamp);
    }

    function forwardRebirthToken(address token, address to, uint256 amount) external onlyAgent {
        require(token != address(0) && to != address(0), "zero");
        require(IERC20(token).transfer(to, amount), "transfer failed");
    }

    function executeRebirthSeed(address factoryAddress, uint256 value, bytes calldata data) external onlyAgent returns (bytes memory) {
        require(value <= address(this).balance, "insufficient");
        (bool ok, bytes memory ret) = factoryAddress.call{value: value}(data);
        require(ok, "factory call failed");
        emit RebirthSeeded(factoryAddress, value, data);
        return ret;
    }
}
