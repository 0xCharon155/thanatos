// ponytail: DexScreener free API, no key; returns false (alive) on any error so weight is never inflated by outages
export async function isDeadToken(chainSlug: string, token: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token}`);
    if (!r.ok) return false;
    const j = (await r.json()) as { pairs?: { chainId: string; volume?: { h24?: number }; liquidity?: { usd?: number } }[] };
    const pairs = (j.pairs ?? []).filter((p) => p.chainId === chainSlug);
    if (pairs.length === 0) return true;
    const vol = pairs.reduce((a, p) => a + (p.volume?.h24 ?? 0), 0);
    const liq = pairs.reduce((a, p) => a + (p.liquidity?.usd ?? 0), 0);
    return vol === 0 || liq < 100;
  } catch {
    return false;
  }
}
