/* ═══════════════════════════════════════════════════════════════════════
   THANATOS — site configuration. The only file to edit before deploy.
   ═══════════════════════════════════════════════════════════════════════ */
window.THANATOS = {
  mode: "live",                       // ?demo=1 in the URL → example data (shown with a ribbon)
  chain: { id: 4663, hex: "0x1237", name: "Robinhood Chain", currency: "ETH",
           rpc: "https://rpc.mainnet.chain.robinhood.com", explorer: "https://robinhoodchain.blockscout.com" },

  // ── fill after deploy (see thanatos-backend/scripts/deployContracts.ts output) ──
  altar: "0x0000000000000000000000000000000000000000",          // ThanatosAltarV2
  reincarnator: "0x0000000000000000000000000000000000000000",   // Reincarnator (airdrop claims)
  feeEscrow: "0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e",      // Pons v2 fee escrow: creator revenue waits here until collect()
  token: "",                 // $THANATOS (Pons)
  voucherUrl: "",            // Cloud Function `voucher` — signs deadness vouchers
  verifiedSource: "",        // Blockscout "Verified" link
  audit: "",                 // audit link (empty = shows "unaudited")

  // Firestore event cache — public read through REST; written only by the indexer.
  firebase: { projectId: "thanatos-e440a", apiKey: "AIzaSyCAxeaogcwHp3hCO8vUfCwJnoYH1ytx00E" },

  // Displayed economics. The contract is the source of truth: once the altar is live,
  // fees, karma and split are read on-chain and override these.
  altarFeeEth: "0.0005",
  karma: { verified: 38, unverified: 5, unverifiedCap: 25, deadMult: 1.5 },
  split: { protocol: 20, feeShare: 30, seed: 40, buyback: 30 },
  sources: [
    ["0.0005 ETH", "altar fee per offering"],
    ["2.7%", "of every rebirth token's volume: 1% curve fee (creator side) + 2% creator tax, collected from the Pons escrow"],
    ["40%", "of each rebirth is reinvested as the next seed"],
  ],
  epoch: { minHours: 6, minTreasuryEth: "0.01", deadnessPct: 5 },

  links: { x: "https://x.com/ThanatosAltar", telegram: "", pons: "", dexscreener: "", github: "https://github.com/0xCharon155/thanatos" },
  pollMs: 12000,
};
