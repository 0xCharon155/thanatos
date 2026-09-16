import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Code2 } from "lucide-react";

export const metadata = { title: "Whitepaper - $THANATOS" };

const H = ({ n, children }: { n: string; children: React.ReactNode }) => (
  <h2 className="mb-4 mt-12 flex items-baseline gap-3 text-sm tracking-[0.3em] text-bone">
    <span className="text-ember">{n}</span> {children}
  </h2>
);
const P = ({ children }: { children: React.ReactNode }) => <p className="mb-4 text-sm leading-relaxed text-bone/70">{children}</p>;
const Box = ({ children }: { children: React.ReactNode }) => (
  <div className="panel my-4 p-4 font-mono text-xs leading-relaxed text-bone/80">{children}</div>
);

export default function Whitepaper() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between text-[10px] tracking-[0.2em]">
        <Link href="/" className="flex items-center gap-1 text-ember hover:text-flame"><ArrowLeft className="h-3 w-3" /> ALTAR</Link>
        <a href="https://github.com/0xCharon155/thanatos" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-bone/50 hover:text-bone"><Code2 className="h-3 w-3" /> SOURCE</a>
      </div>

      <div className="flex items-center gap-5">
        <Image src="/logo.png" alt="" width={72} height={72} className="drop-shadow-[0_0_20px_#dc2626]" />
        <div>
          <h1 className="text-3xl font-bold tracking-[0.2em] text-bone">$THANATOS</h1>
          <div className="text-[10px] tracking-[0.3em] text-bone/40">WHITEPAPER - v1.1 - ROBINHOOD CHAIN</div>
        </div>
      </div>

      <P>
        <br />
        <strong className="text-bone">One sentence:</strong> burn tokens that are already worthless, earn permanent Karma, and get paid
        in ETH and in every new token the protocol creates from the ashes.
      </P>

      <H n="01">THE PROBLEM</H>
      <P>
        Every wallet is full of dead tokens: rugs, abandoned memes, airdrop dust. They have no buyers, no liquidity, no use. Meanwhile,
        launching a new token requires a team, a treasury, and trust that the team will not disappear. THANATOS removes both problems:
        it uses the dead tokens as fuel, and replaces the team with code.
      </P>

      <H n="02">TWO KINDS OF TOKEN</H>
      <P>THANATOS has one brand token and an endless series of epoch tokens. They reward you in different ways.</P>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel border-l-2 border-ember p-4">
          <div className="mb-2 text-[10px] tracking-[0.25em] text-ember">$THANATOS - THE BRAND TOKEN</div>
          <p className="text-xs leading-relaxed text-bone/60">
            Launched once on Pons with <strong className="text-bone">Holder Fee Sharing</strong> switched on. Every trade pays 2.7% in fees
            (1% curve fee, 70% of which goes to the creator side, plus a 2% creator tax). 100% of that creator side is split pro-rata
            between all $THANATOS holders and claimed from your Pons profile. No team wallet, no protocol cut. Just hold.
          </p>
        </div>
        <div className="panel border-l-2 border-flame p-4">
          <div className="mb-2 text-[10px] tracking-[0.25em] text-flame">REBIRTH TOKENS - ONE PER EPOCH</div>
          <p className="text-xs leading-relaxed text-bone/60">
            Created automatically at the end of each epoch from the most-burned dead tokens. Their creator fees flow into the
            ThanatosFeeSplitter and are divided 30 / 40 / 30: ETH dividends for burners by Karma, treasury for the next launch,
            and protocol operations. Top 50 burners of the epoch are airdropped the new token.
          </p>
        </div>
      </div>

      <H n="03">HOW AN EPOCH WORKS</H>
      <P>The protocol runs in rounds called epochs. Each epoch has a countdown (the death clock) and a goal (the soul target).</P>
      <Box>
        1. You send a dead token to the Altar contract. It is locked forever.<br />
        2. The burn is scored as <span className="text-flame">soul weight</span>. Bigger burns and deader tokens score higher.<br />
        3. Your soul weight is added to the epoch total and to your permanent <span className="text-flame">Karma</span>.<br />
        4. Every burn adds minutes to the death clock, extending the round.<br />
        5. When the clock hits zero OR the soul target is reached, the epoch ends.<br />
        6. The protocol names and launches a new token on Pons from its own treasury.<br />
        7. The top 50 burners of that epoch receive the new token as an airdrop.<br />
        8. A new epoch begins with a fresh clock and a 25% higher target.
      </Box>

      <H n="04">SOUL WEIGHT (HOW BURNS ARE SCORED)</H>
      <P>The score grows with the logarithm of the amount, so dumping a billion units of dust does not give a billion points, but every
        burn is worth at least 1 point. Tokens with zero trading activity get a 50% bonus, because they are truly dead.</P>
      <Box>
        weight = max(1, log10(amount + 1) x bonus)<br />
        bonus  = 1.5 if the token has no DEX volume, otherwise 1.0<br />
        <br />
        Examples: 1,000 tokens = 3 SW / 1,000,000 = 6 SW / 1,000,000,000 = 9 SW / dead bonus x1.5
      </Box>

      <H n="05">THE FOUR REWARDS</H>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["HOLD $THANATOS", "Receive your pro-rata share of 2.7% of all $THANATOS trading volume, paid by Pons Holder Fee Sharing. Claim any time from your Pons profile."],
          ["BURN FOR KARMA", "Every dead token you sacrifice raises your Karma forever. Karma decides your share of rebirth-token fee dividends, paid in ETH from the Thanatos vault."],
          ["AIRDROP", "Each epoch's new token is distributed to the top 50 wallets by epoch Karma, proportional to their share. Burn more that round, receive more."],
          ["RANK & TIER", "Top 3 are Arch-Necromancers, top 10 Soul Reapers, top 50 Acolytes. Tiers show on the leaderboard and are reserved for future weighting."],
        ].map(([t, b]) => (
          <div key={t} className="panel p-4">
            <div className="mb-2 text-[10px] tracking-[0.25em] text-flame">{t}</div>
            <p className="text-xs leading-relaxed text-bone/60">{b}</p>
          </div>
        ))}
      </div>

      <H n="06">WHERE THE MONEY COMES FROM</H>
      <P>Pons charges 1% on every trade and splits it 70% to the creator side, 30% to Pons. On top, a creator tax (2% for Thanatos tokens)
        goes entirely to the creator side. That is 2.7% of all volume.</P>
      <Box>
        $THANATOS:     2.7% of volume -&gt; all holders, pro-rata (Pons Holder Fee Sharing)<br />
        <br />
        Rebirth tokens: 2.7% of volume -&gt; ThanatosFeeSplitter<br />
        &nbsp;&nbsp;30% -&gt; Dividend vault (ETH, claimable by burners by Karma share)<br />
        &nbsp;&nbsp;40% -&gt; Rebirth treasury (seeds the next launch, so the loop never runs dry)<br />
        &nbsp;&nbsp;30% -&gt; Protocol (infrastructure, gas for the autonomous agent, bots)
      </Box>
      <P>Example: $100k of daily volume on rebirth tokens sends $2,700 to the splitter: $810 to burners, $1,080 to the treasury, $810 to
        the protocol. Because the 40% is reinvested, each rebirth funds the next.</P>

      <H n="07">WHY IT IS TRUSTLESS</H>
      <Box>
        - Burned tokens are locked in the Altar contract. Nobody, including the deployer, can withdraw them.<br />
        - $THANATOS fees go to holders through Pons' own contracts. Thanatos never touches them.<br />
        - Rebirth fee splitting is enforced by the FeeSplitter contract and cannot be redirected after the fact.<br />
        - Dividend claims are computed on-chain from Karma set by the agent after each epoch.<br />
        - The agent key can only trigger the rebirth and update Karma. It cannot touch user funds.<br />
        - Every epoch transition is guarded by a lock so a congested chain can never double-launch.<br />
        - Fixed supply, locked liquidity, no mint, no blacklist, no tax increases (Pons v2 guarantees).<br />
        - The full source (contracts, backend, frontend) is public on GitHub.
      </Box>

      <H n="08">THE AUTONOMOUS AGENT</H>
      <P>A serverless backend watches the chain, scores each burn, and keeps the leaderboard. When an epoch ends it asks a language model
        to name the new token from the ashes of the most-burned tokens (DEADFROG + RUGPULL become something new), sanitizes the output,
        launches it on Pons, airdrops it, and announces it on X via @ThanatosAltar. No human is in the loop.</P>

      <H n="09">PARAMETERS</H>
      <Box>
        Chain: Robinhood Chain (id 4663) - Launchpad: Pons v2<br />
        $THANATOS: 1B fixed supply, ETH pair, 2% creator tax, Holder Fee Sharing on<br />
        Epoch 1 clock: 6 hours - later epochs: 24 hours (tunable)<br />
        Initial soul target: 1000 SW - grows 1.25x per epoch<br />
        Clock bonus: +1 minute per soul weight burned<br />
        Airdrop: top 50 by epoch Karma - seed buy 0.005 ETH per rebirth<br />
        No presale - no team allocation - no staking lockups
      </Box>

      <H n="10">RISKS (READ THIS)</H>
      <P>Rebirth tokens are memecoins created by an algorithm; they can go to zero. Fee income depends on trading volume that may never
        materialize. Smart contracts are unaudited. Burned tokens cannot be recovered under any circumstances. Only sacrifice what you
        already consider worthless.</P>

      <div className="mt-12 border-t border-ash pt-6 text-center text-[10px] tracking-[0.2em] text-bone/30">
        THE ALTAR IS OPEN - <Link href="/" className="text-ember hover:text-flame">SACRIFICE</Link>
      </div>
    </main>
  );
}
