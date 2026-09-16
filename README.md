# $THANATOS // The Autonomous Necromancer Protocol

> Feed your dead tokens to the Altar. Every burn adds soul weight and bends the death clock.
> When the clock strikes zero, the ashes are reborn as a new token, and the burners inherit it.

**Chain:** Robinhood Chain (EVM L2, chain id `4663`) via the Pons v2 launchpad
**Live:** https://thanatosaltar.xyz
**Bot:** [@ThanatosAltar](https://x.com/ThanatosAltar)

---

## What it does

THANATOS is a fully autonomous, non-custodial protocol. It has **two kinds of token** and **four ways to earn**.

### $THANATOS, the brand token
Launched once on Pons with **Holder Fee Sharing** enabled. Every trade pays 2.7% in fees
(1% Pons curve fee, of which 70% is the creator side, plus a 2% creator tax). 100% of that creator
side is distributed pro-rata to all $THANATOS holders by Pons' own contracts and claimed from the
holder's Pons profile. No team wallet, no protocol cut.

### Rebirth tokens, one per epoch
1. **Burn**: users send dead/rugged ERC-20s to `ThanatosAltar`. Tokens are locked forever.
2. **Earn Karma**: each burn is scored as *soul weight* (log-scaled by amount, x1.5 for tokens with
   zero DEX activity). Karma is permanent across epochs.
3. **Rebirth**: when the epoch's *death clock* expires or the soul-weight target is reached, the
   backend asks an LLM to synthesize a name/ticker/lore from the top burned tokens and launches a new
   token on Pons v2 from the treasury.
4. **Airdrop**: top 50 burners by epoch Karma receive the new token pro-rata.
5. **Dividends**: the new token's creator fees (2.7% of volume) flow to `ThanatosFeeSplitter`:
   **30%** ETH dividends to burners by Karma, **40%** treasury that seeds the next rebirth, **30%** protocol.

| Daily rebirth-token volume | To FeeSplitter (2.7%) | Burners 30% | Treasury 40% | Protocol 30% |
|---|---|---|---|---|
| $10k | $270 | $81 | $108 | $81 |
| $100k | $2,700 | $810 | $1,080 | $810 |
| $1M | $27,000 | $8,100 | $10,800 | $8,100 |

---

## Architecture

```
+------------------------------------------------------------------------------+
|                          EVM chain (Robinhood Chain)                         |
|   +--------------------+        +------------------------+   +------------+  |
|   |  ThanatosAltar.sol |        | ThanatosFeeSplitter.sol|   | Pons v2    |  |
|   |  sacrificeToken()  |        | receive() 30/40/30     |<--| Factory    |  |
|   |  executeRebirthSeed|------->| claimDividends()       |   | launchToken|  |
|   +---------+----------+        +-----------^------------+   +------------+  |
+-------------|-------------------------------|--------------------------------+
              | TokenSacrificed logs          | setKarma()
              v                               |
+------------------------------------------------------------------------------+
|              Backend workers (1-min cron) + realtime document DB             |
|                                                                              |
|  eventIndexer  -> soul-weight math -> /sacrifices  /leaderboard              |
|        |          DexScreener check   /altar_state/current                   |
|        +-> tweet on burns > 10 SW                                            |
|                                                                              |
|  epochEvaluationDaemon                                                       |
|      clock == 0 || weight >= target -> acquire mutex (is_locked)             |
|           +-> relayer: LLM lore -> launchToken on Pons -> /reincarnations    |
|           +-> airdrop: top 50 epoch_karma -> ERC20 transfers                 |
|           +-> reset: epoch+1, target x1.25, new clock, release lock          |
|                                                                              |
|  Secrets: AGENT_PRIVATE_KEY, LLM_API_KEY, TWITTER_* (any secret store)       |
+------------------------------+-----------------------------------------------+
                               | realtime listeners (read-only rules)
                               v
+------------------------------------------------------------------------------+
|                  Next.js frontend (static export, any host)                  |
|  wagmi + RainbowKit -- Zustand store <-- DB listeners                        |
|  Header . Hero . MetricStrip . Incinerator . NecroPit canvas . Terminal      |
|  HowItWorks . Leaderboard . DividendVault . Reincarnations . /whitepaper     |
+------------------------------------------------------------------------------+
```

### Soul-weight formula

```
weight = max(1.0, log10(raw_amount / 10^decimals + 1) x M_age)
M_age  = 1.5 if the token has zero 24h DEX volume or < $100 liquidity (DexScreener), else 1.0
```

Each burn also extends the death clock by `weight x 1 min`.

### Dividend share

```
share_i = karma_i / sum(karma) x dividend_pool
```

Karma is pushed on-chain via `ThanatosFeeSplitter.setKarma()` after every rebirth so claims are
trustless; the frontend shows a DB-based estimate until then.

### Epoch pacing

| Epoch | Duration | Target |
|-------|----------|--------|
| 1     | 6 h      | 1000 SW |
| n+1   | `altar_state.epoch_duration_sec` (default 24 h) | previous x 1.25 |

Tune live by editing `altar_state/current.epoch_duration_sec` in the database.

---

## Repository layout

```
thanatos/
|-- thanatos-frontend/          Next.js . Tailwind . wagmi v2 . RainbowKit . Zustand
|   |-- src/app/                layout, dashboard page, /whitepaper
|   |-- src/components/         Header, Hero, MetricStrip, IncineratorForm, NecroPitCanvas,
|   |                           TelemetryTerminal, HowItWorks, Leaderboard, DividendModule,
|   |                           Reincarnations, RebirthOverlay
|   |-- src/hooks/              useAltarState, useSacrificeLogs, useDividendClaim
|   |-- src/config/             wagmi chain, contract ABIs, DB client
|   `-- src/store/              useThanatosStore (Zustand)
|
`-- thanatos-backend/
    |-- contracts/              ThanatosAltar.sol, ThanatosFeeSplitter.sol
    |-- scripts/                deployContracts.ts (Hardhat)
    |-- functions/src/
    |   |-- index.ts            eventIndexer, epochEvaluationDaemon, indexNow, seedState
    |   |-- workers/            indexer, epochDaemon, relayer, airdrop
    |   |-- services/           aiLoreService (OpenAI-compatible), dexMetrics, twitterService
    |   |-- utils/              math (soul weight, tiers, sanitizer), lock (DB mutex)
    |   `-- config/             constants (ABIs, addresses), DB admin client
    |-- firestore.rules         public read, no client writes (reference deploy)
    `-- firebase.json           reference deploy config
```

---

## Document schema

| Path | Purpose |
|------|---------|
| `altar_state/current` | `soul_weight_current`, `soul_weight_target`, `death_clock_ends_at` (unix s), `reincarnation_epoch`, `is_locked`, `total_sacrifices`, `accumulated_rebirth_eth`, `accumulated_dividend_eth`, `epoch_duration_sec`, `warned[]` |
| `altar_state/indexer_cursor` | `last_block` |
| `sacrifices/{txHash-logIndex}` | `user_address`, `token_address`, `token_symbol`, `token_decimals`, `raw_amount`, `soul_weight_awarded`, `clock_bonus_min`, `epoch`, `timestamp` |
| `leaderboard/{wallet}` | `total_karma`, `epoch_karma`, `burn_count`, `tier`, `last_burn_timestamp` |
| `reincarnations/{epoch}` | `token_name`, `token_symbol`, `token_address`, `factory_tx_hash`, `seed_eth_spent`, `consumed[]`, `airdrop_recipients_count`, `created_at` |

---

## Running your own instance

The stack is intentionally boring: an EVM chain, two small Solidity contracts, a document database
with realtime listeners, a handful of scheduled workers, and a static frontend. The reference
deployment uses Firebase, but every piece is swappable:

| Layer | Reference | Swap for |
|---|---|---|
| Realtime DB | Firestore | Supabase / Postgres + websockets; the frontend only needs snapshot-style listeners |
| Workers | Cloud Functions v2 (1-min schedules) | Any cron runner: Vercel Cron, Railway, a VPS with `node-cron`, GitHub Actions |
| Secrets | Google Secret Manager | Doppler, Vault, plain env vars on your host |
| Hosting | Firebase Hosting | Vercel, Netlify, Cloudflare Pages, S3; it is a static `out/` folder |
| LLM | any OpenAI-compatible endpoint | OpenAI, a proxy, local Ollama |
| Chain | Robinhood Chain + Pons v2 | Any EVM chain with a launchpad exposing a `launchToken`-style call |

### Prerequisites
Node 22+, a wallet with a little gas on the target chain, a WalletConnect Cloud project id.

### 1. Contracts

```bash
cd thanatos-backend
cp .env.example .env            # RPC, chain id, deployer key, founder payout address
npm install
npm run compile
npm run deploy:contracts        # prints ALTAR_ADDRESS / FEE_SPLITTER_ADDRESS
```

### 2. Backend workers

```bash
cd thanatos-backend/functions
cp .env.example .env            # non-secret config: addresses, RPC, LLM base URL, site URL
npm install
npm run build
```

Runtime secrets (never commit): `AGENT_PRIVATE_KEY`, `LLM_API_KEY`, and optionally
`TWITTER_CONSUMER_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_SECRET`.

Reference deploy (Firebase):

```bash
cp .firebaserc.example ../.firebaserc   # set your project id
firebase functions:secrets:set AGENT_PRIVATE_KEY
firebase functions:secrets:set LLM_API_KEY
cd .. && firebase deploy --only functions,firestore
curl "https://<region>-<project>.cloudfunctions.net/seedState?key=$SEED_KEY"   # seed epoch 1
```

Elsewhere: call `indexOnce()` and `evaluateEpoch()` from `functions/src/workers` on a 1-minute
schedule, and replace `config/firebase.ts` with your own DB client.

### 3. Frontend

```bash
cd thanatos-frontend
cp .env.example .env.local      # chain, contract addresses, WC project id, DB config
npm install
npm run dev                     # http://localhost:3000
npm run build                   # static export to ./out, host anywhere
```

### Self-checks

```bash
cd thanatos-backend/functions
npx tsx src/utils/math.ts               # soul-weight / tier / sanitizer asserts
npx tsx src/services/aiLoreService.ts   # live LLM call, prints generated metadata
npx tsx src/services/twitterService.ts  # posts a test tweet (dry-runs without tokens)
```

---

## Security model

- Contracts are non-custodial for users: burned tokens are unrecoverable by anyone, including the owner.
- Only the `agent` EOA can call `executeRebirthSeed` / `forwardRebirthToken` / `setKarma`; its key lives only in the secret store.
- Database rules: world-readable, zero client writes. All writes come from the backend workers.
- Epoch transitions are guarded by a transactional mutex (`is_locked`) so a congested chain can never double-mint.
- Seed buy is capped at `SEED_BUY_ETH` (0.005) and `maxFeePerGas` is pinned in the relayer.
- All LLM output is regex-sanitized before it touches a transaction.

---

## Pons v2 integration

| Item | Value |
|---|---|
| Factory | `0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e` (`launchToken`, `previewLaunchEconomics`, `TokenLaunched`) |
| Launch config | `0`: 1B supply, 1% curve fee, 4.2 ETH graduation into a locked Uniswap v4 pool |
| Pair token | native ETH (`0x0`) |
| Creator tax | 200 bps (2%) on all Thanatos tokens; protocol cap is 1000 bps |
| $THANATOS fee recipient | Pons Holder Fee Sharing (holders claim from Pons profile) |
| Rebirth fee recipient | `ThanatosFeeSplitter` (30/40/30) |
| Snipe protection | 99% buy tax decaying to 0 over the first seconds; the Altar is exempted on rebirth launches |

Every rebirth token has its own Pons page at `ponsfamily.com/token/<address>`; the site's
Reincarnations panel links there and the rebirth overlay shows a "Trade on Pons" button.

## Status / known gaps

- Airdrop uses sequential `transfer` calls (<= 50 tx). Move to a disperse contract if gas matters.
- Twitter posting requires an X API plan with write credits.
- Contracts are unaudited.

## License

MIT
