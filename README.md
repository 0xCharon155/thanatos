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
1. **Burn**: users call `sacrifice()` with a 0.0005 ETH altar fee. The token is transferred straight to
   `0x…dEaD`; the contract measures the balance delta, so fake and fee-on-transfer tokens cannot inflate it.
2. **Karma (on-chain)**: a verifier service checks the token once had a market and is now < 5% of peak,
   then signs a 1-hour EIP-712 voucher. Verified burns earn `max(1, log10(amount+1)) × 1.5` (dead) or `× 1.0`
   (alive) and extend the clock (max +30 min per wallet per epoch). Unverified burns earn a flat 38 karma,
   capped at 380 per wallet per epoch, and never move the clock.
3. **Seal**: when the clock expires (anyone can call `seal()`) or the target is hit, the epoch seals.
4. **Rebirth**: the keeper stages LLM-generated metadata on the Reincarnator and calls `rebirth()`. The
   Altar splits its treasury: **20% protocol** (50/50 founder pull-splitter), then **30% fee-share pool /
   40% seed / 30% $THANATOS buyback-burn**. Seed goes to the Reincarnator, whose only target is the Pons v2
   forwarder (`launchAndBuy`, ETH pair, `creatorFeeRecipient = Altar`, 2% tax); bought tokens stay in the
   Reincarnator for a merkle airdrop to the top 50 by epoch karma.
5. **Fee share**: `claimable()` sums per-epoch pools by the wallet's epoch karma; `claim()` pays ETH.
   A later epoch can never spend an earlier pool.

Amounts depend on activity and may be zero.

| Fees in an epoch | Protocol 20% | Fee share | Seed | Buyback |
|---|---|---|---|---|
| $270 | $54 | $65 | $86 | $65 |
| $2,700 | $540 | $648 | $864 | $648 |
| $27,000 | $5,400 | $6,480 | $8,640 | $6,480 |
---

## Architecture

```
+------------------------------------------------------------------------------+
|                          EVM chain (Robinhood Chain)                         |
|                                                                              |
|  ThanatosAltarV2 ---- sacrifice() -> token to 0x...dEaD, karma on-chain      |
|     | seal() [anyone]  rebirth() [keeper]  claim() [anyone]                  |
|     | treasury split: 20% -> FounderSplitter (pull, 50/50)                   |
|     |                 30% -> feePoolOf[epoch]                                |
|     |                 40% -> Reincarnator.seed()  -> Pons forwarder          |
|     |                 30% -> Buyback.execute()    -> Pons curve -> dEaD      |
|     v                                                                        |
|  Reincarnator: stage() [keeper] . launchAndBuy (fixed target) . merkle claim |
|  Buyback:      route set once, then frozen                                   |
+-------------|----------------------------------------------------------------+
              | Offering / Sealed / Reborn / Claimed events (never computed off-chain)
              v
+------------------------------------------------------------------------------+
|  Workers (1-min cron)                                                        |
|   eventIndexer   mirrors events -> /sacrifices /leaderboard /epochs /claims  |
|                  refreshes /altar_state cache from contract views            |
|   epochDaemon    seal -> stage (LLM) -> rebirth -> merkle root               |
|                  WAITING_FOR_TREASURY when seed < Pons launchFee             |
|   voucher (HTTP) EIP-712 deadness voucher signed by the VERIFIER key         |
|  Keys: owner (cold, deploy+freeze) . keeper (agent) . verifier - all separate |
+------------------------------+-----------------------------------------------+
                               | contract views (headline numbers, marked ◆) + event cache
                               v
+------------------------------------------------------------------------------+
|  Next.js frontend (static export, any host)                                  |
|  Dormant state until ALTAR_ADDRESS is set . voucher fetch before sacrifice   |
+------------------------------------------------------------------------------+
```

### Karma formula (on-chain)

```
burned      = balanceOf(dEaD) after - before          // fake / fee-on-transfer safe
verified    = max(1, log10(burned / 10^decimals + 1)) x multBps/10000   // 1.5 dead, 1.0 alive
unverified  = 38 per burn, capped at 380 per wallet per epoch
clock bonus = verified karma x 1 min, capped at 30 min per wallet per epoch
```

