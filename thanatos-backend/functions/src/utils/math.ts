export function soulWeight(rawAmount: bigint, decimals: number, isDead: boolean): number {
  const human = Number(rawAmount) / 10 ** decimals;
  const w = Math.log10(human + 1) * (isDead ? 1.5 : 1.0);
  return Math.max(1.0, Number.isFinite(w) ? w : 1.0);
}

export function tier(rank: number): string {
  return rank <= 3 ? "Arch-Necromancer" : rank <= 10 ? "Soul Reaper" : "Acolyte";
}

export function sanitize(s: string, max = 32): string {
  return s.replace(/[^\w\s\-.]/g, "").trim().slice(0, max);
}

if (require.main === module) {
  console.assert(soulWeight(10n ** 25n, 18, true) > 10, "large burn weight");
  console.assert(soulWeight(1n, 18, false) === 1.0, "dust floor");
  console.assert(tier(1) === "Arch-Necromancer" && tier(50) === "Acolyte", "tiers");
  console.assert(sanitize("$PHO<script>ENIX!") === "PHOscriptENIX", "sanitize");
  console.log("math ok");
}
