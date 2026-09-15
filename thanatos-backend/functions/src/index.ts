import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { indexOnce } from "./workers/indexer";
import { evaluateEpoch } from "./workers/epochDaemon";
import { altarRef } from "./config/firebase";
import { EPOCH_DURATION_SEC, FIRST_EPOCH_DURATION_SEC, INITIAL_TARGET } from "./config/constants";

const secrets = ["AGENT_PRIVATE_KEY", "LLM_API_KEY", "TWITTER_CONSUMER_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_SECRET"];

export const eventIndexer = onSchedule({ schedule: "every 1 minutes", region: "us-central1", secrets, timeoutSeconds: 300 }, async () => {
  const n = await indexOnce();
  console.log(`indexed ${n} sacrifices`);
});

export const epochEvaluationDaemon = onSchedule({ schedule: "every 1 minutes", region: "us-central1", secrets, timeoutSeconds: 540 }, async () => {
  console.log("epoch:", await evaluateEpoch());
});

export const indexNow = onRequest({ region: "us-central1", secrets }, async (_req, res) => {
  res.json({ indexed: await indexOnce() });
});

export const seedState = onRequest({ region: "us-central1" }, async (req, res) => {
  if (req.query.key !== process.env.SEED_KEY) {
    res.status(403).send("forbidden");
    return;
  }
  await altarRef().set(
    {
      soul_weight_current: 0,
      soul_weight_target: INITIAL_TARGET,
      death_clock_ends_at: Math.floor(Date.now() / 1000) + FIRST_EPOCH_DURATION_SEC,
      epoch_duration_sec: EPOCH_DURATION_SEC,
      reincarnation_epoch: 1,
      is_locked: false,
      total_sacrifices: 0,
      accumulated_rebirth_eth: "0",
      accumulated_dividend_eth: "0",
      warned: [],
      last_updated: Date.now(),
    },
    { merge: true },
  );
  res.json({ ok: true });
});
