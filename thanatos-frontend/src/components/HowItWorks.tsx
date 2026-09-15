import { Coins, Crown, Flame, Gift } from "lucide-react";

const STEPS = [
  {
    Icon: Flame,
    title: "BURN DEAD TOKENS",
    body: "Send worthless or rugged ERC-20s to the Altar. Soul weight scales with log10 of the amount, x1.5 if the token has no DEX volume.",
  },
  {
    Icon: Crown,
    title: "EARN KARMA",
    body: "Every burn adds soul weight to your permanent Karma score. Top 3 become Arch-Necromancers, top 10 Soul Reapers.",
  },
  {
    Icon: Gift,
    title: "INHERIT THE REBIRTH",
    body: "When the clock hits zero or the soul target is reached, a new token launches on Pons. Top 50 by epoch Karma receive the airdrop pro-rata.",
  },
  {
    Icon: Coins,
    title: "CLAIM ETH FOREVER",
    body: "30% of every trading fee on all reborn tokens flows to the dividend vault. Claim your share by Karma weight, anytime, in ETH.",
  },
];

const SPLIT = [
  ["30%", "DIVIDENDS", "ETH to burners and holders, claimable by Karma share", "border-ember text-ember"],
  ["40%", "REBIRTH TREASURY", "Seeds liquidity for the next Phoenix token launch", "border-flame text-flame"],
  ["30%", "PROTOCOL", "Keeps the Altar autonomous and the bots running", "border-purple-400 text-purple-400"],
];

export function HowItWorks() {
  return (
    <section className="px-4 pb-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-ash" />
        <h2 className="text-[10px] tracking-[0.3em] text-bone/40">WHY SACRIFICE · THE REWARD LOOP</h2>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-ash" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ Icon, title, body }, i) => (
          <div key={title} className="panel group relative p-5 transition-colors hover:border-ember/50">
            <span className="absolute right-4 top-3 text-4xl font-bold text-bone/5 group-hover:text-ember/10">0{i + 1}</span>
            <Icon className="mb-3 h-5 w-5 text-ember drop-shadow-[0_0_8px_#dc2626]" />
            <h3 className="mb-2 text-xs tracking-[0.2em] text-bone">{title}</h3>
            <p className="text-xs leading-relaxed text-bone/50">{body}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {SPLIT.map(([pct, name, desc, cls]) => (
          <div key={name} className={`panel flex items-center gap-4 border-l-2 p-4 ${cls}`}>
            <span className="text-3xl font-bold tabular-nums">{pct}</span>
            <div>
              <div className="text-[10px] tracking-[0.2em]">{name}</div>
              <div className="text-xs text-bone/50">{desc}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-[10px] tracking-[0.15em] text-bone/30">
        NO STAKING LOCKUPS · NO TEAM ALLOCATION · KARMA IS PERMANENT ACROSS EPOCHS · SOUL TARGET GROWS 1.25x EACH REBIRTH
      </p>
    </section>
  );
}
