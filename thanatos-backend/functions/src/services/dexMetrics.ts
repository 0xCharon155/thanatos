import { type Address } from "viem";

export type TokenHealth = { hadLiquidity: boolean; peakLiquidityUsd: number; nowLiquidityUsd: number; vol24: number; pairs: number };

/**
 * Deadness check for the voucher. "Dead" = it once had a real market and is now < 5% of
 * peak liquidity (or zero volume). A never-traded token is NOT dead -> no bonus (bots minting junk).
 * Sources: DexScreener and GeckoTerminal. Pons curve state can be added once curve indexing exists.
 */
export async function tokenHealth(token: Address): Promise<TokenHealth> {
  const out: TokenHealth = { hadLiquidity: false, peakLiquidityUsd: 0, nowLiquidityUsd: 0, vol24: 0, pairs: 0 };
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token}`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (r.ok) {
      const j = (await r.json()) as { pairs?: { chainId: string; volume?: { h24?: number }; liquidity?: { usd?: number }; fdv?: number; marketCap?: number }[] };
      const pairs = (j.pairs ?? []).filter((p) => /robinhood/i.test(p.chainId));
      out.pairs = pairs.length;
      out.nowLiquidityUsd = pairs.reduce((a, p) => a + (p.liquidity?.usd ?? 0), 0);
      out.vol24 = pairs.reduce((a, p) => a + (p.volume?.h24 ?? 0), 0);
      out.peakLiquidityUsd = Math.max(out.nowLiquidityUsd, ...pairs.map((p) => p.marketCap ?? p.fdv ?? 0));
    }
  } catch {}
  try {
    const g = await fetch(`https://api.geckoterminal.com/api/v2/networks/robinhood/tokens/${token}/pools`, { headers: { Accept: "application/json" } });
    if (g.ok) {
      const j = (await g.json()) as { data?: { attributes?: { reserve_in_usd?: string; volume_usd?: { h24?: string } } }[] };
      const pools = j.data ?? [];
      out.pairs = Math.max(out.pairs, pools.length);
      const liq = pools.reduce((a, p) => a + Number(p.attributes?.reserve_in_usd ?? 0), 0);
      out.nowLiquidityUsd = Math.max(out.nowLiquidityUsd, liq);
      out.vol24 = Math.max(out.vol24, pools.reduce((a, p) => a + Number(p.attributes?.volume_usd?.h24 ?? 0), 0));
    }
  } catch {}
  out.hadLiquidity = out.pairs > 0 && out.peakLiquidityUsd >= 500;
  return out;
}

export function classify(h: TokenHealth): "dead" | "alive" | "unknown" {
  if (!h.hadLiquidity) return "unknown";
  if (h.vol24 === 0 || h.nowLiquidityUsd < h.peakLiquidityUsd * 0.05 || h.nowLiquidityUsd < 100) return "dead";
  return "alive";
}
