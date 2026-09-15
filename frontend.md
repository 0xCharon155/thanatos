```markdown
# Product Requirements Document (PRD) — Frontend Engine
**Project:** $THANATOS // The Autonomous Necromancer Protocol  
**Target Chain:** Robinhood Chain (EVM L2)  
**Version:** 1.0.0  
**Status:** Ready for Implementation  

---

## 1. Executive Summary & Objective
The $THANATOS frontend is a high-engagement, retro-cyberpunk Web3 decentralized application (dApp). It provides an interactive interface for users to connect EVM wallets, incinerate dead/dust ERC-20 tokens, track global soul-weight accumulation in real time, monitor the autonomous 48-hour death clock, and claim pro-rata ETH dividends generated from the circular 30/40/30 trading fee split.

---

## 2. Tech Stack & Dependencies

* **Framework:** Next.js 14+ (App Router, Server & Client Components)
* **Styling & Design System:** Tailwind CSS, PostCSS, Lucide Icons, `@tailwindcss/typography`
* **Canvas & Graphics:** HTML5 Canvas API (or lightweight Three.js / `@react-three/fiber`) for particle and flame rendering
* **State Management:** Zustand (client state cache) + Firebase SDK v10 (real-time Firestore listeners)
* **Web3 Integration:** `wagmi` v2, `viem` v2, `@rainbow-me/rainbowkit` (EVM connection layer)
* **Audio FX (Optional Toggle):** `howler.js` (for synth hums and burn sound effects)
* **Deployment Target:** Firebase Hosting / Vercel Edge Network

---

## 3. Application Layout & Wireframe Hierarchy


```

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [LOGO] THANATOS // NECROMANCER PROTOCOL      [PULSE: EPOCH ACTIVE]  [CONNECT WALLET]   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                  GLOBAL METRIC STRIP                                   │
│  [Active Epoch: #1]  [Death Clock: 18:42:11]  [Soul Weight: 74.2%]  [Treasury: 2.14 ETH]│
├──────────────────────────┬──────────────────────────────┬──────────────────────────────┤
│                          │                              │                              │
│   INCINERATOR MODULE     │     THE NECRO-PIT (CANVAS)   │     TELEMETRY TERMINAL       │
│                          │                              │                              │
│ • Dead Token Auto-Detect │   ┌──────────────────────┐   │ 0x8a...4b burned  │
│ • Custom CA Input Field  │   │  Procedural Flame /  │   │ > 12,000,000 $DEAD           │
│ • Amount / Slider        │   │  Particle Vortex     │   │ > Soul Weight: +4.2          │
│ • [APPROVE ERC-20]       │   │  (Scales with Burns) │   │ > Death Clock: +15m          │
│ • [SACRIFICE TO ALTAR]   │   └──────────────────────┘   │                              │
│                          │      [Soul Bar: 742/1000]    │ [STATUS: LISTENING TO RPC]   │
│                          │                              │                              │
├──────────────────────────┴──────────────────────────────┴──────────────────────────────┤
│                             CIRCULAR ECONOMY & LEADERBOARDS                            │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  ┌────────────────────────┐ │
│  │ Top Sacrificers (Karma) │  │ 30% Dividend Claim Vault │  │ Previous Reincarnations│ │
│  │ #1 0x3f...e1  184.2 pts │  │ Claimable: 0.084 ETH     │  │ Epoch #0: $GENESIS     │ │
│  │ #2 0x9a...7c  141.0 pts │  │ [CLAIM ETH DIVIDENDS]    │  │ Epoch #1: Pending...   │ │
│  └─────────────────────────┘  └──────────────────────────┘  └────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘

```

---

## 4. Component Technical Specifications

### 4.1 Global Header & Navigation (`components/Header.tsx`)
* **Network Guard:** Enforces Robinhood Chain L2 (Chain ID validation). Prompts user with `switchChain()` if connected to an unsupported network.
* **Status Pill Indicator:**
  * `ACTIVE_BURNING` (Green Pulse): Normal operation; Altar accepts deposits.
  * `EPOCH_EVALUATING` (Amber Pulse): Target reached or timer expired; taking leaderboard snapshot.
  * `REBIRTH_MINTING` (Purple Pulse): Relayer executing `launchAndBuy` on Pons Factory.
* **Wallet Button:** Custom RainbowKit styled trigger with truncated address (`0x12...34ab`) and native ETH balance display.

### 4.2 Global Metric Strip (`components/MetricStrip.tsx`)
* **Data Ingestion:** Real-time subscription to Firestore doc `/altar_state/current`.
* **Sub-Metrics Displayed:**
  * **Active Epoch:** Current iteration index (`#1`, `#2`, etc.).
  * **Death Clock:** 48-hour synchronized countdown timer formatted as `HH:MM:SS`.
  * **Global Soul Weight:** Visual gauge and numerical ratio (`742.8 / 1000.0 SW`).
  * **Rebirth Treasury:** Accumulated 40% fee allocation reserved for next token deployment.

### 4.3 The Necro-Pit Visualizer (`components/NecroPitCanvas.tsx`)
* **Technology:** 2D Canvas context running at requestAnimationFrame (60 FPS capped).
* **Graphic Behavior:**
  * **Base State:** Dark crimson and obsidian ember particles swirling around an altar basin.
  * **Particle Scaler:** Particle velocity, density, and color luminescence scale dynamically with `soul_weight_current / soul_weight_target`.
  * **Sacrifice Pulse Trigger:** When a new document enters `/sacrifices`, triggers an immediate shockwave explosion animation across the canvas.

### 4.4 Incinerator Form (`components/IncineratorForm.tsx`)
* **Token Scanner:** Scans user wallet for non-zero ERC-20 balances with zero or sub-$100 liquidity.
* **Input Parameters:**
  * `tokenAddress`: Validated 42-character EVM address with checksum.
  * `amount`: BigInt string with token decimals parsing via `viem`.
* **Stateful Transaction Steps:**
  1. **Idle State:** User inputs custom contract address or selects detected dead token.
  2. **Check Allowance:** Verifies if `IERC20.allowance(user, AltarContract) >= amount`.
  3. **Step 1 (Approve):** Executes `IERC20.approve`. Shows pending status and block confirmation.
  4. **Step 2 (Sacrifice):** Executes `ThanatosAltar.sacrificeToken(tokenAddress, amount)`.
  5. **Completion:** Dispatches optimistic event to local telemetry, resets form, and plays burn animation.

### 4.5 Real-Time Telemetry Terminal (`components/TelemetryTerminal.tsx`)
* **Data Stream:** Listens to `/sacrifices` collection ordered by `timestamp desc` (limit 30).
* **Visual Theme:** Retro CRT monitor style (scanline overlays, glowing text, monospace font).
* **Log Structure:**
  ```text
  [HH:MM:SS] > WALLET: 0x8a...4b | BURNED: 10,000,000 $DEADFROG | SOUL WT: +4.2 | CLOCK: +15m

```

* **Auto-Scroll Behavior:** Smoothly scrolls to the top log entry upon receipt of new real-time snapshot data.

### 4.6 Karma Leaderboard & Snapshot Engine (`components/Leaderboard.tsx`)

* **Ranking Metrics:** Displays Top 50 burner wallets sorted by `total_karma desc`.
* **Tier Tags:**
* **Rank 1–3:** `Arch-Necromancer` (Highest airdrop weighting for next $PHOENIX launch).
* **Rank 4–10:** `Soul Reaper`
* **Rank 11–50:** `Acolyte`


* **Real-Time Highlighting:** Highlights the active user's connected wallet row and displays their percentile rank.

### 4.7 Circular Economy & Dividend Claim Vault (`components/DividendModule.tsx`)

* **Visual 30/40/30 Breakdown:** Interactive pie or bar diagram showing real-time allocation of all 0.95% fees.
* **Claim Interface:**
* Displays user's calculated share of the 30% dividend pool based on staked $THANATOS + Karma points.
* Calls `ThanatosFeeSplitter.claimDividends()` via `useWriteContract`.
* Displays lifetime ETH rewards distributed across the community.



---

## 5. State Management & Real-Time Data Flow

```
                                  ┌───────────────────────────┐
                                  │   Firestore /altar_state  │
                                  └─────────────┬─────────────┘
                                                │ (onSnapshot)
                                                ▼
┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
│   Firestore /sacrifices   │ ───► │   Zustand Protocol Store  │ ◄─── │     Wagmi / Viem Hook     │
│   (Real-time Ingest)      │      │   (useThanatosStore)      │      │     (Wallet & Contracts)  │
└───────────────────────────┘      └─────────────┬─────────────┘      └───────────────────────────┘
                                                │
                                                ▼
                               ┌─────────────────────────────────┐
                               │   Subscribed React Components   │
                               │   • <NecroPitCanvas/>          │
                               │   • <MetricStrip/>             │
                               │   • <TelemetryTerminal/>       │
                               │   • <DividendModule/>          │
                               └─────────────────────────────────┘

```

---

## 6. Directory & File Structure

```
thanatos-frontend/
├── public/
│   ├── audio/
│   │   ├── incinerate.mp3
│   │   └── ambient-hum.mp3
│   └── icons/
│       └── thanatos-sigil.svg
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout with Web3Providers & Fonts
│   │   ├── page.tsx                  # Main single-page dashboard
│   │   ├── archive/
│   │   │   └── page.tsx              # Historical record of all Rebirth Tokens
│   │   └── globals.css               # Scanline CRT styling & Tailwind base
│   ├── components/
│   │   ├── Header.tsx                # Wallet connect & status indicator
│   │   ├── MetricStrip.tsx           # Global statistics bar
│   │   ├── NecroPitCanvas.tsx        # 2D/3D interactive particle engine
│   │   ├── IncineratorForm.tsx       # Approval & sacrifice input box
│   │   ├── TelemetryTerminal.tsx     # Live streaming console
│   │   ├── Leaderboard.tsx           # Top 50 Karma rankings
│   │   └── DividendModule.tsx        # 30/40/30 split & claim interface
│   ├── config/
│   │   ├── contracts.ts              # ABI definitions & deployed addresses
│   │   ├── firebase.ts               # Firebase client initialization
│   │   └── wagmi.ts                  # Chain definitions & connector config
│   ├── hooks/
│   │   ├── useAltarState.ts          # Firestore listener for global metrics
│   │   ├── useSacrificeLogs.ts       # Firestore listener for terminal logs
│   │   └── useDividendClaim.ts       # Contract read/write hooks for ETH yield
│   └── store/
│       └── useThanatosStore.ts       # Central Zustand application store
├── tailwind.config.js
├── tsconfig.json
└── package.json

```

---

## 7. Performance & Non-Functional Requirements

1. **Responsiveness:** Fluid scaling across ultra-wide desktop (1440p+), standard laptop (1080p), tablet, and mobile displays.
2. **GPU Optimization:** Particle count in `NecroPitCanvas.tsx` automatically throttles to 30% capacity if device frame rate drops below 45 FPS or if running on mobile viewports.
3. **Optimistic Updates:** Terminal logs must immediately append the pending transaction upon receipt of the client-side hash, transitioning to confirmed status on-chain.
4. **Latency Target:** Initial page load under 1.5s; real-time Firestore sync propagation delay under 400ms.

```

```