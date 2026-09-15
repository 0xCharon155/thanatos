import { createPublicClient, createWalletClient, decodeEventLog, encodeFunctionData, erc20Abi, http, keccak256, parseEther, parseGwei, toHex, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  ALTAR_ADDRESS,
  altarAbi,
  CHAIN,
  CREATOR_TAX_BPS,
  EXPLORER_URL,
  FEE_SPLITTER_ADDRESS,
  LAUNCH_CONFIG_ID,
  PAIR_TOKEN,
  PONS_FACTORY_ADDRESS,
  ponsFactoryAbi,
  SEED_BUY_ETH,
  SITE_URL,
} from "../config/constants";
import { db } from "../config/firebase";
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

  const [expectedEconomics, launchFee] = await Promise.all([
    publicClient.readContract({ address: PONS_FACTORY_ADDRESS, abi: ponsFactoryAbi, functionName: "previewLaunchEconomics", args: [LAUNCH_CONFIG_ID, PAIR_TOKEN] }),
    publicClient.readContract({ address: PONS_FACTORY_ADDRESS, abi: ponsFactoryAbi, functionName: "launchFee" }),
  ]);

  const data = encodeFunctionData({
    abi: ponsFactoryAbi,
    functionName: "launchToken",
    args: [
      {
        name: meta.name,
        symbol: meta.symbol,
        logo: `${SITE_URL}/logo.svg`,
        description: meta.description.slice(0, 2048),
        socials: { twitter: "https://x.com/ThanatosAltar", telegram: "", discord: "", website: SITE_URL, farcaster: "" },
        creatorFeeRecipient: FEE_SPLITTER_ADDRESS,
        creatorTaxBps: CREATOR_TAX_BPS,
        buybackEnabled: false,
        expectedEconomics,
        salt: keccak256(toHex(`thanatos-epoch-${epoch}`)),
      },
      LAUNCH_CONFIG_ID,
      PAIR_TOKEN,
      [ALTAR_ADDRESS],
    ],
  });

  const altarBal = await publicClient.getBalance({ address: ALTAR_ADDRESS });
  const want = parseEther(SEED_BUY_ETH) + launchFee;
  const spend = altarBal < want ? altarBal : want;
  if (spend <= launchFee) throw new Error(`altar balance ${altarBal} below launch fee ${launchFee}`);

  const hash = await walletClient().writeContract({
    address: ALTAR_ADDRESS,
    abi: altarAbi,
    functionName: "executeRebirthSeed",
    args: [PONS_FACTORY_ADDRESS, spend, data],
    maxFeePerGas: parseGwei("0.5"),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`rebirth tx reverted ${hash}`);

  let tokenAddress: Address | "" = "";
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== PONS_FACTORY_ADDRESS.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({ abi: ponsFactoryAbi, data: log.data, topics: log.topics });
      if (ev.eventName === "TokenLaunched") tokenAddress = ev.args.token;
    } catch {}
  }
  if (!tokenAddress) throw new Error("TokenLaunched not found");

  const bought = await publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "balanceOf", args: [ALTAR_ADDRESS] });
  if (bought > 0n) {
    const h = await walletClient().writeContract({ address: ALTAR_ADDRESS, abi: altarAbi, functionName: "forwardRebirthToken", args: [tokenAddress, account().address, bought] });
    await publicClient.waitForTransactionReceipt({ hash: h });
  }

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
