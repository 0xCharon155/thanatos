export function tier(rank: number): string {
  return rank <= 3 ? "Arch-Necromancer" : rank <= 10 ? "Soul Reaper" : "Acolyte";
}

export function sanitize(s: string, max = 32): string {
  return s.replace(/[^\w\s\-.]/g, "").trim().slice(0, max);
}

if (require.main === module) {
  console.assert(tier(1) === "Arch-Necromancer" && tier(50) === "Acolyte", "tiers");
  console.assert(sanitize("$PHO<script>ENIX!") === "PHOscriptENIX", "sanitize");
  console.log("math ok");
}
