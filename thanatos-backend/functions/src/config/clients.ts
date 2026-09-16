import { createPublicClient, createWalletClient, fallback, http, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAIN, INDEXER_RPC_URL, PUBLIC_RPC_URL } from "./constants";

const ua = { fetchOptions: { headers: { "User-Agent": "Mozilla/5.0 ThanatosWorker/2.0" } }, retryCount: 3 };

export const readClient: PublicClient = createPublicClient({ chain: CHAIN, transport: http(PUBLIC_RPC_URL, ua) });

/** Paid RPC for eth_getLogs (H-10); falls back to public for anything it can serve. */
export const logClient: PublicClient = createPublicClient({
  chain: CHAIN,
  transport: INDEXER_RPC_URL ? fallback([http(INDEXER_RPC_URL, ua), http(PUBLIC_RPC_URL, ua)]) : http(PUBLIC_RPC_URL, ua),
});

export const agentAccount = () => privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
export const verifierAccount = () => privateKeyToAccount(process.env.VERIFIER_PRIVATE_KEY as `0x${string}`);
export const agentWallet = () => createWalletClient({ account: agentAccount(), chain: CHAIN, transport: http(PUBLIC_RPC_URL, ua) });
