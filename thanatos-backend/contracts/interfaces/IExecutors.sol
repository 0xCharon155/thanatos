// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IReincarnator {
    function seed(uint256 epoch) external payable returns (address newToken);
}

interface IBuyback {
    function execute(uint256 minTokensOut) external payable;
}

/// @dev Pons v2 fee escrow: creator revenue is credited here and paid only to a caller of claim().
interface IFeeEscrow {
    function balanceOf(address recipient) external view returns (uint256);
    function claim() external returns (uint256);
}

interface IAltar {
    function keeper() external view returns (address);
    function karmaOf(uint256 epoch, address wallet) external view returns (uint256);
    function totalKarmaOf(uint256 epoch) external view returns (uint256);
}
