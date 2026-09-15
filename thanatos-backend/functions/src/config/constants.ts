import { defineChain, type Address } from "viem";

export const CHAIN = defineChain({
  id: Number(process.env.ROBINHOOD_CHAIN_ID ?? 4663),
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.ROBINHOOD_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com"] } },
});

export const ALTAR_ADDRESS = (process.env.ALTAR_ADDRESS ?? "0x0000000000000000000000000000000000000000") as Address;
export const FEE_SPLITTER_ADDRESS = (process.env.FEE_SPLITTER_ADDRESS ?? "0x0000000000000000000000000000000000000000") as Address;
export const PONS_FACTORY_ADDRESS = (process.env.PONS_FACTORY_ADDRESS ?? "0x3711ceA4feaDE896C913C68F01Eda97Cb06D1A42") as Address;
export const EXPLORER_URL = process.env.BLOCK_EXPLORER_URL ?? "https://robinhoodchain.blockscout.com";

export const FIRST_EPOCH_DURATION_SEC = 6 * 3600;
export const EPOCH_DURATION_SEC = 24 * 3600;
export const INITIAL_TARGET = 1000;
export const TARGET_GROWTH = 1.25;
export const SEED_BUY_ETH = "0.05";
export const CLOCK_BONUS_MIN_PER_SW = 1;
export const TWEET_MIN_SW = 10;

export const altarAbi = [
  {
    type: "event",
    name: "TokenSacrificed",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "tokenAddress", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "executeRebirthSeed",
    stateMutability: "nonpayable",
    inputs: [
      { name: "factoryAddress", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ name: "", type: "bytes" }],
  },
] as const;

export const feeSplitterAbi = [
  {
    type: "function",
    name: "setKarma",
    stateMutability: "nonpayable",
    inputs: [
      { name: "users", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    outputs: [],
  },
  { type: "function", name: "dividendPool", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
] as const;

// ponytail: Pons ABI unverified; confirm signature against factory 0x3711...1A42 before mainnet
export const ponsFactoryAbi = [
  {
    type: "function",
    name: "launchAndBuy",
    stateMutability: "payable",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "metadataURI", type: "string" },
      { name: "feeRecipient", type: "address" },
    ],
    outputs: [{ name: "token", type: "address" }],
  },
] as const;
