/* Altar page — render + interaksi. Microcopy dari voice.md, timing dari motion-timing. */
(() => {
  const CFG = window.THANATOS, A = window.ABI, D = window.Data, Wl = window.Wallet, C = CFG.chain, ic = window.icon;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const short = a => a && a.length > 13 ? a.slice(0, 6) + "…" + a.slice(-4) : (a || "—");
  const eth = (wei, d = 4) => A.fmt(wei, 18, d);
  const n0 = n => Math.round(n).toLocaleString("en-US");
  const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TW = new Map();   // el → nilai terakhir, untuk count-up
  function tween(el, to, fmt, ms = 600) {
    if (!el) return; const from = TW.has(el) ? TW.get(el) : 0; TW.set(el, to);
    if (REDUCE || from === to || !isFinite(from) || !isFinite(to)) { el.innerHTML = fmt(to); return; }
    const t0 = performance.now(); const step = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.innerHTML = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
  }
  const roman = n => { const m = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]]; let s = ""; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s || "—"; };
  const ex = (kind, v) => `${C.explorer}/${kind}/${v}`;
  const SRC = { chain: '<span class="src chain"><b>◆</b>on-chain</span>', idx: '<span class="src idx"><b>▤</b>indexed</span>', none: "" };
  const altarSet = A.isAddr(CFG.altar) && CFG.altar !== A.ZERO;
  let IDX = null, CH = null, ME = null, WOK = false, TOK = null, TICK = null, stage = "idle", firstPaint = true;

  // ── ikon statis ──────────────────────────────────────────────────────
  const put = (id, html) => { const e = $(id); if (e) e.innerHTML = html; };
  put("#brand-mark", ic("logo-monogram", "i xl")); put("#foot-brand", ic("logo-monogram", "i"));
  put("#ico-inc", ic("flame")); put("#ico-tele", ic("terminal")); put("#ico-crown", ic("crown")); put("#ico-vault", ic("vault")); put("#ico-reb", ic("rebirth"));
  put("#ico-ext", ic("external-link", "i s")); put("#ico-sigil", ic("sigil-altar", "i")); put("#ico-shield", ic("shield-check", "i")); put("#net-glyph", ic("network")); put("#wallet-ico", ic("wallet"));
  put("#hero-wm", ic("wordmark", "i") + $("#hero-wm").innerHTML); put("#climax-mark", ic("logo-monogram", "i"));
  $("#ico-sigil").querySelector("svg").style.cssText = "width:40px;height:40px"; $("#ico-shield").querySelector("svg").style.cssText = "width:28px;height:28px";

  // ── toasts (voice.md: sent / accepted / failed / claimed / rebirth; max 3; 8s; failed tidak hilang) ──
  function toast(kind, html, action) {
    const box = $("#toasts"); while (box.children.length >= 3) box.firstChild.remove();
    const t = document.createElement("div"); t.className = "toast " + kind;
    const g = kind === "sent" ? '<span class="spin"></span>' : kind === "ok" ? ic("state-burning") : kind === "err" ? ic("warning") : ic("state-rebirth");
    t.innerHTML = `${g}<div>${html}</div>${action || ""}`; box.appendChild(t);
    if (kind !== "err") setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 130); }, 8000);
    return t;
  }

  // ── keadaan gabungan: on-chain menang atas indexed ────────────────────
  function S() {
    const s = IDX?.state || {}, live = !!CH?.altarLive;
    return { live, phase: live && CH.phase ? CH.phase : (s.phase || "burning"), epoch: live && CH.epoch ? CH.epoch : (s.epoch || 1),
      soul: live && CH.soul != null ? CH.soul : (s.soul || 0), soulTarget: live && CH.soulTarget ? CH.soulTarget : (s.soulTarget || 1000),
      endsAt: live && CH.endsAt ? CH.endsAt : (s.endsAt || 0), src: live ? "chain" : "idx" };
  }
  const PHASE_LABEL = { dormant: "Dormant", burning: "Burning", evaluating: "Evaluating", rebirth: "Rebirth" };

  function renderHeader() {
    const st = S(), ph = st.live ? st.phase : "dormant";
    const p = $("#state-pill"); p.className = "pill " + ph; p.querySelector(".t").textContent = PHASE_LABEL[ph]; $("#state-glyph").innerHTML = ic("state-" + ph);
    const np = $("#net-pill"); np.className = "pill net " + (ME && !WOK ? "warn" : ""); np.querySelector(".t").textContent = ME && !WOK ? "Wrong network" : C.name;
    $("#btn-switch").hidden = !(ME && !WOK);
    const b = $("#btn-connect"); $("#btn-connect-t").textContent = ME ? short(ME) : "Connect wallet"; b.classList.toggle("ember", !ME); b.title = ME ? "Disconnect" : "";
    const r = $("#ribbon"); let txt = "", cls = "amber";
    if (D.DEMO) { txt = "Preview with example data. Nothing below is live."; cls = "violet"; }
    else if (!altarSet) txt = "The altar is not consecrated yet — the contract has not been deployed.";
    else if (!st.live) txt = `No contract found at ${short(CFG.altar)} on ${C.name}. Check config.js.`;
    else if (st.phase === "evaluating") txt = "The altar is sealed. Souls are being counted. No offerings are accepted.";
    else if (IDX?.state?.status === "STAGING" || IDX?.state?.status === "REBORN") { txt = `Epoch ${roman(st.epoch)} is being reborn. The next epoch opens after the launch.`; cls = "violet"; }
    else if (IDX?.state?.status === "EXTENDED") txt = `The clock ran out with less than ${CFG.epoch.minTreasuryEth} ETH in the treasury, so the epoch was extended by ${CFG.epoch.minHours} hours. Offerings continue.`;
    else if (IDX?.state?.updatedAt && Date.now() - IDX.state.updatedAt > 4 * 60e3) txt = `Indexer is ${Math.round((Date.now() - IDX.state.updatedAt) / 60e3)} min behind. ▤ numbers may lag ◆ on-chain values.`;
    r.hidden = !txt; r.className = "ribbon " + cls; $("#ribbon-t").textContent = txt; $("#ribbon-ico").innerHTML = ic(cls === "violet" ? "state-rebirth" : "warning");
    if (D.DEMO && !$("#btn-demo-rebirth")) { const b = document.createElement("button"); b.type = "button"; b.id = "btn-demo-rebirth"; b.className = "btn sm"; b.textContent = "Play the rebirth"; b.addEventListener("click", () => playRebirth(true)); r.appendChild(b); }
  }

  function renderMetrics() {
    const st = S(), s = IDX?.state || {};
    const epEl = $("#m-epoch"), epTxt = st.live || IDX ? roman(st.epoch) : "—";
    if (epEl.textContent !== epTxt) { epEl.classList.add("xf"); setTimeout(() => { epEl.textContent = epTxt; $("#altar-epoch").textContent = epTxt; epEl.classList.remove("xf"); }, REDUCE ? 0 : 200); }
    $("#m-epoch-sub").textContent = s.beganAt ? "began " + new Date(s.beganAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC" : "—";
    $("#m-epoch-src").innerHTML = SRC[st.src];
    tween($("#m-soul"), st.soul, v => `${n0(v)}<small>/ ${n0(st.soulTarget)}</small>`); $("#m-soul-src").innerHTML = SRC[st.src];
    const pct = Math.min(100, 100 * st.soul / (st.soulTarget || 1));
    requestAnimationFrame(() => { $("#m-soul-bar").style.width = pct + "%"; $("#soul-bar").style.width = pct + "%"; });
    tween($("#soul-k"), st.soul, v => `${n0(v)} / ${n0(st.soulTarget)}`); $("#soul-src").innerHTML = SRC[st.src];
    tween($("#sacs-n"), s.totalSacrifices || 0, v => n0(v)); $("#sacs-src").innerHTML = SRC.idx;
    if (!epEl.classList.contains("xf")) $("#altar-epoch").textContent = epTxt;
    const tw = CH?.treasuryWei || 0n;
    const treN = st.live ? Number(eth(tw, 6).replace(/,/g, "")) : (s.treasuryEth || 0);
    tween($("#m-tre"), treN, v => `${v.toFixed(4)}<small>ETH</small>`); $("#m-tre-src").innerHTML = st.live ? SRC.chain : SRC.idx;
    const parts = []; if (CH?.uncollectedWei > 0n) parts.push(`+${eth(CH.uncollectedWei, 4)} uncollected on Pons`); if (CH?.buybackReserveWei > 0n) parts.push(`${eth(CH.buybackReserveWei, 4)} buyback reserve`);
    $("#m-tre-sub").textContent = parts.join(" · ") || "altar fees + rebirth-token fees";
    // death clock: berdetak hanya kalau altar hidup (atau demo) dan sedang burning
    clearInterval(TICK); const mc = $("#m-clock"), hc = $("#hero-clock");
    if (st.live && st.endsAt && st.phase === "burning") { mc.classList.remove("off"); $("#m-clock-sub").textContent = IDX?.state?.status === "EXTENDED" ? "extended · treasury under minimum" : "until the altar seals";
      const tick = () => { let t = Math.max(0, Math.floor((st.endsAt - Date.now()) / 1000)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), x = t % 60;
        const txt = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`; mc.textContent = txt; hc.textContent = txt; hc.classList.remove("off"); mc.classList.add("tick"); setTimeout(() => mc.classList.remove("tick"), 150); };
      tick(); TICK = setInterval(tick, 1000); }
    else if (st.live && st.phase === "evaluating") { mc.classList.remove("off"); hc.classList.remove("off"); mc.textContent = hc.textContent = "00:00:00"; $("#m-clock-sub").textContent = "sealed"; }
    else if (st.live && st.phase === "rebirth") { mc.classList.remove("off"); hc.classList.remove("off"); mc.textContent = hc.textContent = "REBORN"; $("#m-clock-sub").textContent = `epoch ${roman(st.epoch)} → ${roman(st.epoch + 1)}`; }
    else { mc.classList.add("off"); hc.classList.add("off"); mc.textContent = hc.textContent = "--:--:--"; $("#m-clock-sub").textContent = "until the altar seals"; }
    $("#m-clock-src").innerHTML = SRC[st.src];
    const ap = $("#altar-state-pill"), ph = st.live ? st.phase : "dormant"; ap.className = "pill " + ph; ap.querySelector(".t").textContent = PHASE_LABEL[ph]; $("#altar-state-glyph").innerHTML = ic("state-" + ph);
    window.Altar3D?.set(ph, pct / 100); window.Scribe?.set(ph === "burning" ? "idle" : ph);
  }

  let SEEN = null;
  function renderTelemetry() {
    const ev = IDX?.events || [], st = S(), live = $("#tele-live");
    // Scribe bereaksi hanya pada event yang BARU muncul sejak render terakhir
    if (window.Scribe) { const ids = new Set(ev.map(e => e.id || e.tx || e.ts)); if (SEEN) { const fresh = ev.filter(e => !SEEN.has(e.id || e.tx || e.ts)).slice(0, 3).reverse(); fresh.forEach((e, i) => setTimeout(() => window.Scribe.react(e.kind, e.verified), i * 1600)); } SEEN = ids; }
    if (!IDX) { live.className = "live off"; $("#tele-txt").textContent = "no feed"; }
    else if (!st.live) { live.className = "live off"; $("#tele-txt").textContent = "offline · no altar contract"; }
    else if (st.phase === "evaluating") { live.className = "live amber"; $("#tele-txt").textContent = "evaluating"; }
    else { live.className = "live"; $("#tele-txt").textContent = `live · ${n0(IDX.state.block || CH?.block || 0)}`; }
    const el = $("#term");
    if (!ev.length) { el.innerHTML = `<div class="l info"><span class="t">&gt;</span><span class="m">${st.live ? "awaiting the first offering" : "awaiting consecration · no altar contract on chain"}<span class="cur"></span></span></div>`; return; }
    const link = e => e.tx ? ` <a href="${ex("tx", e.tx)}" target="_blank" rel="noopener">${esc(short(e.tx))}</a>` : "";
    el.innerHTML = ev.slice(0, 40).map(e => { const t = new Date(e.ts).toTimeString().slice(0, 8); let cls = e.kind, m = "";
      if (e.kind === "offer") m = `offering ${e.pending ? "sent" : "accepted"} · ${n0(e.amount)} $${esc(e.symbol)} → ash · +${n0(e.soul)} soul${e.verified === "base" ? " (unverified, capped)" : ""} ${esc(short(e.wallet))}${link(e)}`;
      else if (e.kind === "fee") m = `altar fee ${e.eth} ETH → treasury ${esc(short(e.wallet))}${link(e)}`;
      else if (e.kind === "mint") m = `epoch reborn · $${esc(e.symbol)} minted${link(e)}`;
      else m = esc(e.text || "");
      if (e.pending) cls = "pending";
      return `<div class="l ${cls}"><span class="t">${t}</span><span class="m">${m}</span></div>`; }).join("");
    const tm = $("#term-mobile"); if (tm) tm.innerHTML = `<div class="term">${el.innerHTML}</div>`;
  }

  function renderLeaderboard() {
    const rows = IDX?.leaderboard || [], st = S(), el = $("#lb"); $("#lb-src").innerHTML = `<span class="src idx"><b>▤</b>lifetime</span>`;
    if (!rows.length) { el.innerHTML = `<div class="empty">${ic("tier-mortal")}<h4>No souls ranked</h4><p>Ranks appear after the first sacrifice is accepted. Top 3 become Arch-Necromancers.</p></div>`; return; }
    const me = ME ? rows.findIndex(r => r.wallet.toLowerCase() === ME.toLowerCase()) : -1;
    const row = (r, i) => { const tier = i < 3 ? "lich" : i < 10 ? "acolyte" : "mortal", mine = ME && r.wallet.toLowerCase() === ME.toLowerCase();
      return `<div class="r ${tier}${mine ? " me" : ""}"><span class="n">${String(i + 1).padStart(2, "0")}</span><span class="g">${ic("tier-" + tier)}</span><span class="w" title="${esc(r.wallet)}">${mine ? "you · " : ""}${esc(short(r.wallet))}</span><span class="k">${n0(r.karma)}${r.epochKarma > 0 ? `<small>+${n0(r.epochKarma)} this epoch</small>` : ""}</span></div>`; };
    const top = rows.slice(0, 8).map(row);
    if (me >= 8) top.push(row(rows[me], me)); else if (ME && me < 0 && CH?.soulOf) top.push(`<div class="r mortal me"><span class="n">—</span><span class="g">${ic("tier-mortal")}</span><span class="w">you · ${esc(short(ME))}</span><span class="k">${n0(CH.soulOf)}</span></div>`);
    el.innerHTML = top.join("") + `<div class="foot"><span>Arch-Necromancer top 3 · Soul Reaper top 10 · Acolyte</span><a href="archive.html">Archive ↗</a></div>`;
  }

  function renderVault() {
    const st = S(), cl = CH?.claimable || 0n, sp = CFG.split;
    $("#claimable").innerHTML = `${eth(cl)}<small>ETH</small>`; $("#claim-src").innerHTML = st.live ? SRC.chain : "";
    const b = $("#btn-claim"); b.className = "btn outline lg w" + (st.phase === "rebirth" ? " rebirth" : "");
    b.textContent = !st.live ? "Altar not consecrated" : st.phase === "evaluating" ? "Claim opens at rebirth" : cl > 0n ? `Claim ${eth(cl)} ETH` : "Nothing to claim";
    b.disabled = !(st.live && ME && WOK && cl > 0n && st.phase !== "evaluating");
    $("#claim-why").textContent = !st.live ? "" : !ME ? "Connect a wallet to see your fee share." : !WOK ? `Switch to ${C.name}.` : cl === 0n ? "Fee share appears after a rebirth in which you held soul weight." : "";
    const rest = (100 - sp.protocol) / 100;
    $("#split").innerHTML = `<i class="d" style="width:${sp.protocol}%"></i><i class="a" style="width:${sp.feeShare * rest}%"></i><i class="b" style="width:${sp.seed * rest}%"></i><i class="c" style="width:${sp.buyback * rest}%"></i>`;
    $("#split-legend").innerHTML = `<span><b>${sp.protocol}</b> protocol</span><span><b>${sp.feeShare}</b> fee share</span><span><b>${sp.seed}</b> seed</span><span><b>${sp.buyback}</b> buyback-burn</span>`;
    const res = CH?.buybackReserveWei || 0n;
    $("#reserve").textContent = `Fee share, seed and buyback are shares of the ${100 - sp.protocol}% that remains after the protocol cut.` + (res > 0n ? ` Buyback reserve: ${eth(res, 4)} ETH, burned once the route is live.` : "");
    const src = CFG.sources.slice(); if (st.live && CH?.altarFeeWei) src[0] = [eth(CH.altarFeeWei, 4).replace(/\.?0+$/, "") + " ETH", "altar fee per offering"];
    $("#sources").innerHTML = src.map(([k, v]) => `<b>${esc(k)}</b><span>${esc(v)}</span>`).join("");
    const air = CH?.airdrops || [], sym = e => IDX?.reincarnations?.find(r => r.epoch === e)?.symbol || `epoch ${roman(e)} token`;
    $("#airdrops").innerHTML = air.length ? `<span class="label">Your airdrops</span><div class="air">${air.map(a => `<div class="r"><span>Epoch ${roman(a.epoch)}</span><b>${n0(Number(A.fmt(a.amount, 18, 0).replace(/,/g, "")))} $${esc(sym(a.epoch))}</b><span class="sp"></span><button type="button" class="btn sm" data-air="${a.epoch}">Claim</button></div>`).join("")}</div>` : "";
  }

  function renderRein() {
    const rows = IDX?.reincarnations || [], st = S(), el = $("#rein"); $("#rein-src").innerHTML = SRC.idx;
    const cur = st.phase === "rebirth" ? `<div class="e minting"><span class="ep">Epoch ${roman(st.epoch)}</span><span class="d">now</span><span class="sym" style="color:var(--rebirth)">Minting…</span><span class="addr">—</span></div>` : "";
    if (!rows.length) { el.innerHTML = cur || `<div class="empty">${ic("state-rebirth")}<h4>Nothing reborn yet</h4><p>The first reincarnation launches when Epoch ${roman(st.epoch)} ends — when the death clock runs out.</p></div>`; return; }
    el.innerHTML = cur + rows.slice(0, 4).map(r => `<div class="e"><span class="ep">Epoch ${roman(r.epoch)}</span><span class="d">${r.ts ? new Date(r.ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""}</span>
      <span class="sym">$${esc(r.symbol)}</span><span class="addr">${r.token ? `<a href="${ex("token", r.token)}" target="_blank" rel="noopener">${esc(short(r.token))} ↗</a>` : "—"}</span>
      <span class="meta">seeded ${r.seededEth.toFixed(4)} ETH · fee share ${r.feeShareEth.toFixed(4)} ETH</span><span class="links">${r.token ? `<a href="https://www.ponsfamily.com/token/${esc(r.token)}" target="_blank" rel="noopener">Pons ↗</a>` : ""}</span></div>`).join("");
  }

  function renderProof() {
    const st = S();
    $("#pf-altar").innerHTML = altarSet ? `<a href="${ex("address", CFG.altar)}" target="_blank" rel="noopener" style="color:var(--bone)">${esc(short(CFG.altar))}</a>` : (D.DEMO ? '<span class="dim">example address after deploy</span>' : '<span class="dim">not deployed</span>');
    $("#pf-altar-badge").outerHTML = st.live && altarSet ? `<span id="pf-altar-badge" class="badge ok">${ic("shield-check", "i s")} code found</span>` : `<span id="pf-altar-badge" class="badge ${D.DEMO ? "dim" : "no"}">${D.DEMO ? "preview" : altarSet ? "no code" : "unset"}</span>`;
    $("#pf-src").innerHTML = CFG.verifiedSource ? `<a href="${esc(CFG.verifiedSource)}" target="_blank" rel="noopener">Verified source ↗</a>` : `<span>source not published</span>`;
    $("#pf-tre").textContent = st.live ? `${eth(CH.treasuryWei, 4)} ETH` : "—"; $("#pf-tre-src").innerHTML = st.live ? SRC.chain : "";
    $("#pf-token").innerHTML = CFG.token ? `<a href="${ex("token", CFG.token)}" target="_blank" rel="noopener" style="color:var(--bone)">${esc(short(CFG.token))} ↗</a>` : '<span class="dim">not launched</span>';
    $("#pf-token-sub").innerHTML = CFG.token ? `<span>2.7% of volume → holders (Pons Holder Fee Sharing)</span>${CFG.links.dexscreener ? ` · <a href="${esc(CFG.links.dexscreener)}" target="_blank" rel="noopener">DexScreener ↗</a>` : ""}` : "";
    $("#pf-tre-src").innerHTML = st.live ? SRC.chain + (CH?.uncollectedWei > 0n ? ` · <span>${eth(CH.uncollectedWei, 4)} ETH uncollected in the <a href="${ex("address", CFG.feeEscrow)}" target="_blank" rel="noopener">Pons escrow</a></span>` : "") : "";
    $("#pf-src").innerHTML += A.isSet(CFG.reincarnator) ? ` · <a href="${ex("address", CFG.reincarnator)}" target="_blank" rel="noopener">Reincarnator ↗</a>` : "";
    $("#pf-block").textContent = CH?.block ? n0(CH.block) : "rpc unreachable";
    const u = IDX?.state?.updatedAt; $("#pf-idx").textContent = !u ? "idle" : (Date.now() - u < 60e3 ? `${Math.max(1, Math.round((Date.now() - u) / 1000))} s ago` : Date.now() - u < 4 * 60e3 ? `${Math.round((Date.now() - u) / 60e3)} min ago` : `stale · ${Math.round((Date.now() - u) / 60e3)} min`);
    $("#pf-idx").style.color = !u ? "var(--bone-3)" : Date.now() - u < 4 * 60e3 ? "var(--phosphor)" : "var(--amber)";
    const L = CFG.links, items = [["Archive", "archive.html"], ["Whitepaper", "whitepaper.html"], ["Source", L.github], ["Audit", CFG.audit], ["X", L.x], ["Telegram", L.telegram]].filter(([, u]) => u);
    $("#foot-links").innerHTML = items.map(([n, u]) => `<a href="${esc(u)}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ""}>${n}</a>`).join("") + (CFG.audit ? "" : '<span class="unaudited">Unaudited</span>');
  }

  // ── incinerator ───────────────────────────────────────────────────────
  const I = { addr: $("#in-addr"), tag: $("#in-tag"), msg: $("#in-msg"), bal: $("#in-bal"), amt: $("#in-amt"), sym: $("#in-sym"), range: $("#in-range"), btn: $("#btn-sac"), why: $("#sac-why"), earn: $("#soul-earn"), status: $("#inc-status") };
  const setSteps = s => { stage = s; const o = ["approve", "sacrifice", "done"]; $("#steps").querySelectorAll("span").forEach((el, i) => { el.className = s === "done" ? (i === 2 ? "reb" : "done") : o.indexOf(s) > i ? "done" : o[i] === s ? "on" : ""; }); };
  const setTag = (cls, txt) => { I.tag.className = "tag " + cls; I.tag.textContent = txt; I.addr.classList.toggle("has-tag", !!txt); I.addr.className = I.addr.className.replace(/\b(ok|warn|err)\b/g, "").trim() + (cls === "dim" ? "" : " " + cls); };
  async function loadToken() {
    const a = I.addr.value.trim(); TOK = null; I.bal.textContent = ""; I.sym.textContent = "";
    if (!a) { setTag("dim", ""); I.msg.className = "fmsg"; I.msg.textContent = "Paste the token contract, not your wallet."; return gate(); }
    if (!A.isAddr(a)) { setTag("err", "not an address"); I.msg.className = "fmsg err"; I.msg.textContent = "That is not an address. Expect 0x and 40 hex characters."; return gate(); }
    setTag("dim", "reading…"); I.msg.className = "fmsg"; I.msg.textContent = "";
    try { TOK = await D.token(a, ME); } catch { TOK = null; }
    if (!TOK || !TOK.live) { TOK = null; setTag("err", "not a token"); I.msg.className = "fmsg err"; I.msg.textContent = "No token contract at this address. Nothing to burn."; return gate(); }
    const d = TOK.deadness; I.sym.textContent = "$" + TOK.symbol; I.bal.textContent = ME ? `bal ${A.fmt(TOK.balance, TOK.decimals, 0)}` : "";
    const K = CH?.karma || CFG.karma;
    if (d.status === "verified") { setTag("ok", `verified dead · karma ×${(d.multBps / 10000).toFixed(1)}`); I.msg.className = "fmsg ok"; I.msg.textContent = `$${TOK.symbol} once had a market and now trades under ${CFG.epoch.deadnessPct}% of its peak. Voucher valid for one hour; it bends the clock.`; }
    else if (d.status === "alive") { setTag("warn", "still trading · karma ×1.0"); I.msg.className = "fmsg warn"; I.msg.textContent = `$${TOK.symbol} still trades. You may burn it, but only the verified dead earn the ×${K.verified ? CFG.karma.deadMult : 1.5} bonus.`; }
    else { setTag("warn", "unverified · small karma"); I.msg.className = "fmsg warn"; I.msg.textContent = `No market history for $${TOK.symbol}${d.reason ? ` (${d.reason})` : ""}. ${n0(K.unverified)} karma per offering, at most ${n0(K.unverifiedCap)} per wallet per epoch. No clock bonus.`; }
    gate();
  }
  const amountWei = () => { if (!TOK) return null; const v = A.parse(I.amt.value, TOK.decimals); return v && v > 0n ? v : null; };
  // mirrors ThanatosAltarV2: verified = (verifiedKarma + log10(amount+1)) x mult; unverified = unverifiedKarma, capped per wallet per epoch
  const karmaFor = w => { const K = CH?.karma || CFG.karma, d = TOK?.deadness; if (!d || d.status === "unverifiable") return K.unverified;
    const human = w ? Number(w / 10n ** BigInt(TOK.decimals)) : 0; return Math.floor((K.verified + Math.floor(Math.log10(human + 1))) * (d.multBps || 10000) / 10000); };
  function gate() {
    const st = S(), w = amountWei(); let why = "", label = "Sacrifice · Burn forever";
    if (D.DEMO && !ME) why = "Preview — connect a wallet on the live site to offer.";
    if (!st.live && !D.DEMO) { why = "The altar is not consecrated. No offerings until the contract is deployed."; label = "Altar not consecrated"; }
    else if (st.phase === "evaluating") { why = "The altar is sealed while souls are counted."; label = "Sealed while souls are counted"; }
    else if (!ME) { why = why || "Connect a wallet to offer."; label = "Connect wallet to offer"; }
    else if (!WOK) { why = `You are on the wrong network. The altar is on ${C.name}.`; label = `Switch to ${C.name}`; }
    else if (!TOK) why = "Paste the dead token's contract address.";
    else if (!w) why = "Enter an amount.";
    else if (w > TOK.balance) why = `You hold ${A.fmt(TOK.balance, TOK.decimals, 0)}. You cannot offer ${A.fmt(w, TOK.decimals, 0)}.`;
    I.status.textContent = !st.live && !D.DEMO ? "Dormant" : st.phase === "evaluating" ? "Sealed" : st.phase === "rebirth" ? "Minting" : "Ready";
    I.status.className = "status " + (!st.live && !D.DEMO ? "dim" : st.phase === "evaluating" ? "amber" : st.phase === "rebirth" ? "violet" : "");
    I.earn.innerHTML = TOK ? (TOK.deadness.status === "verified" ? `<span class="verified">+ ${n0(karmaFor(w))} (verified dead)</span>` : TOK.deadness.status === "alive" ? `<span class="base">+ ${n0(karmaFor(w))} (verified, still trading)</span>` : `<span class="base">+ ${n0(karmaFor(w))} (unverified, capped)</span>`) : "—";
    $("#fee-eth").textContent = (CH?.altarFeeWei ? eth(CH.altarFeeWei, 4).replace(/\.?0+$/, "") : CFG.altarFeeEth) + " ETH";
    I.why.textContent = why; I.btn.disabled = !!why || stage === "approve" || stage === "sacrifice";
    if (!why) { const need = w > TOK.allowance; I.btn.innerHTML = stage === "approve" ? `<span class="spin"></span> Approving` : stage === "sacrifice" ? `<span class="spin"></span> Sending` : need ? "I · Approve ERC-20" : "Sacrifice · Burn forever"; }
    else I.btn.textContent = label;
  }
  I.addr.addEventListener("change", loadToken); I.addr.addEventListener("blur", loadToken);
  I.amt.addEventListener("input", () => { if (TOK && TOK.balance > 0n) { const w = amountWei() || 0n; I.range.value = Math.min(100, Number(100n * w / TOK.balance)); $$(".qp button").forEach(b => b.setAttribute("aria-pressed", "false")); } gate(); });
  const setPct = p => { if (!TOK) return; const w = TOK.balance * BigInt(p) / 100n; I.amt.value = A.fmt(w, TOK.decimals, 0).replace(/,/g, ""); I.range.value = p; $$(".qp button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.p === +p))); gate(); };
  I.range.addEventListener("input", () => setPct(I.range.value)); $$(".qp button").forEach(b => b.addEventListener("click", () => setPct(b.dataset.p)));

  I.btn.addEventListener("click", async () => {
    const w = amountWei(); if (!w || !TOK) return; const token = I.addr.value.trim();
    try {
      if (w > TOK.allowance) { setSteps("approve"); gate();
        const h = await Wl.send(token, A.enc("approve", A.padAddr(CFG.altar), A.padUint(w))); const r = await Wl.waitReceipt(h);
        if (!r || r.status !== "0x1") throw new Error("Approval reverted. Nothing was burned, no fee was taken.");
        TOK.allowance = w; }
      setSteps("sacrifice"); gate();
      const v = TOK.deadness.voucher, fee = CH?.altarFeeWei || A.wei(CFG.altarFeeEth);
      const data = A.encSacrifice(token, w, v ? TOK.deadness.multBps : 0, v ? v.expiry : 0, v ? v.sig : "0x");
      const h = await Wl.send(CFG.altar, data, "0x" + fee.toString(16));
      const pend = { ts: Date.now(), kind: "offer", wallet: ME, symbol: TOK.symbol, amount: Number(A.fmt(w, TOK.decimals, 0).replace(/,/g, "")), soul: karmaFor(w), verified: TOK.deadness.status === "unverifiable" ? "base" : "verified", tx: h, pending: true };
      IDX.events.unshift(pend); renderTelemetry(); window.Scribe?.write();
      const t = toast("sent", `<b>Offering sent.</b> ${n0(pend.amount)} $${esc(TOK.symbol)} · waiting for the altar to accept.`, `<a href="${ex("tx", h)}" target="_blank" rel="noopener">${short(h)} ↗</a>`);
      const r = await Wl.waitReceipt(h); t.remove();
      if (!r || r.status !== "0x1") { toast("err", `<b>Failed.</b> The transaction reverted. Nothing was burned.`, `<a href="${ex("tx", h)}" target="_blank" rel="noopener">View tx ↗</a>`); pend.pending = false; IDX.events.shift(); renderTelemetry(); return; }
      pend.pending = false; renderTelemetry(); window.Altar3D?.flare();
      toast("ok", `<b>The altar accepted your offering.</b> ${n0(pend.amount)} $${esc(TOK.symbol)} → ash · +${n0(pend.soul)} soul weight · fee ${eth(fee, 4).replace(/\.?0+$/, "")} ETH.`, `<a href="${ex("tx", h)}" target="_blank" rel="noopener">${short(h)} ↗</a>`);
      setSteps("done"); I.amt.value = ""; I.range.value = 0; I.btn.textContent = "Sacrifice another"; setTimeout(refresh, 1500);
    } catch (e) { const m = (e.message || "").toLowerCase(); toast("err", m.includes("reject") || m.includes("denied") ? `<b>Failed.</b> Rejected by wallet — nothing was burned, no fee was taken.` : `<b>Failed.</b> ${esc((e.message || "Transaction failed").split("\n")[0].slice(0, 160))}`, `<button type="button" onclick="this.closest('.toast').remove()">Retry</button>`); }
    finally { setSteps("idle"); gate(); }
  });
  $("#btn-claim").addEventListener("click", async () => {
    const b = $("#btn-claim"); b.disabled = true; b.innerHTML = `<span class="spin"></span> Claiming`;
    try { const h = await Wl.send(CFG.altar, A.enc("claim")); const r = await Wl.waitReceipt(h);
      if (!r || r.status !== "0x1") throw new Error("Claim reverted.");
      toast("ok", `<b>Fee share claimed.</b> ${eth(CH.claimable)} ETH sent to ${short(ME)}.`, `<a href="${ex("tx", h)}" target="_blank" rel="noopener">${short(h)} ↗</a>`); await refresh(); }
    catch (e) { toast("err", `<b>Failed.</b> ${esc((e.message || "Claim failed").split("\n")[0].slice(0, 160))}`, `<button type="button" onclick="this.closest('.toast').remove()">Retry</button>`); renderVault(); }
  });
  $("#airdrops").addEventListener("click", async e => {
    const b = e.target.closest("button[data-air]"); if (!b) return; const ep = Number(b.dataset.air); b.disabled = true; b.innerHTML = `<span class="spin"></span>`;
    try { const h = await Wl.send(CFG.reincarnator, A.enc("claimAirdrop", A.padUint(ep))); const r = await Wl.waitReceipt(h);
      if (!r || r.status !== "0x1") throw new Error("Claim reverted.");
      D.forgetAirdrop(ME, ep); toast("ok", `<b>Airdrop claimed.</b> Epoch ${roman(ep)} tokens sent to ${short(ME)}.`, `<a href="${ex("tx", h)}" target="_blank" rel="noopener">${short(h)} ↗</a>`); await refresh(); }
    catch (err) { toast("err", `<b>Failed.</b> ${esc((err.message || "Claim failed").split("\n")[0].slice(0, 160))}`, `<button type="button" onclick="this.closest('.toast').remove()">Retry</button>`); renderVault(); }
  });
  $("#btn-connect").addEventListener("click", async () => { if (ME) return; try { await Wl.connect(); } catch (e) { toast("err", `<b>No wallet.</b> ${esc(e.message)}`); } });
  $("#btn-switch").addEventListener("click", async () => { try { await Wl.ensureChain(); } catch (e) { toast("err", `<b>Failed.</b> ${esc(e.message)}`); } });
  Wl.on(async st => { ME = st.account; WOK = st.ok; renderHeader(); if (ME) { try { CH = await D.onchain(ME); } catch {} } renderAll(); if (I.addr.value) loadToken(); });

  // ── motion: altar mengikuti scroll, tilt kartu, koreografi rebirth ────
  (() => {
    const hero = $(".hero"); if (!hero) return; let raf = 0;
    const heroIn = $(".hero-in"), heroFoot = $(".hero-foot"), prog = $(".progress i"), riteLine = $(".rite-line i"), rites = $$(".rite"), scribe = $(".scribe-card"), climax = $(".climax"), sec = $("#ritual");
    const vh = () => innerHeight || 1, rel = el => { const r = el.getBoundingClientRect(); return Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh() / 2) / vh())); };
    const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0;
      const h = hero.offsetHeight || 1, p = Math.min(1, Math.max(0, (scrollY - (hero.offsetTop || 0)) / (h * .9)));
      window.Altar3D?.scroll(p);
      $(".top")?.classList.toggle("solid", scrollY > 32);   // padat begitu bergerak — teks hero yang parallax tidak lagi menembus header
      if (prog) prog.style.width = (100 * scrollY / Math.max(1, document.documentElement.scrollHeight - vh())).toFixed(2) + "%";
      if (REDUCE) return;
      if (heroIn) { heroIn.style.transform = `translateY(${(scrollY * .18).toFixed(1)}px)`; heroIn.style.opacity = String(Math.max(0, 1 - p * 1.25)); }
      if (heroFoot) heroFoot.style.opacity = String(Math.max(0, 1 - p * 1.6));
      if (scribe) scribe.style.setProperty("--sp", rel(scribe).toFixed(3));
      if (climax) climax.style.setProperty("--sp", rel(climax).toFixed(3));
      if (riteLine && sec) { const r = sec.getBoundingClientRect(); const q = Math.min(1, Math.max(0, (vh() * .85 - r.top) / (r.height * .9))); riteLine.style.width = (q * 100).toFixed(1) + "%"; rites.forEach((el, i) => el.classList.toggle("lit", q > (i + .55) / rites.length)); }
    }); };
    addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll); onScroll();
    if (!REDUCE && matchMedia("(hover:hover)").matches) {
      document.addEventListener("pointermove", e => { const el = e.target.closest?.(".rein .e, .rite"); if (!el) return; const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `perspective(700px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-2px)`; el.classList.add("tilt"); }, { passive: true });
      document.addEventListener("pointerout", e => { const el = e.target.closest?.(".rein .e, .rite"); if (el && !el.contains(e.relatedTarget)) { el.style.transform = ""; el.classList.remove("tilt"); } });
    }
  })();
  let LASTPHASE = null, LASTEPOCH = null, PLAYING = false;
  async function playRebirth(demo) {
    if (PLAYING) return; PLAYING = true; const st = S(), ep = st.epoch, wait = ms => new Promise(r => setTimeout(r, REDUCE ? 0 : ms));
    const mc = $("#m-clock"), hc = $("#hero-clock"), pill = (ph) => { ["#state-pill", "#altar-state-pill"].forEach(sel => { const p = $(sel); p.className = (sel === "#state-pill" ? "pill " : "pill ") + ph; p.querySelector(".t").textContent = PHASE_LABEL[ph]; }); $("#state-glyph").innerHTML = ic("state-" + ph); $("#altar-state-glyph").innerHTML = ic("state-" + ph); };
    // 1 · jam habis, altar tersegel, bara membeku satu ketukan, Scribe menutup buku
    clearInterval(TICK); mc.textContent = hc.textContent = "00:00:00"; mc.classList.add("tick"); pill("evaluating"); window.Altar3D?.set("evaluating", 1); window.Altar3D?.freeze(1200); window.Scribe?.set("evaluating"); $("#inc-status").textContent = "Sealed"; $("#inc-status").className = "status amber";
    await wait(900);
    // 2 · rebirth: obor berbalik, tirai ungu, Scribe mengangkat obor
    pill("rebirth"); window.Altar3D?.set("rebirth", 1); window.Scribe?.set("rebirth"); mc.textContent = hc.textContent = "REBORN"; $("#m-clock-sub").textContent = `epoch ${roman(ep)} → ${roman(ep + 1)}`;
    const veil = document.createElement("div"); veil.className = "veil"; document.body.appendChild(veil); requestAnimationFrame(() => veil.classList.add("on")); setTimeout(() => { veil.classList.remove("on"); setTimeout(() => veil.remove(), 700); }, 900);
    $("#inc-status").textContent = "Minting"; $("#inc-status").className = "status violet";
    await wait(1600);
    // 3 · kartu reinkarnasi masuk + toast
    const sym = demo ? "HOLLOW" : (IDX?.reincarnations?.[0]?.symbol || "—");
    if (demo && IDX) { IDX.reincarnations.unshift({ epoch: ep, symbol: sym, token: "0x" + "ab".repeat(20), tx: "0x" + "cd".repeat(32), soul: IDX.state.soul, seededEth: 0.1687, feeShareEth: 0.1265, buybackEth: 0.1265, ts: Date.now(), fresh: true }); }
    renderRein(); const first = $("#rein .e:not(.pending)"); if (first) { first.classList.add("born"); }
    toast("reb", `<b>Epoch ${roman(ep)} reborn.</b> $${esc(sym)} minted · ${demo ? "0.0891" : eth(CH?.claimable || 0n)} ETH fee share is claimable.`, `<button type="button" onclick="document.getElementById('btn-claim').scrollIntoView({behavior:'smooth',block:'center'})">Claim</button>`);
    await wait(2400);
    // 4 · epoch berikutnya: obor kembali, soul bar kosong, numeral crossfade, jam mulai lagi
    if (demo && IDX) { IDX.state.epoch = ep + 1; IDX.state.soul = 0; IDX.state.totalSacrifices = 0; IDX.state.endsAt = Date.now() + 24 * 3600e3; IDX.state.phase = "burning"; if (CH) { CH.epoch = ep + 1; CH.soul = 0; CH.endsAt = IDX.state.endsAt; CH.phase = "burning"; CH.claimable = A.wei("0.0891"); } }
    window.Altar3D?.set("burning", 0); window.Scribe?.set("idle"); renderAll(); PLAYING = false;
  }
  window.playRebirth = playRebirth;
  if (D.DEMO && new URLSearchParams(location.search).get("rebirth") === "1") setTimeout(() => playRebirth(true), 1500);
  if (D.DEMO && new URLSearchParams(location.search).get("y")) setTimeout(() => scrollTo(0, +new URLSearchParams(location.search).get("y")), 900);

  // ── scroll: header padat setelah hero, anchor aktif, reveal babak ────
  (() => {
    const top = $(".top"), hero = $(".hero"); if (!hero) return;
    const io = new IntersectionObserver(([e]) => { if (scrollY <= 32) top.classList.toggle("solid", !e.isIntersecting); }, { threshold: [0] }); io.observe(hero);
    const secs = $$("#altar,#offer,#economy,#ritual,#proof"), links = $$(".anchors a");
    const io2 = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id)); }); }, { rootMargin: "-40% 0px -55% 0px" }); secs.forEach(x => io2.observe(x));
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) { const io3 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io3.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" }); $$(".reveal").forEach(x => io3.observe(x)); }
  })();

  function renderAll() { renderHeader(); renderMetrics(); renderTelemetry(); renderLeaderboard(); renderVault(); renderRein(); renderProof(); gate(); }
  async function refresh() {
    if (PLAYING) return;
    const [i, c] = await Promise.all([D.indexed().catch(() => IDX), D.onchain(ME).catch(() => CH)]);
    if (i) IDX = i; if (c) CH = c;
    const st = S(); if (LASTEPOCH && st.live && st.epoch > LASTEPOCH) { LASTPHASE = st.phase; LASTEPOCH = st.epoch; return playRebirth(false); }
    LASTPHASE = st.phase; LASTEPOCH = st.epoch; renderAll();
  }
  refresh(); setInterval(refresh, CFG.pollMs);
})();
