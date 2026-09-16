// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IReincarnator {
    function seed(uint256 epoch) external payable returns (address newToken);
}

interface IBuyback {
    function execute() external payable;
}
