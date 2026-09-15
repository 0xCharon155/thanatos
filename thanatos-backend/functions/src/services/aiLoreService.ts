import OpenAI from "openai";
import { sanitize } from "../utils/math";

export type RebirthMeta = { name: string; symbol: string; description: string; tweetAnnouncement: string };

const client = () =>
  new OpenAI({ baseURL: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1", apiKey: process.env.LLM_API_KEY });

export async function generateRebirthMetadata(topDeadTokens: string[], epoch: number): Promise<RebirthMeta> {
  const res = await client().chat.completions.create({
    model: process.env.LLM_MODEL ?? "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: `You are THANATOS (@ThanatosAltar), the autonomous on-chain necromancer of Robinhood Chain.
Your role: incinerate dead/dust tokens and synthesize new tokens from their ashes.
Tone: Grim, authoritative, cyber-occult, and crypto-native. Output valid JSON only with keys: name, symbol, description, tweetAnnouncement.
symbol: 3-8 uppercase letters/digits. name: max 24 chars. tweetAnnouncement: under 240 chars.`,
      },
      { role: "user", content: `Synthesize Reincarnation Epoch #${epoch}. Dead tokens consumed: ${topDeadTokens.join(", ") || "unknown dust"}.` },
    ],
    response_format: { type: "json_object" },
  });
  const raw = JSON.parse(res.choices[0].message.content ?? "{}");
  return {
    name: sanitize(raw.name ?? `Thanatos Phoenix ${epoch}`, 24) || `Thanatos Phoenix ${epoch}`,
    symbol: sanitize(String(raw.symbol ?? `PHOENIX${epoch}`).toUpperCase().replace(/[^A-Z0-9]/g, ""), 8) || `PHNX${epoch}`,
    description: String(raw.description ?? "").slice(0, 500),
    tweetAnnouncement: String(raw.tweetAnnouncement ?? "").slice(0, 240),
  };
}

if (require.main === module) {
  require("dotenv").config();
  generateRebirthMetadata(["DEADFROG", "RUGPULL", "SAFEMOON2"], 1).then((m) => {
    console.assert(/^[A-Z0-9]{1,8}$/.test(m.symbol), "symbol shape");
    console.log(m);
  });
}
