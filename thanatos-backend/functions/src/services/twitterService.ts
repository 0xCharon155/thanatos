import { TwitterApi } from "twitter-api-v2";

const client = () => {
  const { TWITTER_CONSUMER_KEY: k, TWITTER_CONSUMER_SECRET: s, TWITTER_ACCESS_TOKEN: t, TWITTER_ACCESS_SECRET: ts } = process.env;
  if (!k || !s || !t || !ts) return null;
  return new TwitterApi({ appKey: k, appSecret: s, accessToken: t, accessSecret: ts });
};

export async function tweet(text: string): Promise<void> {
  const c = client();
  if (!c) {
    console.log("[tweet:dry-run]", text);
    return;
  }
  try {
    await c.v2.tweet(text.slice(0, 280));
  } catch (e) {
    console.error("tweet failed", e);
  }
}

if (require.main === module) {
  require("dotenv").config();
  tweet(`THANATOS awakens. The Altar is open. Epoch #1 begins. ${Date.now()}`).then(() => console.log("sent"));
}
