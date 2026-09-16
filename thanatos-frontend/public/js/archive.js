(() => {
  const CFG = window.THANATOS, D = window.Data, C = CFG.chain, ic = window.icon, $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const roman = n => { const m = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]]; let s = ""; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s || "—"; };
  const n0 = n => Math.round(n).toLocaleString("en-US");
  const short = a => a && a.length > 13 ? a.slice(0, 6) + "…" + a.slice(-4) : (a || "—");
  const ethv = v => `${v.toFixed(4)}<small>ETH</small>`;
  const date = ts => new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  $("#brand-mark").innerHTML = ic("logo-monogram", "i xl"); $("#foot-brand").innerHTML = ic("logo-monogram", "i"); $("#ribbon-ico").innerHTML = ic("state-rebirth");
  async function load() {
    const i = await D.indexed().catch(() => null), s = i?.state || {}, rows = i?.reincarnations || [];
    $("#ribbon").hidden = !i?.demo;
    const fee = rows.reduce((a, r) => a + r.feeShareEth, 0), bb = rows.reduce((a, r) => a + r.buybackEth, 0);
    $("#arch-count").innerHTML = rows.length
      ? `<span><b>${rows.length}</b>reincarnation${rows.length > 1 ? "s" : ""}</span><span><b>${fee.toFixed(4)} ETH</b>fee share</span><span><b>${bb.toFixed(4)} ETH</b>bought back &amp; burned</span>`
      : `<span>no reincarnations yet</span>`;
    const meta = r => [
      r.token ? `<a class="tok" href="${C.explorer}/token/${esc(r.token)}" target="_blank" rel="noopener" title="${esc(r.token)}"><span class="full">${esc(r.token)}</span><span class="cut">${esc(short(r.token))}</span></a>` : `<span>token address pending</span>`,
      r.tx ? `<a href="${C.explorer}/tx/${esc(r.tx)}" target="_blank" rel="noopener">birth tx ↗</a>` : "",
      r.token ? `<a href="https://www.ponsfamily.com/launchpad/${esc(r.token)}" target="_blank" rel="noopener">Pons ↗</a>` : "",
      r.ts ? `<span>${date(r.ts)}</span>` : "",
    ].filter(Boolean).join("");
    $("#arch").innerHTML = `<div class="e pending"><span class="ep">${roman(s.epoch || 1)}</span><div><div class="sym">Pending…</div><div class="meta"><span>soul ${n0(s.soul || 0)} / ${n0(s.soulTarget || 1000)}</span></div></div><div class="stats"><span>offerings<b>${n0(s.totalSacrifices || 0)}</b></span></div></div>`
      + (rows.length ? rows.map(r => `<div class="e"><span class="ep">${roman(r.epoch)}</span><div><div class="sym">$${esc(r.symbol)}</div><div class="meta">${meta(r)}</div></div><div class="stats"><span>soul weight<b>${n0(r.soul)}</b></span><span>seeded<b>${ethv(r.seededEth)}</b></span><span>fee share<b>${ethv(r.feeShareEth)}</b></span></div></div>`).join("")
      : `<div class="empty">${ic("state-rebirth")}<h4>Nothing reborn yet</h4><p>The first reincarnation launches when Epoch ${roman(s.epoch || 1)} ends — when the death clock runs out.</p></div>`);
  }
  load(); setInterval(load, CFG.pollMs * 3);
})();
