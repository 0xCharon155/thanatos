"use client";
import { useEffect, useState } from "react";
import { Flame, ShieldCheck, ShieldQuestion } from "lucide-react";
import { formatEther, isAddress, parseUnits, type Address, type Hex } from "viem";
import { useAccount, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ALTAR_ADDRESS, altarAbi, erc20Abi, IS_DEPLOYED, VOUCHER_URL } from "@/config/contracts";
import { useAltarState } from "@/hooks/useAltarState";
import { useThanatosStore } from "@/store/useThanatosStore";

type Voucher = { status: "dead" | "alive" | "unknown"; multBps?: number; expiry?: number; sig?: Hex; reason?: string };

export function IncineratorForm() {
  const { address } = useAccount();
  const altar = useAltarState();
  const addOptimistic = useThanatosStore((s) => s.addOptimistic);
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [vLoading, setVLoading] = useState(false);
  const valid = isAddress(token);
  const tokenAddr = (valid ? token : undefined) as Address | undefined;

  const meta = useReadContracts({
    contracts: tokenAddr && address
      ? [
          { address: tokenAddr, abi: erc20Abi, functionName: "decimals" },
          { address: tokenAddr, abi: erc20Abi, functionName: "symbol" },
          { address: tokenAddr, abi: erc20Abi, functionName: "balanceOf", args: [address] },
          { address: tokenAddr, abi: erc20Abi, functionName: "allowance", args: [address, ALTAR_ADDRESS] },
        ]
      : [],
    query: { enabled: !!tokenAddr && !!address },
  });
  const decimals = (meta.data?.[0]?.result as number | undefined) ?? 18;
  const symbol = (meta.data?.[1]?.result as string | undefined) ?? "???";
  const balance = (meta.data?.[2]?.result as bigint | undefined) ?? 0n;
  const allowance = (meta.data?.[3]?.result as bigint | undefined) ?? 0n;

  useEffect(() => {
    setVoucher(null);
    if (!valid || !VOUCHER_URL) return;
    setVLoading(true);
    fetch(`${VOUCHER_URL}?token=${token}`)
      .then((r) => r.json())
      .then((v: Voucher) => setVoucher(v))
      .catch(() => setVoucher({ status: "unknown", reason: "verifier unreachable" }))
      .finally(() => setVLoading(false));
  }, [token, valid]);

  let amt = 0n;
  try {
    amt = amount ? parseUnits(amount, decimals) : 0n;
  } catch {}
  const needsApprove = amt > 0n && allowance < amt;

  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });
  const [step, setStep] = useState<"idle" | "approve" | "sacrifice">("idle");

  useEffect(() => {
    if (!receipt.isSuccess) return;
    if (step === "approve") meta.refetch();
    if (step === "sacrifice" && write.data) {
      addOptimistic({ id: write.data, wallet: address ?? "", amount, symbol, karma: 0, verified: !!voucher?.sig, timestamp: Date.now(), pending: true });
      setAmount("");
    }
    setStep("idle");
    write.reset();
  }, [receipt.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const approve = () => {
    setStep("approve");
    write.writeContract({ address: tokenAddr!, abi: erc20Abi, functionName: "approve", args: [ALTAR_ADDRESS, amt] });
  };
  const sacrifice = () => {
    setStep("sacrifice");
    const v = voucher?.sig ? voucher : null;
    write.writeContract({
      address: ALTAR_ADDRESS,
      abi: altarAbi,
      functionName: "sacrifice",
      args: [tokenAddr!, amt, v ? v.multBps! : 0, v ? BigInt(v.expiry!) : 0n, v ? v.sig! : "0x"],
      value: altar.altarFeeWei,
    });
  };

  const busy = write.isPending || receipt.isLoading;
  const closed = !altar.deployed || altar.phase !== 0;
  const pctOfBal = balance > 0n ? Number((amt * 100n) / balance) : 0;
  const disabledReason = !altar.deployed ? "The Altar is not deployed yet." : altar.phase !== 0 ? "Epoch sealed. Burning reopens after the rebirth." : !address ? "Connect a wallet to feed the Altar." : null;

  return (
    <div className="panel flex flex-col gap-4 p-5 text-sm">
      <h2 className="panel-title"><Flame className="h-3 w-3 text-ember" /> INCINERATOR MODULE</h2>

      <label className="block">
        <span className="mb-1 block text-[10px] tracking-[0.2em] text-bone/40">TOKEN CONTRACT</span>
        <input value={token} onChange={(e) => setToken(e.target.value.trim())} placeholder="0x..." className="input font-mono" spellCheck={false} disabled={closed} />
        {token && !valid && <span className="mt-1 block text-xs text-amber-400">Invalid EVM address</span>}
        {valid && (
          <div className="mt-2 space-y-1 border border-ash bg-black/40 px-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-bone">${symbol}</span>
              <span className="text-bone/50">bal <span className="tabular-nums text-bone/80">{(Number(balance) / 10 ** decimals).toLocaleString()}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {vLoading ? (
                <span className="text-bone/40">checking market history…</span>
              ) : voucher?.status === "dead" ? (
                <><ShieldCheck className="h-3 w-3 text-phosphor" /><span className="text-phosphor">Verified dead · karma ×1.5 · extends the clock</span></>
              ) : voucher?.status === "alive" ? (
                <><ShieldCheck className="h-3 w-3 text-amber-400" /><span className="text-amber-400">Verified but still trading · karma ×1.0</span></>
              ) : (
                <><ShieldQuestion className="h-3 w-3 text-bone/40" /><span className="text-bone/40">No market history · small base karma, capped per epoch</span></>
              )}
            </div>
          </div>
        )}
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] tracking-[0.2em] text-bone/40">AMOUNT TO BURN</span>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" className="input text-lg tabular-nums" inputMode="decimal" disabled={closed} />
        <div className="mt-2 grid grid-cols-4 gap-1">
          {[25, 50, 75, 100].map((p) => (
            <button key={p} type="button" disabled={closed || !valid || balance === 0n} onClick={() => setAmount((Number((balance * BigInt(p)) / 100n) / 10 ** decimals).toString())}
              className={`border py-1 text-[10px] tracking-wider transition-colors disabled:opacity-30 ${Math.round(pctOfBal) === p ? "border-ember bg-ember/20 text-bone" : "border-ash text-bone/50 hover:border-ember hover:text-bone"}`}>
              {p === 100 ? "MAX" : `${p}%`}
            </button>
          ))}
        </div>
      </label>

      <div className="mt-auto space-y-2">
        <div className="flex justify-between text-[10px] tracking-[0.15em] text-bone/40">
          <span>ALTAR FEE</span><span className="text-bone/70">{altar.deployed ? `${formatEther(altar.altarFeeWei)} ETH` : "—"}</span>
        </div>
        {needsApprove ? (
          <button onClick={approve} disabled={closed || !valid || busy || !address} className="btn-ember">{busy && step === "approve" ? "APPROVING..." : "APPROVE ERC-20"}</button>
        ) : (
          <button onClick={sacrifice} disabled={closed || !valid || amt === 0n || busy || !address} className="btn-flame">{busy && step === "sacrifice" ? "SACRIFICING..." : "SACRIFICE TO ALTAR"}</button>
        )}
        {write.error && <p className="text-xs text-amber-400">{write.error.message.split("\n")[0]}</p>}
        {disabledReason && <p className="text-center text-xs text-bone/30">{disabledReason}</p>}
        <p className="text-[10px] leading-relaxed text-bone/30">Tokens are sent to 0x…dEaD and cannot be recovered by anyone. Fee-on-transfer and rebasing tokens are rejected.</p>
      </div>
    </div>
  );
}
