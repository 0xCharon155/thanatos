import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

export const robinhoodChain = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 4663),
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Explorer", url: process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://robinhoodchain.blockscout.com" } },
});

export const wagmiConfig = getDefaultConfig({
  appName: "THANATOS",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo",
  chains: [robinhoodChain],
  ssr: true,
});
