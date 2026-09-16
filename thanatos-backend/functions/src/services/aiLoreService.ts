import OpenAI from "openai";
import { sanitize } from "../utils/math";

export type RebirthMeta = { name: string; symbol: string; description: string; tweetAnnouncement: string };

const client = () => new OpenAI({ baseURL: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1", apiKey: process.env.LLM_API_KEY });

async function ask(topDeadTokens: string[], epoch: number, used: string[], attempt: number): Promise<Partial<RebirthMeta>> {
  const res = await client().chat.completions.create({
    model: process.env.LLM_MODEL ?? "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: `You are THANATOS (@ThanatosAltar), the autonomous on-chain necromancer of Robinhood Chain.
You incinerate dead tokens and forge a new memecoin from their ashes. Fuse the burned tickers into one punchy new ticker (e.g. DEADFROG + RUGPULL -> DEADPULL or FROGRUG).
Tone: grim, cyber-occult, crypto-native, funny. Output valid JSON only with keys: name, symbol, description, tweetAnnouncement.
symbol: 3-8 uppercase letters/digits, must NOT be any of: ${used.join(", ") || "none"}. name: max 24 chars, not "Epoch N". tweetAnnouncement: under 220 chars.${attempt > 0 ? " Previous answer was rejected; be more creative and distinct." : ""}`,
      },
      { role: "user", content: `Synthesize Reincarnation Epoch #${epoch}. Dead tokens consumed: ${topDeadTokens.join(", ") || "unknown dust"}.` },
    ],
    response_format: { type: "json_object" },
  });
  return JSON.parse(res.choices[0].message.content ?? "{}");
}

export async function generateRebirthMetadata(topDeadTokens: string[], epoch: number, usedSymbols: string[] = []): Promise<RebirthMeta> {
  const used = new Set(usedSymbols.map((s) => s.toUpperCase()));
  let raw: Partial<RebirthMeta> = {};
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      raw = await ask(topDeadTokens, epoch, [...used], attempt);
    } catch (e) {
      console.error("lore attempt failed", (e as Error).message);
      continue;
    }
    const sym = sanitize(String(raw.symbol ?? "").toUpperCase().replace(/[^A-Z0-9]/g, ""), 8);
    const name = sanitize(raw.name ?? "", 24);
    if (sym.length >= 3 && name.length >= 3 && !used.has(sym) && !/^EPOCH\d*$/.test(sym)) {
      return { name, symbol: sym, description: String(raw.description ?? "").slice(0, 1500), tweetAnnouncement: String(raw.tweetAnnouncement ?? "").slice(0, 220) };
    }
  }
  let i = epoch;
  let sym = `PHNX${i}`;
  while (used.has(sym)) sym = `PHNX${++i}`;
  return { name: `Thanatos Phoenix ${i}`, symbol: sym, description: String(raw.description ?? "Forged from the ashes by THANATOS.").slice(0, 1500), tweetAnnouncement: `Epoch #${epoch} is reborn as $${sym}.` };
}

if (require.main === module) {
  require("dotenv").config();
  generateRebirthMetadata(["DEADFROG", "RUGPULL", "SAFEMOON2"], 1, ["EPOCH1"]).then((m) => {
    console.assert(/^[A-Z0-9]{3,8}$/.test(m.symbol) && m.symbol !== "EPOCH1", "symbol shape/uniqueness");
    console.log(m);
  });
}
