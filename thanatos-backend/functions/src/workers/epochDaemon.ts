import { parseGwei, type Hex } from "viem";
import { ALTAR_ADDRESS, altarAbi, BUYBACK_ADDRESS, buybackAbi, curveAbi, DEAD, escrowAbi, EXPLORER_URL, isDeployed, LAUNCH_CONFIG_ID, PONS_FACTORY_ADDRESS, PONS_FEE_ESCROW, PONS_PAIR_TOKEN, ponsFactoryAbi, REINCARNATOR_ADDRESS, reincarnatorAbi, SITE_URL, ZERO } from "../config/constants";
import { agentWallet, readClient } from "../config/clients";
import { altarRef, db } from "../config/firebase";
import { generateRebirthMetadata } from "../services/aiLoreService";
import { tweet } from "../services/twitterService";

const gas = { maxFeePerGas: parseGwei("0.5") } as const;
const WARN_HOURS = [12, 6, 1];
const NO_BUY = 2n ** 255n; // a floor no curve can meet: the Altar keeps the ETH in buybackReserve
const altar = { address: ALTAR_ADDRESS, abi: altarAbi } as const;

type Status = "DORMANT" | "BURNING" | "EXTENDED" | "SEALED" | "STAGING" | "REBORN";
const setStatus = (status: Status, extra: Record<string, unknown> = {}) => altarRef().set({ status, status_at: Date.now(), ...extra }, { merge: true });

async function mined(hash: Hex, what: string) {
  const rc = await readClient.waitForTransactionReceipt({ hash });
  if (rc.status !== "success") throw new Error(`${what} reverted ${hash}`);
  return hash;
}

/**
 * One tick, idempotent. The contract is the state machine; this only nudges it:
 *   any phase  -> collect() creator fees from the Pons escrow, retry a pending buyback
 *   Burning    -> (clock out) seal()               the contract seals, or extends if the treasury is thin
 *   Evaluating -> stage metadata (LLM) -> rebirth()
 */
