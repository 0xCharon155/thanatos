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
          <div className="text-[10px] tracking-[0.3em] text-bone/40">WHITEPAPER · v2.0 · ROBINHOOD CHAIN</div>
        </div>
      </div>

      <P>
        <br />
        <strong className="text-bone">One sentence:</strong> burn tokens that are already worthless, earn karma scored on-chain, and receive a share of protocol fees in ETH plus every new token the protocol creates from the ashes. Amounts depend on activity and may be zero.
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
            Created automatically at the end of each epoch from the most-burned dead tokens. Their creator fees and every altar fee flow into the Altar treasury. At rebirth: 20% protocol, then the rest splits 30% fee share for burners / 40% seed for the next launch / 30% buyback-and-burn of $THANATOS. Top 50 burners of the epoch can claim the new token.
          </p>
        </div>
      </div>

      <H n="03">HOW AN EPOCH WORKS</H>
      <P>The protocol runs in rounds called epochs. Each epoch has a countdown (the death clock) and a goal (the soul target).</P>
      <Box>
        1. You send a dead token to the Altar with a 0.0005 ETH altar fee. The token goes straight to 0x…dEaD.<br />
        2. The contract measures what actually arrived and scores it as <span className="text-flame">karma</span> on-chain.<br />
        3. Verified-dead tokens (voucher from the verifier) earn log-scaled karma ×1.5 and extend the clock (max +30 min per wallet per epoch).<br />
        4. Unverified tokens earn a flat base karma, capped per wallet per epoch, and never move the clock.<br />
        5. When the clock hits zero OR the soul target is reached, the epoch seals. Anyone can call seal().<br />
        6. The keeper stages a name from the ashes and calls rebirth(): the contract splits the treasury and launches on Pons.<br />
        7. The top 50 burners by epoch karma claim the new token via a merkle airdrop.<br />
        8. A new epoch begins with a fresh clock and a 25% higher target.
      </Box>

      <H n="04">SOUL WEIGHT (HOW BURNS ARE SCORED)</H>
      <P>Karma is computed by the Altar contract from the amount that actually landed at 0x…dEaD. A verifier service checks the token had a real market once and is now below 5% of its peak, then signs a short-lived EIP-712 voucher. Freshly minted junk has no history, gets no voucher, and is capped.</P>
      <Box>
        verified:   karma = max(1, log10(amount + 1)) × mult    mult = 1.5 dead · 1.0 alive<br />
        unverified: karma = 38 per burn, max 380 per wallet per epoch, no clock bonus<br />
        <br />
        Examples (verified dead): 1,000 tokens = 4.5 · 1,000,000 = 9 · 1,000,000,000 = 13.5 karma
      </Box>

      <H n="05">THE FOUR REWARDS</H>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["HOLD $THANATOS", "Receive your pro-rata share of 2.7% of all $THANATOS trading volume, paid by Pons Holder Fee Sharing. Claim any time from your Pons profile."],
          ["BURN FOR KARMA", "Epoch karma decides your fee share and airdrop for that round. Lifetime karma sets your tier. Both are read from on-chain events."],
          ["AIRDROP", "The seed buy of each new token is held by the Reincarnator contract. Top 50 by epoch karma claim it pro-rata with a merkle proof."],
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
        Rebirth tokens: 2.7% of volume + 0.0005 ETH per burn -&gt; Altar treasury<br />
        &nbsp;&nbsp;20% -&gt; Protocol (two founder wallets, 50/50, on-chain pull splitter)<br />
        &nbsp;&nbsp;80% split at rebirth:<br />
        &nbsp;&nbsp;&nbsp;&nbsp;30% -&gt; Fee-share pool for that epoch (ETH, claimable by epoch karma)<br />
        &nbsp;&nbsp;&nbsp;&nbsp;40% -&gt; Seed: launch fee + initial buy of the next token (airdropped)<br />
        &nbsp;&nbsp;&nbsp;&nbsp;30% -&gt; Buyback of $THANATOS, burned to 0x…dEaD
      </Box>
      <P>Example: $2,700 of fees in an epoch → $540 protocol, then $648 fee share, $864 seed, $648 buyback. Because the seed is reinvested, each rebirth funds the next. If the treasury cannot cover the Pons launch fee, the epoch waits and the site shows it.</P>

      <H n="07">WHAT THE CODE GUARANTEES</H>
      <Box>
        - Sacrificed tokens are transferred straight to 0x…dEaD. The Altar never holds them; nobody can withdraw them.<br />
        - Karma is computed inside the contract from the measured burn. The backend only mirrors events.<br />
        - The keeper key can call seal(), stage metadata, rebirth() and set the airdrop root. It cannot move ETH or tokens.<br />
        - rebirth() can only send ETH to three fixed executors: the founder splitter, the Reincarnator (fixed Pons factory) and the Buyback (fixed route).<br />
        - Fee-share pools are per epoch; a later epoch can never spend an earlier pool.<br />
        - Every setter is disabled by a one-way freeze() after the mainnet test epoch. Until then the owner (cold wallet, not the keeper) can adjust parameters; all changes emit events.<br />
        - $THANATOS fees go to holders through Pons&apos; own contracts. Thanatos never touches them.<br />
        - Pons v2 guarantees: fixed supply, locked liquidity, no mint, no blacklist, no tax increases.<br />
        - Contracts are unaudited. Source is public on GitHub with a Hardhat test suite.
      </Box>

      <H n="08">THE AUTONOMOUS AGENT</H>
      <P>Three keys, three jobs. The <strong className="text-bone">verifier</strong> signs deadness vouchers after checking DexScreener/GeckoTerminal history. The <strong className="text-bone">keeper</strong> watches the chain, asks a language model to fuse the most-burned tickers into a new name (DEADFROG + RUGPULL → DEADPULL), stages it, calls rebirth(), and publishes the airdrop merkle root. The <strong className="text-bone">owner</strong> is a cold wallet used only for deployment and the final freeze. An indexer mirrors contract events into a cache the website reads; every headline number is read from the contract directly (marked ◆).</P>

      <H n="09">PARAMETERS</H>
      <Box>
        Chain: Robinhood Chain (id 4663) - Launchpad: Pons v2<br />
        $THANATOS: 1B fixed supply, ETH pair, 2% creator tax, Holder Fee Sharing on<br />
        Epoch 1 clock: 6 hours · later epochs: 24 hours (frozen after setup)<br />
        Initial soul target: 1000 karma · grows 1.25× per epoch<br />
        Altar fee: 0.0005 ETH per burn · clock bonus: +1 min per verified karma, max +30 min per wallet per epoch<br />
        Unverified: 38 karma per burn, 380 cap per wallet per epoch<br />
        Split: 20% protocol · then 30% fee share / 40% seed / 30% $THANATOS buyback-burn<br />
        Airdrop: top 50 by epoch karma, merkle claim<br />
        No presale - no team allocation - no staking lockups
      </Box>

      <H n="10">RISKS (READ THIS)</H>
      <P>Rebirth tokens are memecoins created by an algorithm; they can go to zero. Fee share depends on trading volume and altar activity that may never materialize; it can be zero. Smart contracts are unaudited. Burned tokens cannot be recovered under any circumstances. The altar fee is not refundable. Only sacrifice what you already consider worthless.</P>

      <div className="mt-12 border-t border-ash pt-6 text-center text-[10px] tracking-[0.2em] text-bone/30">
        THE ALTAR IS OPEN - <Link href="/" className="text-ember hover:text-flame">SACRIFICE</Link>
      </div>
    </main>
  );
}
