import { createPublicClient, erc20Abi, http, parseAbiItem } from "viem";
import { ALTAR_ADDRESS, altarAbi, CHAIN, CLOCK_BONUS_MIN_PER_SW, TWEET_MIN_SW } from "../config/constants";
import { altarRef, db, FieldValue } from "../config/firebase";
import { isDeadToken } from "../services/dexMetrics";
import { tweet } from "../services/twitterService";
import { soulWeight } from "../utils/math";

const client = createPublicClient({ chain: CHAIN, transport: http(undefined, { fetchOptions: { headers: { "User-Agent": "Mozilla/5.0 ThanatosIndexer/1.0" } } }) });
const cursorRef = () => db.doc("altar_state/indexer_cursor");

export async function indexOnce(): Promise<number> {
  if (ALTAR_ADDRESS === "0x0000000000000000000000000000000000000000") return 0;
  const latest = await client.getBlockNumber();
  const cursor = (await cursorRef().get()).data()?.last_block as number | undefined;
  const from = cursor ? BigInt(cursor) + 1n : latest - 1000n;
  if (from > latest) return 0;
  const to = from + 2000n > latest ? latest : from + 2000n;

  const logs = await client.getLogs({
    address: ALTAR_ADDRESS,
    event: parseAbiItem("event TokenSacrificed(address indexed user, address indexed tokenAddress, uint256 amount, uint256 timestamp)"),
    fromBlock: from,
    toBlock: to,
  });

  const state = (await altarRef().get()).data() ?? {};
  const epoch = state.reincarnation_epoch ?? 1;

  for (const log of logs) {
    const id = `${log.transactionHash}-${log.logIndex}`;
    const ref = db.doc(`sacrifices/${id}`);
    if ((await ref.get()).exists) continue;

    const token = log.args.tokenAddress!;
    const user = log.args.user!.toLowerCase();
    const amount = log.args.amount!;
    const [decimals, symbol] = await Promise.all([
      client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
      client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }).catch(() => "???"),
    ]);
    const dead = await isDeadToken("robinhood", token);
    const sw = soulWeight(amount, decimals, dead);
    const clockBonusMin = Math.round(sw * CLOCK_BONUS_MIN_PER_SW);
    const ts = Number(log.args.timestamp!) * 1000;

    const batch = db.batch();
    batch.set(ref, {
      user_address: user,
      token_address: token.toLowerCase(),
      token_symbol: symbol,
      token_decimals: decimals,
      raw_amount: amount.toString(),
      soul_weight_awarded: sw,
      clock_bonus_min: clockBonusMin,
      epoch,
      tx_hash: log.transactionHash,
      timestamp: ts,
    });
    batch.set(
      db.doc(`leaderboard/${user}`),
      {
        total_karma: FieldValue.increment(sw),
        epoch_karma: FieldValue.increment(sw),
        burn_count: FieldValue.increment(1),
        last_burn_timestamp: ts,
      },
      { merge: true },
    );
    batch.set(
      altarRef(),
      {
        soul_weight_current: FieldValue.increment(sw),
        total_sacrifices: FieldValue.increment(1),
        death_clock_ends_at: FieldValue.increment(clockBonusMin * 60),
        last_updated: Date.now(),
      },
      { merge: true },
    );
    await batch.commit();

    if (sw > TWEET_MIN_SW) {
      await tweet(`A soul is claimed. ${user.slice(0, 6)}...${user.slice(-4)} cast ${symbol} into the Altar. +${sw.toFixed(1)} soul weight. The clock bends.`);
    }
  }

  await cursorRef().set({ last_block: Number(to), updated_at: Date.now() });
  return logs.length;
}
