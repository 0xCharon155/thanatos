// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {TokenParams} from "../Reincarnator.sol";

contract MockERC20 is ERC20 {
    uint8 private immutable _dec;
    constructor(string memory n, string memory s, uint8 d) ERC20(n, s) { _dec = d; }
    function decimals() public view override returns (uint8) { return _dec; }
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}

/// transferFrom returns true but moves nothing
contract FakeERC20 {
    function decimals() external pure returns (uint8) { return 18; }
    function balanceOf(address) external pure returns (uint256) { return 0; }
    function transferFrom(address, address, uint256) external pure returns (bool) { return true; }
    function approve(address, uint256) external pure returns (bool) { return true; }
}

/// burns 10% on every transfer
contract FeeOnTransferERC20 is ERC20 {
    constructor() ERC20("FoT", "FOT") {}
    function mint(address to, uint256 amt) external { _mint(to, amt); }
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = value / 10;
            super._update(from, address(0), fee);
            value -= fee;
        }
        super._update(from, to, value);
    }
}

contract MockPonsFactory {
    uint256 public launchFee = 0.0005 ether;
    function previewLaunchEconomics(uint256, address) external pure returns (bytes32) { return keccak256("econ"); }
}

contract MockPonsForwarder {
    MockERC20 public lastToken;
    bytes32 public lastEcon;
    address public lastPair;
    address public lastFeeRecipient;
    uint16 public lastTax;
    function launchAndBuy(TokenParams calldata p, uint256, address pairToken, uint256 quoteIn, uint256, address recipient, address[] calldata)
        external payable returns (address token, address curve, uint256 tokensOut)
    {
        lastEcon = p.expectedEconomics;
        lastPair = pairToken;
        lastFeeRecipient = p.creatorFeeRecipient;
        lastTax = p.creatorTaxBps;
        lastToken = new MockERC20(p.name, p.symbol, 18);
        tokensOut = quoteIn * 1_000_000;
        lastToken.mint(recipient, tokensOut);
        return (address(lastToken), address(this), tokensOut);
    }
}

contract MockCurve {
    MockERC20 public token;
    constructor(address t) { token = MockERC20(t); }
    function buy(uint256, address recipient) external payable returns (uint256 out) {
        out = msg.value * 1000;
        token.mint(recipient, out);
    }
}

contract RevertingReceiver {
    receive() external payable { revert("no"); }
}
