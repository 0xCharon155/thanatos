import { createPublicClient, createWalletClient, encodeFunctionData, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ALTAR_ADDRESS, altarAbi, CHAIN, EXPLORER_URL, FEE_SPLITTER_ADDRESS, PONS_FACTORY_ADDRESS, ponsFactoryAbi, SEED_BUY_ETH } from "../config/constants";
import { altarRef, db } from "../config/firebase";
import { generateRebirthMetadata } from "../services/aiLoreService";
import { tweet } from "../services/twitterService";

const account = () => privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: CHAIN, transport: http() });
const walletClient = () => createWalletClient({ account: account(), chain: CHAIN, transport: http() });

export async function runReincarnation(epoch: number) {
  const burns = await db.collection("sacrifices").where("epoch", "==", epoch).get();
  const bySymbol = new Map<string, number>();
  burns.forEach((d) => {
    const x = d.data();
    bySymbol.set(x.token_symbol, (bySymbol.get(x.token_symbol) ?? 0) + x.soul_weight_awarded);
  });
  const top3 = [...bySymbol.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);

  const meta = await generateRebirthMetadata(top3, epoch);
  const metadataURI = `data:application/json,${encodeURIComponent(JSON.stringify({ name: meta.name, symbol: meta.symbol, description: meta.description }))}`;

  const data = encodeFunctionData({
    abi: ponsFactoryAbi,
    functionName: "launchAndBuy",
    args: [meta.name, meta.symbol, metadataURI, FEE_SPLITTER_ADDRESS],
  });

  const value = parseEther(SEED_BUY_ETH);
  const altarBal = await publicClient.getBalance({ address: ALTAR_ADDRESS });
  const spend = altarBal < value ? altarBal : value;

  const hash = await walletClient().writeContract({
    address: ALTAR_ADDRESS,
    abi: altarAbi,
    functionName: "executeRebirthSeed",
    args: [PONS_FACTORY_ADDRESS, spend, data],
    maxFeePerGas: parseEther("0.00000005"),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  // ponytail: token address taken from first created-contract-like log; replace with Pons event decode once ABI confirmed
  const tokenAddress = receipt.logs.find((l) => l.address.toLowerCase() !== ALTAR_ADDRESS.toLowerCase())?.address ?? "";

  await db.doc(`reincarnations/${epoch}`).set({
    epoch,
    token_name: meta.name,
    token_symbol: meta.symbol,
    token_address: tokenAddress,
    factory_tx_hash: hash,
    seed_eth_spent: (Number(spend) / 1e18).toString(),
    consumed: top3,
    description: meta.description,
    airdrop_recipients_count: 0,
    created_at: Date.now(),
  });

  await tweet(`${meta.tweetAnnouncement}\n\n$${meta.symbol} ${EXPLORER_URL}/token/${tokenAddress}`);
  return { meta, tokenAddress, hash };
}
