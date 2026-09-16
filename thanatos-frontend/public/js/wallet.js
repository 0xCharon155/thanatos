/* Wallet via EIP-1193 / EIP-6963. No library. Picker for several extensions, deep links on
   phones without an injected wallet, account menu once connected. */
window.Wallet = (() => {
  const CFG = window.THANATOS, C = CFG.chain, LS = "thanatos.wallet", ic = window.icon;
  const DEMO = new URLSearchParams(location.search).get("demo") === "1" || CFG.mode === "demo" || window.THANATOS_FORCE_DEMO === true;
  const Q = new URLSearchParams(location.search).get("wallet");
  const MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (DEMO && Q === "3");
  const wallets = new Map();                 // rdns → { info:{name,icon,rdns}, provider }
  let provider = null, account = null, chainId = null, rdns = null;
  const subs = new Set();
  const emit = () => subs.forEach(f => f({ account, chainId, ok: chainId === C.id, hasWallet: wallets.size > 0, rdns }));
  const LOGO = window.WALLET_LOGOS || {};
  const logoFor = w => w.info.icon || LOGO[w.info.name] || "";
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const short = a => a ? a.slice(0, 6) + "…" + a.slice(-4) : "";

  // ── discovery ────────────────────────────────────────────────────────
  function attach(w) {
    provider = w.provider; rdns = w.info.rdns;
    provider.on?.("accountsChanged", a => { account = a[0] || null; if (!account) forget(); emit(); });
    provider.on?.("chainChanged", c => { chainId = Number(c); emit(); });
    provider.on?.("disconnect", () => { forget(); emit(); });
    provider.request({ method: "eth_chainId" }).then(c => { chainId = Number(c); emit(); }).catch(() => {});
    provider.request({ method: "eth_accounts" }).then(a => { account = a[0] || null; emit(); }).catch(() => {});
  }
  window.addEventListener("eip6963:announceProvider", e => {
    const d = e.detail; if (!d?.info?.rdns || !d.provider) return;
    wallets.set(d.info.rdns, d);
    if (!provider && localStorage.getItem(LS) === d.info.rdns) attach(d);
    renderList(); emit();
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  setTimeout(() => {   // wallets that only inject window.ethereum (most in-app browsers on phones)
    if (!wallets.size && window.ethereum) {
      const p = window.ethereum, name = p.isRabby ? "Rabby" : p.isPhantom ? "Phantom" : p.isCoinbaseWallet ? "Coinbase Wallet" : p.isTrust ? "Trust Wallet" : p.isOkxWallet ? "OKX Wallet" : p.isMetaMask ? "MetaMask" : "Browser wallet";
      wallets.set("injected", { info: { rdns: "injected", name, icon: "" }, provider: p });
      if (!provider) attach(wallets.get("injected"));
      renderList(); emit();
    }
  }, 400);
  if (DEMO) { if (Q !== "3") setTimeout(mockWallets, 50); if (Q === "3") setTimeout(() => connect(), 700); if (Q === "2") setTimeout(async () => { await use(wallets.get("io.metamask")); menu(); }, 900); }

  // ── connect / disconnect ────────────────────────────────────────────
  let resolveConnect = null;
  async function connect() {
    if (wallets.size === 1) return use([...wallets.values()][0]);
    return new Promise(res => { resolveConnect = res; openModal(); });
  }
  async function use(w) {
    closeModal();
    attach(w);
    const a = await provider.request({ method: "eth_requestAccounts" });
    account = a[0] || null; chainId = Number(await provider.request({ method: "eth_chainId" }));
    if (account) localStorage.setItem(LS, w.info.rdns);
    emit();
    if (chainId !== C.id) await ensureChain().catch(() => {});
    return account;
  }
  function forget() { account = null; provider = null; rdns = null; localStorage.removeItem(LS); }
  async function disconnect() {
    try { await provider?.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }); } catch {}
    forget(); closeMenu(); emit();
  }
  async function ensureChain() {
    try { await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: C.hex }] }); }
    catch (e) {
      if (e.code === 4902 || /unrecognized|not added|unknown chain/i.test(e.message || "")) {
        await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: C.hex, chainName: C.name,
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: C.rpcs && C.rpcs.length ? C.rpcs : [C.rpc], blockExplorerUrls: [C.explorer] }] });
      } else throw e;
    }
    chainId = Number(await provider.request({ method: "eth_chainId" })); emit();
  }
  async function send(to, data, value = "0x0") {
    if (!account) throw new Error("Connect a wallet first.");
    if (chainId !== C.id) await ensureChain();
    return provider.request({ method: "eth_sendTransaction", params: [{ from: account, to, data, value }] });
  }
  async function waitReceipt(hash, tries = 60) {
    for (let i = 0; i < tries; i++) {
      const r = await window.Data.rpc("eth_getTransactionReceipt", [hash]);
      if (r) return r;
      await new Promise(r => setTimeout(r, 2000));
    }
    return null;
  }

  // ── picker modal ────────────────────────────────────────────────────
  const here = location.href.split("#")[0], host = location.host + location.pathname;
  const APPS = [
    ["MetaMask", `https://metamask.app.link/dapp/${host}`],
    ["Trust Wallet", `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(here)}`],
    ["Coinbase Wallet", `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(here)}`],
    ["Phantom", `https://phantom.app/ul/browse/${encodeURIComponent(here)}?ref=${encodeURIComponent(location.origin)}`],
    ["OKX Wallet", `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(here)}`],
  ];
  const INSTALL = [["MetaMask", "https://metamask.io/download/"], ["Rabby", "https://rabby.io/"], ["Phantom", "https://phantom.com/download"], ["OKX Wallet", "https://www.okx.com/web3"]];
  let modal = null, listEl = null;
  function openModal() {
    if (!modal) {
      modal = document.createElement("div"); modal.className = "wpick"; modal.innerHTML =
        `<div class="wm-sheet" role="dialog" aria-modal="true" aria-label="Connect a wallet"><header><span class="wm-mark">${ic("logo-monogram", "i")}</span><div><span class="t-card">Connect a wallet</span><p class="wm-sub">Choose how to reach the altar.</p></div><span class="sp"></span><button class="wm-x" type="button" aria-label="Close">×</button></header><div class="wm-body"></div></div>`;
      document.body.appendChild(modal); listEl = modal.querySelector(".wm-body");
      modal.addEventListener("click", e => { if (e.target === modal || e.target.closest(".wm-x")) closeModal(); });
      listEl.addEventListener("click", async e => {
        const b = e.target.closest("button[data-rdns]"); if (!b) return;
        try { const a = await use(wallets.get(b.dataset.rdns)); resolveConnect?.(a); } catch (err) { resolveConnect?.(null); closeModal(); if (err?.code !== 4001) window.Wallet.onError?.(err); }
        resolveConnect = null;
      });
      document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
    }
    renderList(); modal.hidden = false; document.body.classList.add("wm-open");
  }
  function closeModal() { if (modal) { modal.hidden = true; document.body.classList.remove("wm-open"); } if (resolveConnect) { resolveConnect(null); resolveConnect = null; } }
  function renderList() {
    if (!listEl) return;
    const img = src => src ? `<img src="${esc(src)}" alt="">` : `<span class="wm-i">${ic("wallet")}</span>`;
    const rows = [...wallets.values()].map(w => `<button type="button" class="wm-w" data-rdns="${esc(w.info.rdns)}">${img(logoFor(w))}<span>${esc(w.info.name)}</span><small>detected</small></button>`).join("");
    const apps = APPS.map(([n, u]) => `<a class="wm-w" href="${u}" rel="noopener">${img(LOGO[n])}<span>${n}</span><small>open app</small></a>`).join("");
    const install = INSTALL.map(([n, u]) => `<a class="wm-w" href="${u}" target="_blank" rel="noopener">${img(LOGO[n])}<span>${n}</span><small>install</small></a>`).join("");
    listEl.innerHTML =
      (rows ? `<div class="label">Installed</div><div class="wm-list">${rows}</div>` : "") +
      (MOBILE ? `<div class="label">${rows ? "Or open in a wallet app" : "Open this page in a wallet app"}</div><div class="wm-list">${apps}</div><div class="wm-w wm-static">${img(LOGO["Robinhood Wallet"])}<span>Robinhood Wallet</span><small>use its in-app browser</small></div>`
              : (rows ? "" : `<p class="wm-note">No wallet extension found in this browser.</p><div class="label">Get a wallet</div><div class="wm-list">${install}</div>`)) +
      `<p class="wm-note">The altar runs on ${esc(C.name)} (chain id ${C.id}). Your wallet will be asked to add it the first time.</p>`;
  }

  // ── account menu ────────────────────────────────────────────────────
  let menuEl = null;
  function menu(anchor) {
    if (!account) return;
    if (!menuEl) {
      menuEl = document.createElement("div"); menuEl.className = "acct"; document.body.appendChild(menuEl);
      menuEl.addEventListener("click", async e => {
        const a = e.target.closest("[data-act]"); if (!a) return;
        if (a.dataset.act === "copy") { try { await navigator.clipboard.writeText(account); a.textContent = "Copied"; setTimeout(() => (a.textContent = "Copy address"), 1200); } catch {} }
        if (a.dataset.act === "out") disconnect();
      });
      document.addEventListener("click", e => { if (menuEl && !menuEl.hidden && !menuEl.contains(e.target) && !e.target.closest("#btn-connect")) closeMenu(); });
    }
    const w = wallets.get(rdns);
    const lg = w ? logoFor(w) : "";
    menuEl.innerHTML = `<div class="acct-h">${lg ? `<img src="${esc(lg)}" alt="">` : ""}<span>${esc(w?.info?.name || "Wallet")}</span><span class="src ${chainId === C.id ? "chain" : ""}"><b>◆</b>${chainId === C.id ? C.name : "wrong network"}</span></div>
      <div class="acct-a mono">${esc(account)}</div>
      <button type="button" class="btn sm w" data-act="copy">Copy address</button>
      <a class="btn sm w" href="${C.explorer}/address/${account}" target="_blank" rel="noopener">View on explorer</a>
      <button type="button" class="btn sm w out" data-act="out">Disconnect</button>`;
    const open = menuEl.dataset.open === "1"; menuEl.hidden = open; menuEl.dataset.open = open ? "0" : "1";
  }
  function closeMenu() { if (menuEl) { menuEl.hidden = true; menuEl.dataset.open = "0"; } }

  // ── demo: fake extensions so the picker can be previewed ────────────
  function mockWallets() {
    const svg = (bg, t) => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${bg}"/><text x="16" y="21" text-anchor="middle" font-family="Arial" font-weight="700" font-size="15" fill="#fff">${t}</text></svg>`);
    const mk = (name, rdns, bg, t) => { let acc = []; const p = { on() {}, async request({ method }) {
      if (method === "eth_chainId") return C.hex; if (method === "eth_accounts") return acc;
      if (method === "eth_requestAccounts") { await new Promise(r => setTimeout(r, 500)); acc = ["0x9e1c4b2a7c3e9a411b90e2d7d4a20f6693f1b8c0"]; return acc; }
      if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain" || method === "wallet_revokePermissions") return null;
      throw new Error("preview wallet: " + method); } };
      window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: { info: { uuid: rdns, name, icon: LOGO[name] || svg(bg, t), rdns }, provider: p } })); };
    mk("MetaMask", "io.metamask", "#e2761b", "M"); mk("Rabby", "io.rabby", "#7084ff", "R"); mk("Phantom", "app.phantom", "#ab9ff2", "P");
  }

  const on = f => { subs.add(f); f({ account, chainId, ok: chainId === C.id, hasWallet: wallets.size > 0, rdns }); return () => subs.delete(f); };
  return { connect, disconnect, ensureChain, send, waitReceipt, on, menu, closeMenu, get account() { return account; }, get chainId() { return chainId; }, get has() { return wallets.size > 0; }, get short() { return short(account); } };
})();