### Fee share

```
claimable(w) = sum over past epochs e of  feePoolOf[e] x karmaOf[e][w] / totalKarmaOf[e]
```
### Epoch pacing

| Epoch | Duration | Target |
|-------|----------|--------|
| 1     | 6 h      | 1000 karma |
| n+1   | 24 h (contract param, frozen after setup) | previous x 1.25 |

---

## Repository layout

```
thanatos/
|-- thanatos-frontend/          Next.js . Tailwind . wagmi v2 . RainbowKit . Zustand
|   |-- src/app/                layout, dashboard page, /whitepaper
|   |-- src/components/         Header, Hero, MetricStrip, IncineratorForm, NecroPitCanvas,
|   |                           TelemetryTerminal, HowItWorks, Leaderboard, FeeShareVault, AirdropClaim,
|   |                           Reincarnations, RebirthOverlay
|   |-- src/hooks/              useAltarState (contract views), useSacrificeLogs (event cache), useFeeShareClaim
|   |-- src/config/             wagmi chain, contract ABIs, DB client
|   `-- src/store/              useThanatosStore (Zustand)
|
`-- thanatos-backend/
    |-- contracts/              ThanatosAltarV2.sol, Reincarnator.sol, Buyback.sol, FounderSplitter.sol
    |-- test/                   Hardhat tests (sacrifice, voucher, epochs, claims, freeze, security)
    |-- scripts/                deployContracts.ts (Hardhat)
    |-- functions/src/
    |   |-- index.ts            eventIndexer, epochEvaluationDaemon, voucher, indexNow (IAM), refreshState (IAM)
    |   |-- workers/            indexer (event mirror), epochDaemon (seal/stage/rebirth/merkle)
    |   |-- services/           voucher (EIP-712), dexMetrics, aiLoreService, twitterService
    |   |-- utils/              math (tiers, sanitizer)
    |   `-- config/             constants (ABIs, addresses), clients (RPCs, keys), DB admin client
    |-- firestore.rules         public read, no client writes (reference deploy)
    `-- firebase.json           reference deploy config
```

---

## Document schema (event cache)

