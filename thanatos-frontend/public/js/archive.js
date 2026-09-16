(() => {
  const CFG = window.THANATOS, D = window.Data, C = CFG.chain, ic = window.icon, $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const roman = n => { const m = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]]; let s = ""; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s || "—"; };
  const n0 = n => Math.round(n).toLocaleString("en-US");
  $("#brand-mark").innerHTML = ic("logo-monogram", "i xl"); $("#foot-brand").innerHTML = ic("logo-monogram", "i"); $("#ribbon-ico").innerHTML = ic("state-rebirth");
  async function load() {
    const i = await D.indexed().catch(() => null), s = i?.state || {}, rows = i?.reincarnations || [];
    $("#ribbon").hidden = !i?.demo;
    $("#arch-count").textContent = rows.length ? `${rows.length} reincarnation${rows.length > 1 ? "s" : ""} · ${rows.reduce((a, r) => a + r.feeShareEth, 0).toFixed(4)} ETH fee share · ${rows.reduce((a, r) => a + r.buybackEth, 0).toFixed(4)} ETH bought back and burned` : "no reincarnations yet";
    $("#arch").innerHTML = `<div class="e pending"><span class="ep">${roman(s.epoch || 1)}</span><div><div class="sym">Pending…</div><div class="meta">soul ${n0(s.soul || 0)} / ${n0(s.soulTarget || 1000)}</div></div><div class="stats"><span>offerings<b>${n0(s.totalSacrifices || 0)}</b></span></div></div>`
      + (rows.length ? rows.map(r => `<div class="e"><span class="ep">${roman(r.epoch)}</span><div><div class="sym">$${esc(r.symbol)}</div><div class="meta">${r.token ? `<a href="${C.explorer}/token/${r.token}" target="_blank" rel="noopener">${esc(r.token)}</a>` : "token address pending"}${r.tx ? ` · <a href="${C.explorer}/tx/${r.tx}" target="_blank" rel="noopener">birth tx ↗</a>` : ""}${r.token ? ` · <a href="https://www.ponsfamily.com/token/${r.token}" target="_blank" rel="noopener">Pons ↗</a>` : ""}${r.ts ? ` · ${new Date(r.ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""}</div></div><div class="stats"><span>soul weight<b>${n0(r.soul)}</b></span><span>seeded<b>${r.seededEth.toFixed(4)} ETH</b></span><span>fee share<b>${r.feeShareEth.toFixed(4)} ETH</b></span></div></div>`).join("")
      : `<div class="empty">${ic("state-rebirth")}<h4>Nothing reborn yet</h4><p>The first reincarnation launches when Epoch ${roman(s.epoch || 1)} ends — when the death clock runs out.</p></div>`);
  }
  load(); setInterval(load, CFG.pollMs * 3);
})();
