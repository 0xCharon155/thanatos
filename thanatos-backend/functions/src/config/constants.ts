import { defineChain, type Address } from "viem";

export const CHAIN = defineChain({
  id: Number(process.env.ROBINHOOD_CHAIN_ID ?? 4663),
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.ROBINHOOD_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com"] } },
});

export const INDEXER_RPC_URL = process.env.INDEXER_RPC_URL;
export const PUBLIC_RPC_URL = process.env.ROBINHOOD_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com";

const ZERO = "0x0000000000000000000000000000000000000000" as Address;
export const ALTAR_ADDRESS = (process.env.ALTAR_ADDRESS ?? ZERO) as Address;
export const REINCARNATOR_ADDRESS = (process.env.REINCARNATOR_ADDRESS ?? ZERO) as Address;
export const ALTAR_DEPLOY_BLOCK = BigInt(process.env.ALTAR_DEPLOY_BLOCK ?? "0");
export const PONS_FACTORY_ADDRESS = (process.env.PONS_FACTORY_ADDRESS ?? "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e") as Address;
export const PONS_PAIR_TOKEN = (process.env.PONS_PAIR_TOKEN ?? ZERO) as Address;
export const LAUNCH_CONFIG_ID = BigInt(process.env.LAUNCH_CONFIG_ID ?? "0");
export const EXPLORER_URL = process.env.BLOCK_EXPLORER_URL ?? "https://robinhoodchain.blockscout.com";
export const SITE_URL = process.env.SITE_URL ?? "https://thanatosaltar.xyz";
export const isDeployed = () => ALTAR_ADDRESS !== ZERO;

export const AIRDROP_TOP_N = 50;
export const TWEET_MIN_KARMA = 10;
export const VOUCHER_TTL_SEC = 3600;
export const DEAD_MULT_BPS = 15000;
export const ALIVE_MULT_BPS = 10000;

export const altarAbi = [
  { type: "function", name: "altarFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "epoch", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "epochEndsAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "soulWeight", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "soulTarget", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "phase", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "treasury", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalDistributed", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "claimable", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "karmaOf", stateMutability: "view", inputs: [{ type: "uint256" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalKarmaOf", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "seal", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "rebirth", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    type: "event",
    name: "Offering",
    inputs: [
      { name: "epoch", type: "uint256", indexed: true },
      { name: "wallet", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "karma", type: "uint256", indexed: false },
      { name: "verified", type: "bool", indexed: false },
      { name: "multBps", type: "uint16", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Sealed",
    inputs: [
      { name: "epoch", type: "uint256", indexed: true },
      { name: "soulWeight", type: "uint256", indexed: false },
      { name: "totalKarma", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Reborn",
    inputs: [
      { name: "epoch", type: "uint256", indexed: true },
      { name: "newToken", type: "address", indexed: false },
      { name: "feeShare", type: "uint256", indexed: false },
      { name: "seeded", type: "uint256", indexed: false },
      { name: "buyback", type: "uint256", indexed: false },
      { name: "protocol", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "wallet", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "fromEpoch", type: "uint256", indexed: false },
      { name: "toEpoch", type: "uint256", indexed: false },
    ],
  },
] as const;

export const reincarnatorAbi = [
  {
    type: "function",
    name: "stage",
    stateMutability: "nonpayable",
    inputs: [
      { name: "epoch", type: "uint256" },
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "logo", type: "string" },
      { name: "description", type: "string" },
      { name: "twitter", type: "string" },
      { name: "website", type: "string" },
    ],
    outputs: [],
  },
  { type: "function", name: "setMerkleRoot", stateMutability: "nonpayable", inputs: [{ type: "uint256" }, { type: "bytes32" }], outputs: [] },
  { type: "function", name: "tokenOf", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "airdropSupplyOf", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "merkleRootOf", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "bytes32" }] },
  {
    type: "function",
    name: "staged",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [
      { type: "string" }, { type: "string" }, { type: "string" }, { type: "string" }, { type: "string" }, { type: "string" }, { type: "bool" },
    ],
  },
] as const;

export const ponsFactoryAbi = [
  { type: "function", name: "launchFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "previewLaunchEconomics", stateMutability: "view", inputs: [{ type: "uint256" }, { type: "address" }], outputs: [{ type: "bytes32" }] },
] as const;
