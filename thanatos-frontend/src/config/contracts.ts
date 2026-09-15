import { erc20Abi, type Address } from "viem";

export { erc20Abi };

export const ALTAR_ADDRESS = (process.env.NEXT_PUBLIC_ALTAR_ADDRESS ?? "0x0000000000000000000000000000000000000000") as Address;
export const FEE_SPLITTER_ADDRESS = (process.env.NEXT_PUBLIC_FEE_SPLITTER_ADDRESS ?? "0x0000000000000000000000000000000000000000") as Address;

export const altarAbi = [
  {
    type: "function",
    name: "sacrificeToken",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const feeSplitterAbi = [
  { type: "function", name: "claimDividends", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    type: "function",
    name: "claimable",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalDistributed",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
