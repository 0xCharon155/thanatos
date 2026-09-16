/* ABI encoding without a library. Selector = keccak256(signature)[:4]. */
window.ABI = (() => {
  const SEL = {
    // ThanatosAltarV2
    sacrifice: "616d566e",        // sacrifice(address,uint256,uint16,uint64,bytes) payable
    claim: "4e71d92d",            // claim()
    claimable: "402914f5",        // claimable(address)
    altarFee: "ef175ca0", epoch: "900cf0cf", epochEndsAt: "b0dd24c8",
    soulWeight: "5f28beb9", soulTarget: "63fef916", soulOf: "282de01f",
    totalDistributed: "efca2eed", phase: "b1c9fe6e", treasury: "61d027b3", buybackReserve: "ff909560",
    verifiedKarma: "e0da0a88", unverifiedKarma: "0c3be1cd", unverifiedCap: "ce997fc6",
    // Reincarnator
    airdropOf: "f222de98",        // airdropOf(uint256,address)
    claimed: "120aa877",          // claimed(uint256,address)
    claimAirdrop: "e30d4440",     // claimAirdrop(uint256)
    // ERC-20 (and the Pons fee escrow's balanceOf)
    approve: "095ea7b3", allowance: "dd62ed3e", balanceOf: "70a08231", decimals: "313ce567", symbol: "95d89b41",
  };
  const ZERO = "0x0000000000000000000000000000000000000000";
  const isAddr = a => /^0x[0-9a-fA-F]{40}$/.test(a || "");
  const isSet = a => isAddr(a) && a !== ZERO;
  const padAddr = a => a.toLowerCase().replace("0x", "").padStart(64, "0");
  const padUint = n => BigInt(n).toString(16).padStart(64, "0");
  const padBytes = hex => {           // dynamic bytes: the caller writes the offset
    const h = (hex || "0x").replace("0x", ""); const len = h.length / 2;
    return padUint(len) + h.padEnd(Math.ceil(h.length / 64) * 64, "0");
  };
  const enc = (sel, ...args) => "0x" + SEL[sel] + args.join("");
  // sacrifice(token, amount, multBps, expiry, sig): 4 static words + 1 dynamic
  const encSacrifice = (token, amount, multBps, expiry, sig) =>
    "0x" + SEL.sacrifice + padAddr(token) + padUint(amount) + padUint(multBps) + padUint(expiry) + padUint(5 * 32) + padBytes(sig);
  const decUint = hex => (!hex || hex === "0x") ? 0n : BigInt(hex);
  const bytesToStr = h => { let s = ""; for (let i = 0; i < h.length; i += 2) { const c = parseInt(h.substr(i, 2), 16); if (c) s += String.fromCharCode(c); } try { return decodeURIComponent(escape(s)); } catch { return s; } };
  const decStr = hex => { if (!hex || hex === "0x") return ""; const h = hex.slice(2); if (h.length === 64) return bytesToStr(h).replace(/\0+$/, "");
    const len = Number(BigInt("0x" + h.slice(64, 128))); return bytesToStr(h.slice(128, 128 + len * 2)); };
  const fmt = (n, dec = 18, digits = 4) => { n = BigInt(n); const neg = n < 0n; if (neg) n = -n; const base = 10n ** BigInt(dec);
    const whole = n / base, frac = (n % base).toString().padStart(dec, "0").slice(0, digits);
    return (neg ? "-" : "") + whole.toLocaleString("en-US") + (digits ? "." + frac : ""); };
  const parse = (s, dec = 18) => { const [w, f = ""] = String(s).trim().replace(/,/g, "").split(".");
    if (!/^\d*$/.test(w) || !/^\d*$/.test(f)) return null; return BigInt(w || "0") * 10n ** BigInt(dec) + BigInt((f + "0".repeat(dec)).slice(0, dec) || "0"); };
  const wei = eth => parse(eth, 18);
  const karma = w => Number(w) / 1e18;   // on-chain karma is scaled by 1e18
  return { SEL, ZERO, isAddr, isSet, padAddr, padUint, enc, encSacrifice, decUint, decStr, fmt, parse, wei, karma };
})();