| Path | Written by | Purpose |
|------|-----------|---------|
| `altar_state/current` | indexer / daemon | cache of contract views + daemon `status` (`DORMANT`, `BURNING`, `WAITING_FOR_TREASURY`, `STAGING`, `SEALED`, `REBORN`, `ERROR`) |
| `altar_state/indexer_cursor` | indexer | `last_block` (starts at `ALTAR_DEPLOY_BLOCK`) |
| `sacrifices/{tx-logIndex}` | indexer | mirror of `Offering` |
| `leaderboard/{wallet}` | indexer | `lifetime_karma`, `epoch_karma.{n}`, `burn_count`, `tier` |
| `epochs/{n}` | indexer | mirror of `Sealed` + `Reborn` |
| `reincarnations/{n}` | daemon + indexer | staged name/symbol, token address, merkle root |
| `airdrops/{n}_{wallet}` | daemon | amount + merkle proof for `claimAirdrop` |
| `claims/{tx-logIndex}` | indexer | mirror of `Claimed` |
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
cp .env.example .env            # DEPLOYER (cold) key, AGENT + VERIFIER addresses, founders, Pons config
npm install
npm test                        # hardhat test suite must be green
npm run deploy:contracts        # deploys + verifies on Blockscout, prints addresses + deploy block
```

Deploy order (see `scripts/deployContracts.ts`): FounderSplitter → AltarV2 → Reincarnator → Buyback →
`setExecutors`. After $THANATOS exists: `Buyback.setRoute(token, curve)` then `Buyback.freeze()`.
After one successful mainnet test epoch: `Altar.freeze()` (owner) and `Reincarnator.freeze()` (keeper).

### 2. Backend workers

```bash
cd thanatos-backend/functions
cp .env.example .env            # non-secret config: addresses, RPC, LLM base URL, site URL
npm install
npm run build
```

Runtime secrets (never commit): `AGENT_PRIVATE_KEY` (keeper), `VERIFIER_PRIVATE_KEY` (vouchers; a
different key), `LLM_API_KEY`, and optionally `TWITTER_CONSUMER_SECRET`, `TWITTER_ACCESS_TOKEN`,
`TWITTER_ACCESS_SECRET`. Set `INDEXER_RPC_URL` to a paid RPC that serves `eth_getLogs`.

Reference deploy (Firebase):

```bash
cp .firebaserc.example ../.firebaserc   # set your project id
firebase functions:secrets:set AGENT_PRIVATE_KEY
firebase functions:secrets:set VERIFIER_PRIVATE_KEY
firebase functions:secrets:set LLM_API_KEY
cd .. && firebase deploy --only functions,firestore
# indexNow / refreshState are IAM-private; grant roles/run.invoker to your ops account
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
npx tsx src/utils/math.ts               # tier / sanitizer asserts
npx tsx src/services/aiLoreService.ts   # live LLM call, prints generated metadata
npx tsx src/services/twitterService.ts  # posts a test tweet (dry-runs without tokens)
```

---

## Security model

- Sacrificed tokens go directly to `0x…dEaD`; the Altar never custodies them and has no token-moving function.
- Karma is computed on-chain from the measured burn. Off-chain services only mirror events or sign vouchers.
- Three separate keys: **owner** (cold wallet; deploys, sets executors, calls `freeze()`), **keeper**
  (`seal`, `stage`, `rebirth`, `setMerkleRoot`), **verifier** (signs vouchers). The keeper cannot move ETH
  or tokens. The deploy script refuses to run if deployer == keeper.
- `rebirth()` sends ETH only to the three executors stored in the Altar; the Reincarnator's Pons target
  and the Buyback route are immutable/frozen. There is no arbitrary-call function.
- Per-epoch fee pools with a reserved balance; a claim can never draw from another epoch or from the treasury.
- All setters emit events and are disabled by a one-way `freeze()`; until frozen, changes are visible on-chain.
- Fake ERC-20s, fee-on-transfer and rebasing tokens are rejected or credited only for the measured delta.
- Voucher-less burns are capped per wallet per epoch and cannot extend the clock.
- Ops endpoints are IAM-private; the public `voucher` endpoint is cacheable and signs only after a market-history check.
- Database rules: world-readable, zero client writes.
---

## Pons v2 integration

| Item | Value |
|---|---|
| Factory | `0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e` (`launchToken`, `previewLaunchEconomics`, `TokenLaunched`) |
| Launch config | `0`: 1B supply, 1% curve fee, 4.2 ETH graduation into a locked Uniswap v4 pool |
| Forwarder | `0xe33E9E479dF8802cb0866d5d05258bEc4cF62948` (`launchAndBuy`) - the only target the Reincarnator can call |
| Pair token | native ETH (`0x0`). Not WETH, not `0xd060…` (that is the NVDA stock token) |
| Creator tax | 200 bps (2%) on all Thanatos tokens; protocol cap is 1000 bps |
| $THANATOS fee recipient | Pons Holder Fee Sharing (holders claim from Pons profile) |
| Rebirth fee recipient | `ThanatosAltarV2` (treasury; split at rebirth) |
| Snipe protection | 99% buy tax decaying to 0 over the first seconds; the Altar is exempted on rebirth launches |

Every rebirth token has its own Pons page at `ponsfamily.com/token/<address>`; the site's
Reincarnations panel links there and the rebirth overlay shows a "Trade on Pons" button.

## Status / known gaps

- Contracts are unaudited. Hardhat suite covers C-1..C-5, H-8, H-9, H-11, M-12, M-15, M-16 from the 2026-09-16 audit.
- Pons curve `buy(minOut, recipient)` selector for the Buyback route must be confirmed against the live
  $THANATOS curve before `setRoute`; a wrong route reverts and the ETH falls back to the epoch fee pool.
- Twitter posting requires an X API plan with write credits.
- Voucher endpoint should sit behind a rate limiter (Cloud Armor / hosting rewrite).
## License

MIT
