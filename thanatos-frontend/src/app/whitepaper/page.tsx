import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Code2 } from "lucide-react";

export const metadata = { title: "Whitepaper â€” $THANATOS" };

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
        <a href="https://Code2.com/0xCharon155/thanatos" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-bone/50 hover:text-bone"><Code2 className="h-3 w-3" /> SOURCE</a>
      </div>

      <div className="flex items-center gap-5">
        <Image src="/logo.svg" alt="" width={72} height={72} className="drop-shadow-[0_0_20px_#dc2626]" />
        <div>
          <h1 className="text-3xl font-bold tracking-[0.2em] text-bone">$THANATOS</h1>
          <div className="text-[10px] tracking-[0.3em] text-bone/40">WHITEPAPER Â· v1.0 Â· ROBINHOOD CHAIN</div>
        </div>
      </div>

      <P>
        <br />
        <strong className="text-bone">One sentence:</strong> you burn tokens that are already worthless, and in return you earn a
        permanent share of every new token the protocol creates and of the ETH fees they generate.
      </P>

      <H n="01">THE PROBLEM</H>
      <P>
        Every wallet on every chain is full of dead tokens: rugs, abandoned memes, airdrop dust. They have no buyers, no liquidity,
        and no use. They just sit there. Meanwhile, launching a new token requires a team, a treasury, and trust that the team will
        not disappear. THANATOS removes both problems at once: it uses the dead tokens as the fuel, and replaces the team with code.
      </P>

      <H n="02">HOW A ROUND WORKS</H>
      <P>The protocol runs in rounds called <em>epochs</em>. Each epoch has a countdown (the death clock) and a goal (the soul target).</P>
      <Box>
        1. You send a dead token to the Altar contract. It is locked forever.<br />
        2. The burn is scored as <span className="text-flame">soul weight</span>. Bigger burns and deader tokens score higher.<br />
        3. Your soul weight is added to the epoch total and to your personal <span className="text-flame">Karma</span>.<br />
        4. Every burn also adds minutes to the death clock, extending the round.<br />
        5. When the clock hits zero OR the soul target is reached, the epoch ends.<br />
        6. The protocol launches a brand-new token (the <span className="text-flame">rebirth</span>) using its own treasury.<br />
        7. The top 50 burners of that epoch receive the new token as an airdrop.<br />
        8. A new epoch begins with a fresh clock and a 25% higher target.
      </Box>

      <H n="03">SOUL WEIGHT (HOW BURNS ARE SCORED)</H>
      <P>The score grows with the logarithm of the amount, so dumping a billion units of dust does not give a billion points, but
        every burn is worth at least 1 point. Tokens with zero trading activity get a 50% bonus, because they are truly dead.</P>
      <Box>
        weight = max(1, log10(amount + 1) Ã— bonus)<br />
        bonus  = 1.5 if the token has no DEX volume, otherwise 1.0<br />
        <br />
        Examples: 1,000 tokens â‰ˆ 3 SW Â· 1,000,000 â‰ˆ 6 SW Â· 1,000,000,000 â‰ˆ 9 SW Â· dead bonus â†’ Ã—1.5
      </Box>

      <H n="04">THE THREE REWARDS</H>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["AIRDROP", "Each rebirth token is distributed to the top 50 wallets by epoch Karma, proportional to their share. Burn more that round, receive more of the new token."],
          ["ETH DIVIDENDS", "30% of every trading fee on every rebirth token flows to the dividend vault. Your claim is your Karma divided by total Karma. Karma never resets, so early burners earn from every future token too."],
          ["RANK & TIER", "Top 3 are Arch-Necromancers, top 10 Soul Reapers, top 50 Acolytes. Tiers are displayed on the leaderboard and reserved for future weighting."],
        ].map(([t, b]) => (
          <div key={t} className="panel p-4">
            <div className="mb-2 text-[10px] tracking-[0.25em] text-flame">{t}</div>
            <p className="text-xs leading-relaxed text-bone/60">{b}</p>
          </div>
        ))}
      </div>

      <H n="05">WHERE THE MONEY COMES FROM</H>
      <P>Every rebirth token is launched on a bonding-curve factory that charges a small fee on each trade. THANATOS is set as the
        fee recipient, and the fee splitter contract divides it automatically the moment it arrives:</P>
      <Box>
        30% â†’ Dividend vault (claimable in ETH by all burners, by Karma share)<br />
        40% â†’ Rebirth treasury (buys liquidity for the next launch, so the loop never runs dry)<br />
        30% â†’ Protocol (infrastructure, gas for the autonomous agent, bots)
      </Box>
      <P>Because the 40% is reinvested, each rebirth funds the next. The protocol does not need outside capital after epoch one.</P>

      <H n="06">WHY IT IS TRUSTLESS</H>
      <Box>
        â€¢ Burned tokens are locked in the Altar contract. Nobody, including the deployer, can withdraw them.<br />
        â€¢ Fee splitting is enforced by the contract. It cannot be redirected after the fact.<br />
        â€¢ Dividend claims are computed on-chain from Karma set by the agent after each epoch.<br />
        â€¢ The agent key can only trigger the rebirth and update Karma. It cannot touch user funds.<br />
        â€¢ Every epoch transition is guarded by a lock so a congested chain can never double-launch.<br />
        â€¢ The full source (contracts, backend, frontend) is public on Code2.
      </Box>

      <H n="07">THE AUTONOMOUS AGENT</H>
      <P>A serverless backend watches the chain, scores each burn, and keeps the leaderboard. When an epoch ends it asks a language
        model to name the new token from the ashes of the most-burned tokens (for example DEADFROG + RUGPULL become something new),
        sanitizes the output, launches it, airdrops it, and announces it on X via @ThanatosAltar. No human is in the loop.</P>

      <H n="08">PARAMETERS</H>
      <Box>
        Chain: Robinhood Chain (id 4663)<br />
        Epoch 1 clock: 6 hours Â· later epochs: 24 hours (tunable)<br />
        Initial soul target: 1000 SW Â· grows 1.25Ã— per epoch<br />
        Clock bonus: +1 minute per soul weight burned<br />
        Airdrop: top 50 by epoch Karma Â· seed buy capped at 0.05 ETH<br />
        No presale Â· no team allocation Â· no staking lockups
      </Box>

      <H n="09">RISKS (READ THIS)</H>
      <P>Rebirth tokens are memecoins created by an algorithm; they can go to zero. Dividends depend on trading volume that may never
        materialize. Smart contracts are unaudited. Burned tokens cannot be recovered under any circumstances. Only sacrifice what you
        already consider worthless.</P>

      <div className="mt-12 border-t border-ash pt-6 text-center text-[10px] tracking-[0.2em] text-bone/30">
        THE ALTAR IS OPEN Â· <Link href="/" className="text-ember hover:text-flame">SACRIFICE</Link>
      </div>
    </main>
  );
}
