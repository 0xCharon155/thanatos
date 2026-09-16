import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { formatEther, parseGwei, type Address } from "viem";
import { AIRDROP_TOP_N, ALTAR_ADDRESS, altarAbi, EXPLORER_URL, isDeployed, LAUNCH_CONFIG_ID, PONS_FACTORY_ADDRESS, PONS_PAIR_TOKEN, ponsFactoryAbi, REINCARNATOR_ADDRESS, reincarnatorAbi, SITE_URL } from "../config/constants";
import { agentWallet, readClient } from "../config/clients";
import { altarRef, db } from "../config/firebase";
import { generateRebirthMetadata } from "../services/aiLoreService";
import { tweet } from "../services/twitterService";

const gas = { maxFeePerGas: parseGwei("0.5") } as const;
const WARN_HOURS = [12, 6, 1];

type Status = "DORMANT" | "BURNING" | "WAITING_FOR_TREASURY" | "STAGING" | "SEALED" | "REBORN" | "ERROR";
const setStatus = (status: Status, extra: Record<string, unknown> = {}) => altarRef().set({ status, status_at: Date.now(), ...extra }, { merge: true });

/**
 * One tick, idempotent. Contract is the state machine; this only nudges it:
 *   Burning  -> (time up) seal()                       [anyone]
 *   Evaluating -> stage metadata (LLM) -> rebirth()    [keeper]
 *   after Reborn -> build merkle root for top-N        [keeper]
 */
