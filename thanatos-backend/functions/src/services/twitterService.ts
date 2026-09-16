import { TwitterApi } from "twitter-api-v2";
import { db } from "../config/firebase";

export const twitterClient = () => {
  const { TWITTER_CONSUMER_KEY: k, TWITTER_CONSUMER_SECRET: s, TWITTER_ACCESS_TOKEN: t, TWITTER_ACCESS_SECRET: ts } = process.env;
  if (!k || !s || !t || !ts) return null;
  return new TwitterApi({ appKey: k, appSecret: s, accessToken: t, accessSecret: ts });
};

const DRY = process.env.TWITTER_DRY_RUN === "1";
let lastTweetAt = 0;
const MIN_GAP_MS = 60_000;

async function log(kind: string, text: string, extra: Record<string, unknown> = {}) {
  await db.collection("tweets").add({ kind, text, at: Date.now(), ...extra }).catch(() => {});
}

export async function tweet(text: string): Promise<string | null> {
  if (Date.now() - lastTweetAt < MIN_GAP_MS) {
    console.log("[tweet:rate-limited]", text.slice(0, 60));
    return null;
  }
  lastTweetAt = Date.now();
  const c = twitterClient();
  if (!c || DRY) {
    console.log("[tweet:dry-run]", text);
    await log("post", text, { dry: true });
    return null;
  }
  try {
    const r = await c.v2.tweet(text.slice(0, 280));
    await log("post", text, { id: r.data.id });
    return r.data.id;
  } catch (e) {
    console.error("tweet failed", (e as Error).message);
    return null;
  }
}

export async function reply(text: string, toTweetId: string, toUser: string): Promise<string | null> {
  const c = twitterClient();
  if (!c || DRY) {
    console.log("[reply:dry-run]", toUser, text);
    await log("reply", text, { to: toTweetId, toUser, dry: true });
    return null;
  }
  try {
    const r = await c.v2.reply(text.slice(0, 280), toTweetId);
    await log("reply", text, { to: toTweetId, toUser, id: r.data.id });
    return r.data.id;
  } catch (e) {
    console.error("reply failed", (e as Error).message);
    return null;
  }
}

if (require.main === module) {
  require("dotenv").config();
  tweet(`THANATOS awakens. The Altar is open. Epoch #1 begins. ${Date.now()}`).then(() => console.log("sent"));
}