export async function evaluateEpoch(): Promise<Status> {
  if (!isDeployed()) {
    await setStatus("DORMANT");
    return "DORMANT";
  }
  await collect();
  await retryBuyback();

  const [phase, epoch, endsAt] = await Promise.all([
    readClient.readContract({ ...altar, functionName: "phase" }),
    readClient.readContract({ ...altar, functionName: "epoch" }),
    readClient.readContract({ ...altar, functionName: "epochEndsAt" }),
  ]);
  const e = Number(epoch);

  if (phase === 0) {
    await warn(Number(endsAt), e);
    if (BigInt(Math.floor(Date.now() / 1000)) < endsAt) {
      await setStatus("BURNING");
      return "BURNING";
    }
    const h = await mined(await agentWallet().writeContract({ ...altar, functionName: "seal", ...gas }), "seal");
    const sealed = (await readClient.readContract({ ...altar, functionName: "phase" })) === 1;
    await setStatus(sealed ? "SEALED" : "EXTENDED", { seal_tx: h });
    return sealed ? "SEALED" : "EXTENDED";
  }

  const staged = await readClient.readContract({ address: REINCARNATOR_ADDRESS, abi: reincarnatorAbi, functionName: "staged", args: [epoch] });
  if (!staged[6]) {
    await setStatus("STAGING");
    const econ = await readClient.readContract({ address: PONS_FACTORY_ADDRESS, abi: ponsFactoryAbi, functionName: "previewLaunchEconomics", args: [LAUNCH_CONFIG_ID, PONS_PAIR_TOKEN] });
    console.log(`[rebirth] launch economics pair=${PONS_PAIR_TOKEN} config=${LAUNCH_CONFIG_ID} econ=${econ}`);
    const burns = await db.collection("sacrifices").where("epoch", "==", e).get();
    const bySymbol = new Map<string, number>();
    burns.forEach((d) => bySymbol.set(d.data().token_symbol, (bySymbol.get(d.data().token_symbol) ?? 0) + d.data().karma));
    const top3 = [...bySymbol.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);
    const used = (await db.collection("reincarnations").get()).docs.map((d) => d.data().token_symbol).filter(Boolean);
    const meta = await generateRebirthMetadata(top3, e, used);
    const description = `Reborn by THANATOS from the ashes of ${top3.join(", ") || "the forgotten"}. Burn dead tokens at ${SITE_URL} to earn the next one. ${meta.description}`.slice(0, 2048);
    const h = await mined(
      await agentWallet().writeContract({
        address: REINCARNATOR_ADDRESS,
        abi: reincarnatorAbi,
        functionName: "stage",
        args: [epoch, meta.name, meta.symbol, `${SITE_URL}/logo.png`, description, "https://x.com/ThanatosAltar", SITE_URL],
        ...gas,
      }),
      "stage",
    );
    await db.doc(`reincarnations/${e}`).set({ epoch: e, token_name: meta.name, token_symbol: meta.symbol, description, consumed: top3, tweet: meta.tweetAnnouncement, staged_tx: h }, { merge: true });
  }

  const treasury = await readClient.readContract({ ...altar, functionName: "treasury" });
  const minOut = await buybackMinOut((treasury * 8000n * 3000n) / (10000n * 10000n));
  const h = await mined(await agentWallet().writeContract({ ...altar, functionName: "rebirth", args: [minOut], ...gas }), "rebirth");
  await setStatus("REBORN", { rebirth_tx: h });
  const token = await readClient.readContract({ address: REINCARNATOR_ADDRESS, abi: reincarnatorAbi, functionName: "tokenOf", args: [epoch] });
  const meta = (await db.doc(`reincarnations/${e}`).get()).data();
  if (token !== ZERO) {
    await tweet(`${meta?.tweet ?? `Epoch #${e} is reborn.`}\n\n$${meta?.token_symbol} https://www.ponsfamily.com/launchpad/${token}\n${EXPLORER_URL}/tx/${h}`);
  }
  return "REBORN";
}

/** Creator revenue sits in the Pons escrow until the recipient claims it. */
async function collect() {
  const due = await readClient.readContract({ address: PONS_FEE_ESCROW, abi: escrowAbi, functionName: "balanceOf", args: [ALTAR_ADDRESS] });
  if (due === 0n) return;
  await mined(await agentWallet().writeContract({ ...altar, functionName: "collect", ...gas }), "collect");
}

async function retryBuyback() {
  const reserve = await readClient.readContract({ ...altar, functionName: "buybackReserve" });
  if (reserve === 0n) return;
  const minOut = await buybackMinOut(reserve);
  if (minOut === NO_BUY) return;
  await mined(await agentWallet().writeContract({ ...altar, functionName: "runBuyback", args: [minOut], ...gas }), "runBuyback");
}

/** 97% of the route's quoted output. Without a route or a quote the buy is not attempted. */
async function buybackMinOut(amount: bigint): Promise<bigint> {
  if (amount === 0n) return NO_BUY;
  const route = await readClient.readContract({ address: BUYBACK_ADDRESS, abi: buybackAbi, functionName: "route" });
  if (route === ZERO) return NO_BUY;
  try {
    const { result } = await readClient.simulateContract({ address: route, abi: curveAbi, functionName: "buy", args: [amount, 0n, DEAD], value: amount, account: BUYBACK_ADDRESS });
    return (result * 97n) / 100n;
  } catch (err) {
    console.warn("[buyback] quote failed, keeping reserve:", (err as Error).message.split("\n")[0]);
    return NO_BUY;
  }
}

async function warn(endsAt: number, e: number) {
  const s = (await altarRef().get()).data() ?? {};
  const warnedMap: Record<string, number[]> = s.warned && !Array.isArray(s.warned) ? s.warned : {};
  const remainingH = (endsAt - Date.now() / 1000) / 3600;
  for (const h of WARN_HOURS) {
    if (remainingH <= h && remainingH > 0 && !(warnedMap[e] ?? []).includes(h)) {
      await tweet(`${h}h remain before the Altar seals Epoch #${e}. ${SITE_URL}`);
      await altarRef().set({ warned: { [e]: [...(warnedMap[e] ?? []), h] } }, { merge: true });
    }
  }
}
