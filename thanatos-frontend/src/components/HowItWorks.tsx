import { Coins, Crown, Flame, Gift, Wallet } from "lucide-react";

const STEPS = [
  {
    Icon: Wallet,
    title: "HOLD $THANATOS",
    body: "2.7% of every $THANATOS trade is paid to holders pro-rata via Pons Holder Fee Sharing. Claim from your Pons profile any time. No team cut.",
  },
  {
    Icon: Flame,
    title: "BURN DEAD TOKENS",
    body: "Send worthless or rugged ERC-20s to the Altar. A verified-dead burn earns 38 karma x1.5 plus a log-scaled amount bonus. Unverified burns earn a small capped amount.",
  },
  {
    Icon: Crown,
    title: "EARN KARMA",
    body: "Every burn earns Karma, scored on-chain. Epoch karma decides your fee share and airdrop for that round; lifetime karma sets your tier.",
  },
  {
    Icon: Gift,
    title: "INHERIT THE REBIRTH",
    body: "When the clock hits zero (never before 6 h) a new token launches on Pons. Every burner claims a share of the seed buy, pro-rata by epoch karma.",
  },
  {
    Icon: Coins,
    title: "CLAIM FEE SHARE",
    body: "30% of each epoch treasury is a fee-share pool. Claim your share by epoch karma, in ETH. Amounts depend on activity and may be zero.",
  },
];

const SPLIT = [
  ["30%", "FEE SHARE", "ETH to burners, claimable by epoch karma", "border-ember text-ember"],
  ["40%", "SEED", "Launches and seeds the next epoch token", "border-flame text-flame"],
  ["30%", "BUYBACK", "Buys $THANATOS and burns it to 0x…dEaD", "border-purple-400 text-purple-400"],
];

export function HowItWorks() {
  return (
    <section className="px-4 pb-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-ash" />
        <h2 className="text-[10px] tracking-[0.3em] text-bone/40">WHY SACRIFICE - THE REWARD LOOP</h2>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-ash" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {STEPS.map(({ Icon, title, body }, i) => (
          <div key={title} className="panel group relative p-5 transition-colors hover:border-ember/50">
            <span className="absolute right-4 top-3 text-4xl font-bold text-bone/5 group-hover:text-ember/10">0{i + 1}</span>
            <Icon className="mb-3 h-5 w-5 text-ember drop-shadow-[0_0_8px_#dc2626]" />
            <h3 className="mb-2 text-xs tracking-[0.2em] text-bone">{title}</h3>
            <p className="text-xs leading-relaxed text-bone/50">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="panel border-l-2 border-ember p-4">
          <div className="mb-1 text-[10px] tracking-[0.25em] text-ember">$THANATOS FEES</div>
          <div className="text-2xl font-bold text-bone">2.7% <span className="text-sm font-normal text-bone/50">of volume to holders</span></div>
          <p className="mt-1 text-xs text-bone/50">1% Pons curve fee (70% creator side) + 2% creator tax. 100% routed to holders by Pons Holder Fee Sharing.</p>
        </div>
        <div className="panel border-l-2 border-flame p-4">
          <div className="mb-1 text-[10px] tracking-[0.25em] text-flame">REBIRTH TOKEN FEES</div>
          <div className="text-2xl font-bold text-bone">2.7% <span className="text-sm font-normal text-bone/50">of volume + altar fees → the Altar treasury</span></div>
          <p className="mt-1 text-xs text-bone/50">20% protocol (two founder wallets, 50/50, on-chain splitter). The remaining 80% is split at each rebirth:</p>
          <div className="mt-2 flex h-1.5 w-full gap-px overflow-hidden">
            <div className="bg-ember" style={{ width: "30%" }} /><div className="bg-flame" style={{ width: "40%" }} /><div className="bg-purple-500" style={{ width: "30%" }} />
          </div>
        </div>
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
        NO PRESALE · NO TEAM ALLOCATION · LOCKED LIQUIDITY · 0.0005 ETH ALTAR FEE PER BURN · EPOCHS LAST AT LEAST 6 H · SOUL TARGET GROWS 1.25x EACH REBIRTH
      </p>
    </section>
  );
}
