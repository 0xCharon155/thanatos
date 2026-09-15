import { defineChain, type Address } from "viem";

export const CHAIN = defineChain({
  id: Number(process.env.ROBINHOOD_CHAIN_ID ?? 4663),
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.ROBINHOOD_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com"] } },
});

export const ALTAR_ADDRESS = (process.env.ALTAR_ADDRESS ?? "0x0000000000000000000000000000000000000000") as Address;
export const FEE_SPLITTER_ADDRESS = (process.env.FEE_SPLITTER_ADDRESS ?? "0x0000000000000000000000000000000000000000") as Address;
export const PONS_FACTORY_ADDRESS = (process.env.PONS_FACTORY_ADDRESS ?? "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e") as Address;
export const EXPLORER_URL = process.env.BLOCK_EXPLORER_URL ?? "https://robinhoodchain.blockscout.com";

export const FIRST_EPOCH_DURATION_SEC = 6 * 3600;
export const EPOCH_DURATION_SEC = 24 * 3600;
export const INITIAL_TARGET = 1000;
export const TARGET_GROWTH = 1.25;
export const SEED_BUY_ETH = process.env.SEED_BUY_ETH ?? "0.005";
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
    name: "forwardRebirthToken",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
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

export const PAIR_TOKEN = (process.env.PONS_PAIR_TOKEN ?? "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC") as Address;
export const LAUNCH_CONFIG_ID = 0n;
export const CREATOR_TAX_BPS = 95;
export const SITE_URL = process.env.SITE_URL ?? "https://thanatos-e440a.web.app";

export const ponsFactoryAbi = [
  {
    type: "function",
    name: "launchToken",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "logo", type: "string" },
          { name: "description", type: "string" },
          {
            name: "socials",
            type: "tuple",
            components: [
              { name: "twitter", type: "string" },
              { name: "telegram", type: "string" },
              { name: "discord", type: "string" },
              { name: "website", type: "string" },
              { name: "farcaster", type: "string" },
            ],
          },
          { name: "creatorFeeRecipient", type: "address" },
          { name: "creatorTaxBps", type: "uint16" },
          { name: "buybackEnabled", type: "bool" },
          { name: "expectedEconomics", type: "bytes32" },
          { name: "salt", type: "bytes32" },
        ],
      },
      { name: "launchConfigId", type: "uint256" },
      { name: "pairToken", type: "address" },
      { name: "snipeTaxExemptions", type: "address[]" },
    ],
    outputs: [{ name: "token", type: "address" }],
  },
  {
    type: "function",
    name: "previewLaunchEconomics",
    stateMutability: "view",
    inputs: [
      { name: "launchConfigId", type: "uint256" },
      { name: "pairToken", type: "address" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  { type: "function", name: "launchFee", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  {
    type: "event",
    name: "TokenLaunched",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "curve", type: "address", indexed: true },
      { name: "deployer", type: "address", indexed: true },
      { name: "pairToken", type: "address", indexed: false },
      { name: "launchConfigId", type: "uint256", indexed: false },
      { name: "graduationThreshold", type: "uint256", indexed: false },
    ],
  },
] as const;