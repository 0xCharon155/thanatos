import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { indexOnce, refreshAltarState } from "./workers/indexer";
import { evaluateEpoch } from "./workers/epochDaemon";
import { issueVoucher } from "./services/voucher";

const secrets = ["AGENT_PRIVATE_KEY", "VERIFIER_PRIVATE_KEY", "LLM_API_KEY", "TWITTER_CONSUMER_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_SECRET"];
const region = "us-central1";

export const eventIndexer = onSchedule({ schedule: "every 1 minutes", region, secrets, timeoutSeconds: 300 }, async () => {
  console.log(`indexed ${await indexOnce()} events`);
});

export const epochEvaluationDaemon = onSchedule({ schedule: "every 1 minutes", region, secrets, timeoutSeconds: 540 }, async () => {
  console.log("epoch:", await evaluateEpoch());
});

/** Public: EIP-712 deadness voucher for a token. Rate-limit at the edge (Cloud Armor / hosting rewrite). */
export const voucher = onRequest({ region, secrets: ["VERIFIER_PRIVATE_KEY"], cors: true }, async (req, res) => {
  const token = String(req.query.token ?? "");
  const out = await issueVoucher(token);
  res.set("Cache-Control", "public, max-age=300");
  res.json(out);
});

/** Ops only: IAM-protected (invoker = ops SA). No shared secret in query strings (M-13). */
export const indexNow = onRequest({ region, secrets, invoker: "private" }, async (_req, res) => {
  res.json({ indexed: await indexOnce() });
});

export const refreshState = onRequest({ region, invoker: "private" }, async (_req, res) => {
  await refreshAltarState();
  res.json({ ok: true });
});
