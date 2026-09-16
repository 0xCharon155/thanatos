/* ═══════════════════════════════════════════════════════════════════════
   THANATOS — site configuration. The only file to edit before deploy.
   ═══════════════════════════════════════════════════════════════════════ */
window.THANATOS = {
  mode: "live",                       // ?demo=1 in the URL → example data (shown with a ribbon)
  chain: { id: 4663, hex: "0x1237", name: "Robinhood Chain", currency: "ETH",
           rpc: "https://rpc.mainnet.chain.robinhood.com", explorer: "https://robinhoodchain.blockscout.com",
           // tried in order; the site moves to the next one when an endpoint is blocked or down
           rpcs: ["https://rpc.mainnet.chain.robinhood.com", "https://robinhood-rpc.publicnode.com", "https://robinhood.drpc.org", "https://rpc.ordofi.network"] },

  // ── fill after deploy (see thanatos-backend/scripts/deployContracts.ts output) ──
  altar: "0xA33c08FF354C5Fd91Ab2C30CCC2DbeFd8722d2a2",          // ThanatosAltarV2
  reincarnator: "0x961a81B937cD7a5aB649a4A985578c8fA4177fE3",   // Reincarnator (airdrop claims)
  feeEscrow: "0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e",      // Pons v2 fee escrow: creator revenue waits here until collect()
  token: "0x54fa89cE31A10a1e5Ef57734C6DB9eEc203B434F",                 // $THANATOS (Pons)
  voucherUrl: "https://us-central1-thanatos-e440a.cloudfunctions.net/voucher",            // Cloud Function `voucher` — signs deadness vouchers
  verifiedSource: "https://robinhoodchain.blockscout.com/address/0xA33c08FF354C5Fd91Ab2C30CCC2DbeFd8722d2a2?tab=contract",        // Blockscout "Verified" link
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

  links: { x: "https://x.com/ThanatosAltar", dev: "https://x.com/0xCharon155", telegram: "", pons: "https://www.ponsfamily.com/launchpad/0x54fa89cE31A10a1e5Ef57734C6DB9eEc203B434F", chart: "https://www.geckoterminal.com/robinhood/pools/0xA029Ee0a69ad3351a30aa071C18760825b96dd1C", github: "https://github.com/0xCharon155/thanatos" },
  pollMs: 12000,
};
