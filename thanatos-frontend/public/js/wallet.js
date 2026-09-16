/* Wallet lewat EIP-1193 (window.ethereum / EIP-6963). Tanpa pustaka. */
window.Wallet = (() => {
  const C = window.THANATOS.chain;
  const providers = [];
  let provider = null, account = null, chainId = null;
  const subs = new Set();
  const emit = () => subs.forEach(f => f({ account, chainId, ok: chainId === C.id, hasWallet: !!provider }));

  window.addEventListener("eip6963:announceProvider", e => { providers.push(e.detail); if (!provider) pick(); });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  function pick() {
    provider = (providers[0] && providers[0].provider) || window.ethereum || null;
    if (!provider) return;
    provider.on?.("accountsChanged", a => { account = a[0] || null; emit(); });
    provider.on?.("chainChanged", c => { chainId = Number(c); emit(); });
    provider.request({ method: "eth_chainId" }).then(c => { chainId = Number(c); emit(); }).catch(() => {});
    provider.request({ method: "eth_accounts" }).then(a => { account = a[0] || null; emit(); }).catch(() => {});
  }
  setTimeout(() => { if (!provider) pick(); }, 300);

  async function connect() {
    if (!provider) pick();
    if (!provider) throw new Error("No wallet found. Install MetaMask, Rabby, or Phantom (EVM).");
    const a = await provider.request({ method: "eth_requestAccounts" });
    account = a[0] || null; chainId = Number(await provider.request({ method: "eth_chainId" })); emit();
    if (chainId !== C.id) await ensureChain();
    return account;
  }
  async function ensureChain() {
    try { await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: C.hex }] }); }
    catch (e) {
      if (e.code === 4902 || /unrecognized|not added/i.test(e.message || "")) {
        await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: C.hex, chainName: C.name,
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: [C.rpc], blockExplorerUrls: [C.explorer] }] });
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
  const on = f => { subs.add(f); f({ account, chainId, ok: chainId === C.id, hasWallet: !!provider }); return () => subs.delete(f); };
  return { connect, ensureChain, send, waitReceipt, on, get account() { return account; }, get chainId() { return chainId; }, get has() { return !!provider; } };
})();
