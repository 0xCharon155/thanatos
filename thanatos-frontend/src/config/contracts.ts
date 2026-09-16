import { erc20Abi, type Address } from "viem";

export { erc20Abi };

const ZERO = "0x0000000000000000000000000000000000000000" as Address;
export const ALTAR_ADDRESS = (process.env.NEXT_PUBLIC_ALTAR_ADDRESS || ZERO) as Address;
export const REINCARNATOR_ADDRESS = (process.env.NEXT_PUBLIC_REINCARNATOR_ADDRESS || ZERO) as Address;
export const PONS_FEE_ESCROW = (process.env.NEXT_PUBLIC_PONS_FEE_ESCROW || "0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e") as Address;
export const THANATOS_TOKEN = process.env.NEXT_PUBLIC_THANATOS_TOKEN as Address | undefined;
export const VOUCHER_URL = process.env.NEXT_PUBLIC_VOUCHER_URL ?? "";
export const IS_DEPLOYED = ALTAR_ADDRESS !== ZERO;

export const altarAbi = [
  { type: "function", name: "altarFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "epoch", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "epochEndsAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "soulWeight", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "soulTarget", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "phase", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "treasury", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "buybackReserve", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalDistributed", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "soulOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "claimable", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "sacrifice",
    stateMutability: "payable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "multBps", type: "uint16" },
      { name: "expiry", type: "uint64" },
      { name: "sig", type: "bytes" },
    ],
    outputs: [],
  },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "seal", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

export const reincarnatorAbi = [
  { type: "function", name: "tokenOf", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "airdropOf", stateMutability: "view", inputs: [{ type: "uint256" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "claimed", stateMutability: "view", inputs: [{ type: "uint256" }, { type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "claimAirdrop", stateMutability: "nonpayable", inputs: [{ name: "epoch", type: "uint256" }], outputs: [] },
] as const;

export const escrowAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const;
