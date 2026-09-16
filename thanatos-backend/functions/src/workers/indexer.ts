import { erc20Abi, formatEther } from "viem";
import { ALTAR_ADDRESS, ALTAR_DEPLOY_BLOCK, altarAbi, isDeployed, TWEET_MIN_KARMA } from "../config/constants";
import { logClient, readClient } from "../config/clients";
import { altarRef, db, FieldValue } from "../config/firebase";
import { tweet } from "../services/twitterService";
import { tier } from "../utils/math";

const cursorRef = () => db.doc("altar_state/indexer_cursor");
const karmaNum = (k: bigint) => Number(k) / 1e18;

/** Mirrors Offering / Sealed / Extended / Reborn / Claimed events into Firestore. Never computes karma. */
export async function indexOnce(): Promise<number> {
  if (!isDeployed()) return 0;
  const latest = await logClient.getBlockNumber();
  const cursor = (await cursorRef().get()).data()?.last_block as number | undefined;
  const from = cursor !== undefined ? BigInt(cursor) + 1n : ALTAR_DEPLOY_BLOCK;
  if (from > latest) return 0;
  const to = from + 5000n > latest ? latest : from + 5000n;

  let logs;
  try {
    logs = await logClient.getContractEvents({ address: ALTAR_ADDRESS, abi: altarAbi, fromBlock: from, toBlock: to });
  } catch (e) {
    console.error(`[indexer] getLogs ${from}-${to} FAILED (configure INDEXER_RPC_URL)`, (e as Error).message.split("\n")[0]);
    throw e;
  }

  const symbolCache = new Map<string, { symbol: string; decimals: number }>();
  const meta = async (token: `0x${string}`) => {
    const k = token.toLowerCase();
    if (!symbolCache.has(k)) {
      const [symbol, decimals] = await Promise.all([
        readClient.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }).catch(() => "???"),
        readClient.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
      ]);
      symbolCache.set(k, { symbol, decimals });
    }
    return symbolCache.get(k)!;
  };

  for (const log of logs) {
    const id = `${log.transactionHash}-${log.logIndex}`;
    const block = await readClient.getBlock({ blockNumber: log.blockNumber });
    const ts = Number(block.timestamp) * 1000;

    if (log.eventName === "Offering") {
      const a = log.args;
      const ref = db.doc(`sacrifices/${id}`);
      if ((await ref.get()).exists) continue;
      const m = await meta(a.token!);
      const wallet = a.wallet!.toLowerCase();
      const karma = karmaNum(a.karma!);
      const batch = db.batch();
      batch.set(ref, {
        epoch: Number(a.epoch),
        user_address: wallet,
        token_address: a.token!.toLowerCase(),
        token_symbol: m.symbol,
        token_decimals: m.decimals,
        raw_amount: a.amount!.toString(),
        karma,
        verified: a.verified,
        mult_bps: a.multBps,
        fee_wei: a.fee!.toString(),
        tx_hash: log.transactionHash,
        block: Number(log.blockNumber),
        timestamp: ts,
      });
      batch.set(
        db.doc(`leaderboard/${wallet}`),
        { lifetime_karma: FieldValue.increment(karma), [`epoch_karma.${Number(a.epoch)}`]: FieldValue.increment(karma), burn_count: FieldValue.increment(1), last_burn_timestamp: ts },
        { merge: true },
      );
      await batch.commit();
      if (a.verified && karma > TWEET_MIN_KARMA) {
        await tweet(`A soul is claimed. ${wallet.slice(0, 6)}...${wallet.slice(-4)} cast ${m.symbol} into the Altar. +${karma.toFixed(1)} karma. The clock bends.`);
      }
    } else if (log.eventName === "Sealed") {
      await db.doc(`epochs/${Number(log.args.epoch)}`).set(
        { epoch: Number(log.args.epoch), sealed_at: ts, soul_weight: karmaNum(log.args.soulWeight!), total_karma: karmaNum(log.args.totalKarma!), seal_tx: log.transactionHash },
        { merge: true },
      );
    } else if (log.eventName === "Extended") {
      await db.doc(`epochs/${Number(log.args.epoch)}`).set({ epoch: Number(log.args.epoch), extended_at: ts, ends_at: Number(log.args.endsAt) }, { merge: true });
    } else if (log.eventName === "Reborn") {
      const a = log.args;
      await db.doc(`epochs/${Number(a.epoch)}`).set(
        {
          reborn_at: ts,
          new_token: a.newToken!.toLowerCase(),
          fee_share_eth: formatEther(a.feeShare!),
          seeded_eth: formatEther(a.seeded!),
          buyback_eth: formatEther(a.buyback!),
          protocol_eth: formatEther(a.protocol!),
          rebirth_tx: log.transactionHash,
        },
        { merge: true },
      );
      await db.doc(`reincarnations/${Number(a.epoch)}`).set({ epoch: Number(a.epoch), token_address: a.newToken!.toLowerCase(), factory_tx_hash: log.transactionHash, created_at: ts }, { merge: true });
    } else if (log.eventName === "Claimed") {
      await db.doc(`claims/${id}`).set({ wallet: log.args.wallet!.toLowerCase(), amount_eth: formatEther(log.args.amount!), from_epoch: Number(log.args.fromEpoch), to_epoch: Number(log.args.toEpoch), tx_hash: log.transactionHash, timestamp: ts });
    }
  }

  await refreshAltarState();
  await cursorRef().set({ last_block: Number(to), updated_at: Date.now() });
  return logs.length;
}

/** Cache of on-chain views for the UI. Source of truth is the contract. */
export async function refreshAltarState() {
  if (!isDeployed()) return;
  const c = { address: ALTAR_ADDRESS, abi: altarAbi } as const;
  const [epoch, endsAt, sw, target, phase, treasury, buybackReserve, distributed, altarFee] = await Promise.all([
    readClient.readContract({ ...c, functionName: "epoch" }),
    readClient.readContract({ ...c, functionName: "epochEndsAt" }),
    readClient.readContract({ ...c, functionName: "soulWeight" }),
    readClient.readContract({ ...c, functionName: "soulTarget" }),
    readClient.readContract({ ...c, functionName: "phase" }),
    readClient.readContract({ ...c, functionName: "treasury" }),
    readClient.readContract({ ...c, functionName: "buybackReserve" }),
    readClient.readContract({ ...c, functionName: "totalDistributed" }),
    readClient.readContract({ ...c, functionName: "altarFee" }),
  ]);
  await altarRef().set(
    {
      deployed: true,
      altar_address: ALTAR_ADDRESS,
      reincarnation_epoch: Number(epoch),
      death_clock_ends_at: Number(endsAt),
      soul_weight_current: karmaNum(sw),
      soul_weight_target: karmaNum(target),
      phase: Number(phase),
      treasury_eth: formatEther(treasury),
      buyback_reserve_eth: formatEther(buybackReserve),
      total_distributed_eth: formatEther(distributed),
      altar_fee_eth: formatEther(altarFee),
      last_updated: Date.now(),
    },
    { merge: true },
  );
  const top = await db.collection("leaderboard").orderBy("lifetime_karma", "desc").limit(50).get();
  const batch = db.batch();
  top.docs.forEach((d, i) => batch.update(d.ref, { tier: tier(i + 1) }));
  await batch.commit();
}
