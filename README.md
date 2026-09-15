# $THANATOS // The Autonomous Necromancer Protocol

> Feed your dead tokens to the Altar. Every burn adds soul weight and bends the death clock.
> When the clock strikes zero, the ashes are reborn as a new token â€” and the burners inherit it.

**Chain:** Robinhood Chain (EVM L2, chain id `4663`)
**Live:** https://thanatos-e440a.web.app
**Bot:** [@ThanatosAltar](https://x.com/ThanatosAltar)

---

## What it does

THANATOS is a fully autonomous, non-custodial protocol that turns worthless ERC-20 "dust" into a
perpetual reward loop:

1. **Burn** â€” users send dead/rugged tokens to `ThanatosAltar`. Tokens are locked forever.
2. **Earn Karma** â€” each burn is scored as *soul weight* (log-scaled by amount, boosted for tokens
   with zero DEX activity). Karma is permanent across epochs.
3. **Rebirth** â€” when the epoch's *death clock* expires or the soul-weight target is reached, the
   backend asks an LLM to synthesize lore + ticker from the top burned tokens and launches a new
   token on the Pons bonding-curve factory using the treasury.
4. **Airdrop** â€” top 50 burners by epoch Karma receive the new token pro-rata.
5. **Dividends** â€” 30% of every trading fee on every reborn token flows to `ThanatosFeeSplitter`
   and is claimable in ETH by Karma share.

Fee split on all reborn tokens: **30%** dividends â†’ burners Â· **40%** treasury â†’ seeds next rebirth Â· **30%** protocol.

---

## Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                          Robinhood Chain (EVM L2)                            â”‚
â”‚   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚   â”‚  ThanatosAltar.sol â”‚        â”‚ ThanatosFeeSplitter.solâ”‚   â”‚ Pons       â”‚  â”‚
â”‚   â”‚  sacrificeToken()  â”‚        â”‚ receive() 30/40/30     â”‚â—„â”€â”€â”¤ Factory    â”‚  â”‚
â”‚   â”‚  executeRebirthSeedâ”‚â”€â”€â”€â”€â”€â”€â”€â–ºâ”‚ claimDividends()       â”‚   â”‚ launchAndBuyâ”‚ â”‚
â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–²â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
             â”‚ TokenSacrificed logs           â”‚ setKarma()
             â–¼                                â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                     Firebase (Cloud Functions v2 + Firestore)                â”‚
â”‚                                                                              â”‚
â”‚  eventIndexer (1 min) â”€â”€â–º soul-weight math â”€â”€â–º /sacrifices  /leaderboard     â”‚
â”‚         â”‚                 DexScreener check     /altar_state/current         â”‚
â”‚         â””â”€â–º tweet on burns > 10 SW                                           â”‚
â”‚                                                                              â”‚
â”‚  epochEvaluationDaemon (1 min)                                               â”‚
â”‚      clock == 0 || weight >= target â”€â”€â–º acquire mutex (is_locked)            â”‚
â”‚           â”œâ”€â–º relayer: LLM lore â”€â–º executeRebirthSeed â”€â–º /reincarnations     â”‚
â”‚           â”œâ”€â–º airdrop: top 50 epoch_karma â”€â–º ERC20 transfers                 â”‚
â”‚           â””â”€â–º reset: epoch+1, target Ã—1.25, new clock, release lock          â”‚
â”‚                                                                              â”‚
â”‚  Secrets: AGENT_PRIVATE_KEY, LLM_API_KEY, TWITTER_* (Secret Manager)         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                               â”‚ onSnapshot (read-only rules)
                               â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                  Next.js 16 frontend (static export, Firebase Hosting)       â”‚
â”‚  wagmi + RainbowKit â”€â”€ Zustand store â—„â”€â”€ Firestore listeners                 â”‚
â”‚  Header Â· Hero Â· MetricStrip Â· Incinerator Â· NecroPit canvas Â· Terminal      â”‚
â”‚  HowItWorks Â· Leaderboard Â· DividendVault Â· Reincarnations Â· /archive        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Soul-weight formula

```
weight = max(1.0, log10(raw_amount / 10^decimals + 1) Ã— M_age)
M_age  = 1.5 if the token has zero 24h DEX volume or < $100 liquidity (DexScreener), else 1.0
```

Each burn also extends the death clock by `weight Ã— 1 min`.

### Dividend share

```
share_i = karma_i / Î£ karma Ã— dividend_pool
```

Karma is pushed on-chain via `ThanatosFeeSplitter.setKarma()` after every rebirth so claims are
trustless; the frontend shows a Firestore-based estimate until then.

### Epoch pacing

| Epoch | Duration | Target |
|-------|----------|--------|
| 1     | 6 h      | 1000 SW |
| n+1   | `altar_state.epoch_duration_sec` (default 24 h) | previous Ã— 1.25 |

Tune live by editing `altar_state/current.epoch_duration_sec` in Firestore.

---

## Repository layout

```
thanatos/
â”œâ”€â”€ thanatos-frontend/          Next.js 16 Â· Tailwind Â· wagmi v2 Â· RainbowKit Â· Zustand Â· Firebase JS SDK
â”‚   â”œâ”€â”€ src/app/                layout, dashboard page, /archive
â”‚   â”œâ”€â”€ src/components/         Header, Hero, MetricStrip, IncineratorForm, NecroPitCanvas,
â”‚   â”‚                           TelemetryTerminal, HowItWorks, Leaderboard, DividendModule, Reincarnations
â”‚   â”œâ”€â”€ src/hooks/              useAltarState, useSacrificeLogs, useDividendClaim
â”‚   â”œâ”€â”€ src/config/             wagmi chain, contracts ABIs, firebase client
â”‚   â””â”€â”€ src/store/              useThanatosStore (Zustand)
â”‚
â””â”€â”€ thanatos-backend/
    â”œâ”€â”€ contracts/              ThanatosAltar.sol, ThanatosFeeSplitter.sol
    â”œâ”€â”€ scripts/                deployContracts.ts (Hardhat)
    â”œâ”€â”€ functions/src/
    â”‚   â”œâ”€â”€ index.ts            eventIndexer, epochEvaluationDaemon, indexNow, seedState
    â”‚   â”œâ”€â”€ workers/            indexer, epochDaemon, relayer, airdrop
    â”‚   â”œâ”€â”€ services/           aiLoreService (OpenAI-compatible), dexMetrics, twitterService
    â”‚   â”œâ”€â”€ utils/              math (soul weight, tiers, sanitizer), lock (Firestore mutex)
    â”‚   â””â”€â”€ config/             constants (ABIs, addresses), firebase-admin
    â”œâ”€â”€ firestore.rules         public read, no client writes
    â””â”€â”€ firebase.json
```

---

## Firestore schema

| Path | Purpose |
|------|---------|
| `altar_state/current` | `soul_weight_current`, `soul_weight_target`, `death_clock_ends_at` (unix s), `reincarnation_epoch`, `is_locked`, `total_sacrifices`, `accumulated_rebirth_eth`, `accumulated_dividend_eth`, `epoch_duration_sec`, `warned[]` |
| `altar_state/indexer_cursor` | `last_block` |
| `sacrifices/{txHash-logIndex}` | `user_address`, `token_address`, `token_symbol`, `token_decimals`, `raw_amount`, `soul_weight_awarded`, `clock_bonus_min`, `epoch`, `timestamp` |
| `leaderboard/{wallet}` | `total_karma`, `epoch_karma`, `burn_count`, `tier`, `last_burn_timestamp` |
| `reincarnations/{epoch}` | `token_name`, `token_symbol`, `token_address`, `factory_tx_hash`, `seed_eth_spent`, `consumed[]`, `airdrop_recipients_count`, `created_at` |

---

## Local setup

### Prerequisites
Node 22+, Firebase CLI (`npm i -g firebase-tools`), a Firebase project with Firestore, a
WalletConnect Cloud project id.

### Frontend

```bash
cd thanatos-frontend
cp .env.example .env.local      # fill Firebase web config, WC project id, contract addresses
npm install
npm run dev                     # http://localhost:3000
npm run build                   # static export to ./out
firebase deploy --only hosting
```

### Contracts

```bash
cd thanatos-backend
cp .env.example .env            # AGENT_PRIVATE_KEY, AGENT_PUBLIC_ADDRESS, FOUNDER_PAYOUT_ADDRESS
npm install
npm run compile
npm run deploy:contracts        # prints ALTAR_ADDRESS / FEE_SPLITTER_ADDRESS
```

### Cloud Functions

```bash
cd thanatos-backend/functions
cp .env.example .env            # non-secret config only
npm install

# secrets live in Google Secret Manager, never in .env
firebase functions:secrets:set AGENT_PRIVATE_KEY
firebase functions:secrets:set LLM_API_KEY
firebase functions:secrets:set TWITTER_CONSUMER_SECRET
firebase functions:secrets:set TWITTER_ACCESS_TOKEN
firebase functions:secrets:set TWITTER_ACCESS_SECRET

npm run build
cd .. && firebase deploy --only functions,firestore

# seed epoch 1
curl "https://<region>-<project>.cloudfunctions.net/seedState?key=$SEED_KEY"
```

### Self-checks

```bash
cd thanatos-backend/functions
npx tsx src/utils/math.ts               # soul-weight / tier / sanitizer asserts
npx tsx src/services/aiLoreService.ts   # live LLM call, prints generated metadata
npx tsx src/services/twitterService.ts  # posts a test tweet (or dry-runs without tokens)
```

---

## Security model

- Contracts are non-custodial for users: burned tokens are unrecoverable by anyone, including the owner.
- Only the `agent` EOA can call `executeRebirthSeed` / `setKarma`; its key exists only in Secret Manager.
- Firestore rules: world-readable, zero client writes. All writes come from Cloud Functions.
- Epoch transitions are guarded by a Firestore transaction mutex (`is_locked`) so a congested chain
  can never double-mint.
- Seed buy is capped at `SEED_BUY_ETH` (0.005) and `maxFeePerGas` is pinned in the relayer.
- All LLM output is regex-sanitized before it touches a transaction.

---

## Status / known gaps

- `ponsFactoryAbi` in `functions/src/config/constants.ts` is a placeholder until the Pons
  `launchAndBuy` signature is verified against `0x3711â€¦1A42`.
- Reborn token address is inferred from receipt logs; swap to a proper event decode once the ABI is known.
- Airdrop uses sequential `transfer` calls (â‰¤ 50 tx). Move to a disperse contract if gas matters.
- Twitter posting requires an X API plan with write credits.

## License

MIT
