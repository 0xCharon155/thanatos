/* Data layer: Firestore REST (▤ indexed) + JSON-RPC (◆ on-chain) + demo. */
window.Data = (() => {
  const CFG = window.THANATOS, C = CFG.chain, A = window.ABI;
  const DEMO = new URLSearchParams(location.search).get("demo") === "1" || CFG.mode === "demo" || window.THANATOS_FORCE_DEMO === true;
  const FS = `https://firestore.googleapis.com/v1/projects/${CFG.firebase.projectId}/databases/(default)/documents`;
  const PHASES = ["burning", "evaluating"];
  const AIRDROP_LOOKBACK = 20;

  const val = v => { if (v == null) return null;
    if ("stringValue" in v) return v.stringValue; if ("integerValue" in v) return Number(v.integerValue); if ("doubleValue" in v) return v.doubleValue;
    if ("booleanValue" in v) return v.booleanValue; if ("timestampValue" in v) return Date.parse(v.timestampValue); if ("nullValue" in v) return null;
    if ("arrayValue" in v) return (v.arrayValue.values || []).map(val); if ("mapValue" in v) return doc({ fields: v.mapValue.fields }); return null; };
  const doc = d => { const o = {}; for (const [k, v] of Object.entries(d.fields || {})) o[k] = val(v); if (d.name) o._id = d.name.split("/").pop(); return o; };
  async function fsGet(path, q = "") {
    const r = await fetch(`${FS}/${path}?key=${CFG.firebase.apiKey}${q}`, { cache: "no-store" });
    if (r.status === 404) return null; if (!r.ok) throw new Error(`Firestore ${r.status}`);
    const j = await r.json(); return j.documents ? j.documents.map(doc) : (j.fields ? doc(j) : null);
  }
  async function fsCount(collectionId, field, value) {
    const body = { structuredAggregationQuery: { structuredQuery: { from: [{ collectionId }], where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { integerValue: String(value) } } } }, aggregations: [{ count: {}, alias: "n" }] } };
    const r = await fetch(`${FS}:runAggregationQuery?key=${CFG.firebase.apiKey}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return 0; const j = await r.json(); return Number(j?.[0]?.result?.aggregateFields?.n?.integerValue ?? 0);
  }
  let id = 1, rpcIdx = 0;
  const RPCS = C.rpcs && C.rpcs.length ? C.rpcs : [C.rpc];
  // Rotates to the next endpoint on transport failures (blocked region, outage, rate limit); a
  // JSON-RPC error for a valid call (e.g. a revert) is returned as-is.
  async function rpc(method, params = []) {
    let lastErr;
    for (let i = 0; i < RPCS.length; i++) {
      const url = RPCS[(rpcIdx + i) % RPCS.length];
      try {
        const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: id++, method, params }) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (j.error && (j.error.code === -32601 || j.error.code === -32603 || /not (found|supported|available)/i.test(j.error.message || ""))) throw new Error(j.error.message);
        rpcIdx = (rpcIdx + i) % RPCS.length;
        if (j.error) throw Object.assign(new Error(j.error.message || "rpc error"), { rpcError: true });
        return j.result;
      } catch (e) { if (e.rpcError) throw e; lastErr = e; }
    }
    throw Object.assign(lastErr || new Error("rpc unreachable"), { rpcDown: true });
  }
  const rpcUrl = () => RPCS[rpcIdx];
  const call = (to, data) => rpc("eth_call", [{ to, data }, "latest"]);
  const hasCode = async a => A.isSet(a) && (await rpc("eth_getCode", [a, "latest"])) !== "0x";
  const ms = t => (t > 1e11 ? t : t * 1000);

  // altar_state/current is a cache of contract views written by the indexer, plus the daemon's status.
  const shapeState = s => ({
    epoch: Number(s?.reincarnation_epoch ?? 1),
    phase: PHASES[Number(s?.phase ?? 0)] || "burning",
    status: String(s?.status || ""),
    soul: Number(s?.soul_weight_current ?? 0), soulTarget: Number(s?.soul_weight_target ?? 1000),
    endsAt: s?.death_clock_ends_at ? ms(Number(s.death_clock_ends_at)) : 0,
    treasuryEth: Number(s?.treasury_eth ?? 0), buybackReserveEth: Number(s?.buyback_reserve_eth ?? 0), distributedEth: Number(s?.total_distributed_eth ?? 0),
    totalSacrifices: 0, updatedAt: Number(s?.last_updated ?? 0) ? ms(Number(s.last_updated)) : 0,
  });
  const shapeEv = d => ({ id: d._id, ts: d.timestamp ? ms(Number(d.timestamp)) : 0, kind: "offer", epoch: Number(d.epoch ?? 0), wallet: d.user_address || "", symbol: d.token_symbol || "?",
    amount: d.raw_amount != null ? Number(A.fmt(BigInt(d.raw_amount), d.token_decimals ?? 18, 0).replace(/,/g, "")) : 0,
    soul: Number(d.karma ?? 0), verified: d.verified ? "verified" : "base", tx: d.tx_hash || "", token: d.token_address || "" });
  const shapeLb = (d, epoch) => ({ wallet: d._id, karma: Number(d.lifetime_karma ?? 0), epochKarma: Number(d.epoch_karma?.[epoch] ?? 0), burns: Number(d.burn_count ?? 0) });
  const shapeRe = (d, ep) => ({ epoch: Number(d.epoch ?? 0), name: d.token_name || "", symbol: d.token_symbol || "?", token: d.token_address || "", tx: d.factory_tx_hash || ep?.rebirth_tx || "",
    soul: Number(ep?.soul_weight ?? 0), seededEth: Number(ep?.seeded_eth ?? 0), feeShareEth: Number(ep?.fee_share_eth ?? 0), buybackEth: Number(ep?.buyback_eth ?? 0),
    ts: d.created_at ? ms(Number(d.created_at)) : (ep?.reborn_at ? ms(Number(ep.reborn_at)) : 0) });

  async function indexed() {
    if (DEMO) return demo();
    const [s, ev, lb, re, eps] = await Promise.all([
      fsGet("altar_state/current").catch(() => null),
      fsGet("sacrifices", "&orderBy=timestamp%20desc&pageSize=40").catch(() => []),
      fsGet("leaderboard", "&orderBy=lifetime_karma%20desc&pageSize=25").catch(() => []),
      fsGet("reincarnations", "&orderBy=epoch%20desc&pageSize=50").catch(() => []),
      fsGet("epochs", "&pageSize=100").catch(() => []),
    ]);
    const state = shapeState(s), byEpoch = Object.fromEntries((eps || []).map(e => [Number(e.epoch ?? e._id), e]));
    state.totalSacrifices = s ? await fsCount("sacrifices", "epoch", state.epoch).catch(() => 0) : 0;
    return { state, events: (ev || []).map(shapeEv), leaderboard: (lb || []).map(d => shapeLb(d, state.epoch)),
      reincarnations: (re || []).filter(d => d.token_address).map(d => shapeRe(d, byEpoch[Number(d.epoch)])), epochs: byEpoch, fetchedAt: Date.now(), demo: false, ok: !!s };
  }

  const AIR = new Map();   // `${wallet}:${epoch}` → { amount, claimed }; settled entries never change
  async function airdrops(account, epoch) {
    if (!account || !A.isSet(CFG.reincarnator) || epoch < 2) return [];
    const out = [];
    for (let e = epoch - 1; e >= Math.max(1, epoch - AIRDROP_LOOKBACK); e--) {
      const k = `${account.toLowerCase()}:${e}`; let v = AIR.get(k);
      if (!v || (v.amount > 0n && !v.claimed)) {
        const [amt, cl] = await Promise.all([call(CFG.reincarnator, A.enc("airdropOf", A.padUint(e), A.padAddr(account))).catch(() => "0x"), call(CFG.reincarnator, A.enc("claimed", A.padUint(e), A.padAddr(account))).catch(() => "0x")]);
        v = { amount: A.decUint(amt), claimed: A.decUint(cl) === 1n }; AIR.set(k, v);
      }
      if (v.amount > 0n && !v.claimed) out.push({ epoch: e, amount: v.amount });
    }
    return out;
  }
  const forgetAirdrop = (account, epoch) => AIR.delete(`${account.toLowerCase()}:${epoch}`);

  async function onchain(account) {
    if (DEMO) { const now = Date.now(); return { altarLive: true, tokenLive: true, block: 18204113, treasuryWei: A.wei("0.4183"), buybackReserveWei: A.wei("0.0912"), uncollectedWei: A.wei("0.0134"), claimable: A.wei("0.0412"), totalDistributed: A.wei("1.2904"),
      epoch: 7, endsAt: now + (14 * 3600 + 17 * 60 + 9) * 1000, soul: 2418, soulTarget: 3815, phase: "burning", altarFeeWei: A.wei("0.0005"), soulOf: 118, karma: { verified: 38, unverified: 5, unverifiedCap: 25 },
      airdrops: account ? [{ epoch: 6, amount: 41_200_000n * 10n ** 18n }] : [], demo: true }; }
    const out = { altarLive: false, tokenLive: false, rpcDown: false, block: 0, treasuryWei: 0n, buybackReserveWei: 0n, uncollectedWei: 0n, claimable: 0n, totalDistributed: 0n, epoch: null, endsAt: 0, soul: null, soulTarget: null, phase: null,
      altarFeeWei: A.wei(CFG.altarFeeEth), soulOf: 0, karma: { ...CFG.karma }, airdrops: [] };
    try { out.block = Number(await rpc("eth_blockNumber")); } catch (e) { if (e.rpcDown) { out.rpcDown = true; return out; } }
    try { out.altarLive = await hasCode(CFG.altar); } catch (e) { if (e.rpcDown) { out.rpcDown = true; return out; } }
    try { out.tokenLive = await hasCode(CFG.token); } catch {}
    if (!out.altarLive) return out;
    const rd = async (sel, ...args) => A.decUint(await call(CFG.altar, A.enc(sel, ...args)).catch(() => "0x"));
    const [fee, ep, ends, soul, tgt, ph, dist, tre, res, kv, ku, kc] = await Promise.all([rd("altarFee"), rd("epoch"), rd("epochEndsAt"), rd("soulWeight"), rd("soulTarget"), rd("phase"), rd("totalDistributed"), rd("treasury"), rd("buybackReserve"), rd("verifiedKarma"), rd("unverifiedKarma"), rd("unverifiedCap")]);
    if (fee > 0n) out.altarFeeWei = fee;
    out.epoch = Number(ep); out.endsAt = Number(ends) * 1000; out.soul = A.karma(soul); out.soulTarget = A.karma(tgt); out.phase = PHASES[Number(ph)] || "burning";
    out.totalDistributed = dist; out.treasuryWei = tre; out.buybackReserveWei = res;
    if (kv > 0n) out.karma = { verified: A.karma(kv), unverified: A.karma(ku), unverifiedCap: A.karma(kc) };
    try { out.uncollectedWei = A.decUint(await call(CFG.feeEscrow, A.enc("balanceOf", A.padAddr(CFG.altar)))); } catch {}
    if (account) { out.claimable = await rd("claimable", A.padAddr(account)); out.soulOf = A.karma(await rd("soulOf", A.padAddr(account))); out.airdrops = await airdrops(account, out.epoch).catch(() => []); }
    return out;
  }

  // Token + deadness. The voucher endpoint answers dead / alive / unknown and signs dead and alive.
  async function token(addr, account) {
    if (!A.isAddr(addr)) return null;
    if (DEMO) return { live: true, symbol: "GRAVE", decimals: 18, balance: 4_120_000n * 10n ** 18n, allowance: 0n,
      deadness: { status: "verified", multBps: 15000, voucher: { expiry: Math.floor(Date.now() / 1000) + 3600, sig: "0x" } } };
    if (!(await hasCode(addr))) return { live: false };
    const [sym, dec] = await Promise.all([call(addr, A.enc("symbol")).catch(() => "0x"), call(addr, A.enc("decimals")).catch(() => "0x")]);
    const decimals = Number(A.decUint(dec) || 18n); let balance = 0n, allowance = 0n;
    if (account) { balance = A.decUint(await call(addr, A.enc("balanceOf", A.padAddr(account))).catch(() => "0x"));
      if (A.isSet(CFG.altar)) allowance = A.decUint(await call(addr, A.enc("allowance", A.padAddr(account), A.padAddr(CFG.altar))).catch(() => "0x")); }
    let deadness = { status: "unverifiable", multBps: 0, voucher: null, reason: CFG.voucherUrl ? "" : "verifier not configured" };
    if (CFG.voucherUrl) { try { const r = await fetch(`${CFG.voucherUrl}?token=${addr}`); const v = await r.json();
      if (v && v.sig) deadness = { status: v.status === "dead" ? "verified" : "alive", multBps: Number(v.multBps), voucher: { expiry: Number(v.expiry), sig: v.sig } };
      else deadness.reason = v?.reason || "no market history"; } catch { deadness.reason = "verifier unreachable"; } }
    return { live: true, symbol: A.decStr(sym) || "?", decimals, balance, allowance, deadness };
  }

  function demo() {
    const now = Date.now(), W = ["0x7c3e…9a41", "0x1b90…e2d7", "0xd4a2…0f66", "0x93f1…b8c0", "0x5e07…44aa", "0x9e1c…4b2a", "0x77ad…c913"];
    const t = (i) => now - i * 1000;
    const events = [
      { ts: t(41), kind: "offer", wallet: "0x9e1c…4b2a", symbol: "GRAVE", amount: 4_120_000, soul: 66, verified: "verified", tx: "0x" + "9e".repeat(32) },
      { ts: t(149), kind: "offer", wallet: "0x77ad…c913", symbol: "PUMPKIN", amount: 900_000, soul: 5, verified: "base", tx: "0x" + "77".repeat(32) },
      { ts: t(410), kind: "offer", wallet: "0x1b90…e2d7", symbol: "ZULU", amount: 12_000_000, soul: 67, verified: "verified", tx: "0x" + "1b".repeat(32) },
      { ts: t(520), kind: "offer", wallet: "0xd4a2…0f66", symbol: "EMILE", amount: 66_000, soul: 64, verified: "verified", tx: "0x" + "d4".repeat(32) },
      { ts: t(611), kind: "offer", wallet: "0x93f1…b8c0", symbol: "BANANA", amount: 1_337_000, soul: 5, verified: "base", tx: "0x" + "93".repeat(32) },
    ];
    const leaderboard = [[W[0], 1204, 19, 133], [W[1], 911, 11, 66], [W[2], 537, 8, 0], [W[3], 312, 5, 57], [W[4], 286, 4, 0], ["0xa0c3…8e12", 118, 1, 118]].map(([wallet, karma, burns, epochKarma]) => ({ wallet, karma, burns, epochKarma }));
    const reincarnations = [
      { epoch: 6, symbol: "REVENANT", token: "0x3fd1" + "c0".repeat(17) + "c0a9", tx: "0x" + "11".repeat(32), soul: 3_104, seededEth: 0.1408, feeShareEth: 0.1056, buybackEth: 0.1056, ts: now - 5 * 864e5 },
      { epoch: 5, symbol: "MORROW", token: "0x9ab4" + "17".repeat(17) + "17e3", tx: "0x" + "22".repeat(32), soul: 2_487, seededEth: 0.1172, feeShareEth: 0.0879, buybackEth: 0.0879, ts: now - 12 * 864e5 },
      { epoch: 4, symbol: "ASHBORN", token: "0x61e8" + "d2".repeat(17) + "d2f5", tx: "0x" + "33".repeat(32), soul: 1_990, seededEth: 0.0932, feeShareEth: 0.0699, buybackEth: 0.0699, ts: now - 19 * 864e5 },
      { epoch: 3, symbol: "WRAITH", token: "0x77" + "77".repeat(19), tx: "0x" + "44".repeat(32), soul: 1_592, seededEth: 0.062, feeShareEth: 0.0465, buybackEth: 0.0465, ts: now - 26 * 864e5 },
      { epoch: 2, symbol: "MOTH", token: "0x55" + "55".repeat(19), tx: "0x" + "55".repeat(32), soul: 1_274, seededEth: 0.041, feeShareEth: 0.031, buybackEth: 0.031, ts: now - 33 * 864e5 },
      { epoch: 1, symbol: "HOLLOW", token: "0x33" + "33".repeat(19), tx: "0x" + "66".repeat(32), soul: 1_019, seededEth: 0.02, feeShareEth: 0.015, buybackEth: 0.015, ts: now - 40 * 864e5 },
    ];
    return { state: { epoch: 7, phase: "burning", status: "BURNING", soul: 2418, soulTarget: 3815, endsAt: now + (14 * 3600 + 17 * 60 + 9) * 1000, treasuryEth: 0.4183, buybackReserveEth: 0.0912, distributedEth: 1.2904,
      totalSacrifices: 41, updatedAt: now - 14000 }, events, leaderboard, reincarnations, epochs: {}, fetchedAt: now, demo: true, ok: true };
  }
  return { DEMO, rpc, rpcUrl, call, indexed, onchain, token, hasCode, forgetAirdrop };
})();