export async function evaluateEpoch(): Promise<Status> {
  if (!isDeployed()) {
    await setStatus("DORMANT");
    return "DORMANT";
  }
  const c = { address: ALTAR_ADDRESS, abi: altarAbi } as const;
  const [phase, epoch, endsAt, treasury] = await Promise.all([
    readClient.readContract({ ...c, functionName: "phase" }),
    readClient.readContract({ ...c, functionName: "epoch" }),
    readClient.readContract({ ...c, functionName: "epochEndsAt" }),
    readClient.readContract({ ...c, functionName: "treasury" }),
  ]);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const e = Number(epoch);

  await finalizeAirdropIfNeeded(e - 1);

  if (phase === 0) {
    await warn(Number(endsAt), e);
    if (now < endsAt) {
      await setStatus("BURNING");
      return "BURNING";
    }
    const h = await agentWallet().writeContract({ ...c, functionName: "seal", ...gas });
    await readClient.waitForTransactionReceipt({ hash: h });
    await setStatus("SEALED", { seal_tx: h });
    return "SEALED";
  }

  if (phase === 1) {
    const launchFee = await readClient.readContract({ address: PONS_FACTORY_ADDRESS, abi: ponsFactoryAbi, functionName: "launchFee" });
    const seedShare = (treasury * 8000n * 4000n) / (10000n * 10000n);
    if (seedShare <= launchFee) {
      await setStatus("WAITING_FOR_TREASURY", { treasury_eth: formatEther(treasury), needed_eth: formatEther((launchFee * 10000n * 10000n) / (8000n * 4000n) + 1n) });
      return "WAITING_FOR_TREASURY";
    }
    const econ = await readClient.readContract({ address: PONS_FACTORY_ADDRESS, abi: ponsFactoryAbi, functionName: "previewLaunchEconomics", args: [LAUNCH_CONFIG_ID, PONS_PAIR_TOKEN] });
    console.log(`[relayer] launch economics pair=${PONS_PAIR_TOKEN} config=${LAUNCH_CONFIG_ID} econ=${econ}`);

    const staged = await readClient.readContract({ address: REINCARNATOR_ADDRESS, abi: reincarnatorAbi, functionName: "staged", args: [epoch] });
    if (!staged[6]) {
      await setStatus("STAGING");
      const burns = await db.collection("sacrifices").where("epoch", "==", e).get();
      const bySymbol = new Map<string, number>();
      burns.forEach((d) => bySymbol.set(d.data().token_symbol, (bySymbol.get(d.data().token_symbol) ?? 0) + d.data().karma));
      const top3 = [...bySymbol.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);
      const used = (await db.collection("reincarnations").get()).docs.map((d) => d.data().token_symbol).filter(Boolean);
      const meta = await generateRebirthMetadata(top3, e, used);
      const description = `Reborn by THANATOS from the ashes of ${top3.join(", ") || "the forgotten"}. Burn dead tokens at ${SITE_URL} to earn the next one. ${meta.description}`.slice(0, 2048);
      const h = await agentWallet().writeContract({
        address: REINCARNATOR_ADDRESS,
        abi: reincarnatorAbi,
        functionName: "stage",
        args: [epoch, meta.name, meta.symbol, `${SITE_URL}/logo.png`, description, "https://x.com/ThanatosAltar", SITE_URL],
        ...gas,
      });
      await readClient.waitForTransactionReceipt({ hash: h });
      await db.doc(`reincarnations/${e}`).set({ epoch: e, token_name: meta.name, token_symbol: meta.symbol, description, consumed: top3, tweet: meta.tweetAnnouncement, staged_tx: h }, { merge: true });
    }

    const h = await agentWallet().writeContract({ ...c, functionName: "rebirth", ...gas });
    const rc = await readClient.waitForTransactionReceipt({ hash: h });
    if (rc.status !== "success") {
      await setStatus("ERROR", { error: `rebirth reverted ${h}` });
      throw new Error(`rebirth reverted ${h}`);
    }
    await setStatus("REBORN", { rebirth_tx: h });
    const token = await readClient.readContract({ address: REINCARNATOR_ADDRESS, abi: reincarnatorAbi, functionName: "tokenOf", args: [epoch] });
    const meta = (await db.doc(`reincarnations/${e}`).get()).data();
    if (token !== "0x0000000000000000000000000000000000000000") {
      await tweet(`${meta?.tweet ?? `Epoch #${e} is reborn.`}\n\n$${meta?.token_symbol} https://www.ponsfamily.com/token/${token}\n${EXPLORER_URL}/tx/${h}`);
    }
    return "REBORN";
  }

  return "BURNING";
}

/** Top-N by on-chain epoch karma -> merkle root on the Reincarnator (M-12). Idempotent. */
async function finalizeAirdropIfNeeded(e: number) {
  if (e < 1) return;
  const r = { address: REINCARNATOR_ADDRESS, abi: reincarnatorAbi } as const;
  const [token, root, supply] = await Promise.all([
    readClient.readContract({ ...r, functionName: "tokenOf", args: [BigInt(e)] }),
    readClient.readContract({ ...r, functionName: "merkleRootOf", args: [BigInt(e)] }),
    readClient.readContract({ ...r, functionName: "airdropSupplyOf", args: [BigInt(e)] }),
  ]);
  if (token === "0x0000000000000000000000000000000000000000" || root !== `0x${"0".repeat(64)}` || supply === 0n) return;

  const snap = await db.collection("leaderboard").orderBy(`epoch_karma.${e}`, "desc").limit(AIRDROP_TOP_N).get();
  const wallets = snap.docs.map((d) => d.id as Address);
  if (wallets.length === 0) return;
  const karmas = await Promise.all(wallets.map((w) => readClient.readContract({ address: ALTAR_ADDRESS, abi: altarAbi, functionName: "karmaOf", args: [BigInt(e), w] })));
  const total = karmas.reduce((a, b) => a + b, 0n);
  if (total === 0n) return;
  const leaves = wallets.map((w, i) => [w, ((supply * karmas[i]) / total).toString()]).filter(([, amt]) => amt !== "0");
  const tree = StandardMerkleTree.of(leaves, ["address", "uint256"]);
  const h = await agentWallet().writeContract({ ...r, functionName: "setMerkleRoot", args: [BigInt(e), tree.root as `0x${string}`], ...gas });
  await readClient.waitForTransactionReceipt({ hash: h });
  const batch = db.batch();
  for (const [w, amt] of leaves) batch.set(db.doc(`airdrops/${e}_${w.toLowerCase()}`), { epoch: e, wallet: w.toLowerCase(), amount: amt, proof: tree.getProof([w, amt]), token: token.toLowerCase() });
  batch.set(db.doc(`reincarnations/${e}`), { airdrop_recipients_count: leaves.length, merkle_root: tree.root, root_tx: h }, { merge: true });
  await batch.commit();
}

async function warn(endsAt: number, e: number) {
  const s = (await altarRef().get()).data() ?? {};
  const remainingH = (endsAt - Date.now() / 1000) / 3600;
  for (const h of WARN_HOURS) {
    if (remainingH <= h && remainingH > 0 && !(s.warned?.[e] ?? []).includes(h)) {
      await tweet(`${h}h remain before the Altar seals Epoch #${e}. ${SITE_URL}`);
      await altarRef().set({ warned: { [e]: [...(s.warned?.[e] ?? []), h] } }, { merge: true });
    }
  }
}
