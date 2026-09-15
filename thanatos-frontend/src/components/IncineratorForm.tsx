"use client";
import { useEffect, useState } from "react";
import { isAddress, parseUnits, type Address } from "viem";
import { useAccount, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ALTAR_ADDRESS, altarAbi, erc20Abi } from "@/config/contracts";
import { Flame } from "lucide-react";
import { useThanatosStore } from "@/store/useThanatosStore";

export function IncineratorForm() {
  const { address } = useAccount();
  const addOptimistic = useThanatosStore((s) => s.addOptimistic);
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const valid = isAddress(token);
  const tokenAddr = (valid ? token : undefined) as Address | undefined;

  const meta = useReadContracts({
    contracts: tokenAddr
      ? [
          { address: tokenAddr, abi: erc20Abi, functionName: "decimals" },
          { address: tokenAddr, abi: erc20Abi, functionName: "symbol" },
          { address: tokenAddr, abi: erc20Abi, functionName: "balanceOf", args: [address!] },
          { address: tokenAddr, abi: erc20Abi, functionName: "allowance", args: [address!, ALTAR_ADDRESS] },
        ]
      : [],
    query: { enabled: !!tokenAddr && !!address },
  });
  const [decimals, symbol, balance, allowance] = [
    (meta.data?.[0]?.result as number | undefined) ?? 18,
    (meta.data?.[1]?.result as string | undefined) ?? "???",
    (meta.data?.[2]?.result as bigint | undefined) ?? 0n,
    (meta.data?.[3]?.result as bigint | undefined) ?? 0n,
  ];

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
      addOptimistic({
        id: write.data,
        wallet: address ?? "",
        amount: amount,
        symbol,
        soulWeight: 0,
        clockBonusMin: 0,
        timestamp: Date.now(),
        pending: true,
      });
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
    write.writeContract({ address: ALTAR_ADDRESS, abi: altarAbi, functionName: "sacrificeToken", args: [tokenAddr!, amt] });
  };

  const busy = write.isPending || receipt.isLoading;
  const pctOfBal = balance > 0n ? Number((amt * 100n) / balance) : 0;

  return (
    <div className="panel flex flex-col gap-4 p-5 text-sm">
      <h2 className="panel-title">
        <Flame className="h-3 w-3 text-ember" /> INCINERATOR MODULE
      </h2>

      <ol className="flex items-center gap-2 text-[9px] tracking-[0.2em]">
        {["SELECT", "APPROVE", "SACRIFICE"].map((s, i) => {
          const active = i === 0 ? !valid : i === 1 ? valid && needsApprove : valid && !needsApprove && amt > 0n;
          const done = i === 0 ? valid : i === 1 ? valid && amt > 0n && !needsApprove : false;
          return (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] ${done ? "border-flame bg-flame text-void" : active ? "border-ember text-ember animate-pulse" : "border-ash text-bone/30"}`}>
                {i + 1}
              </span>
              <span className={done || active ? "text-bone/80" : "text-bone/30"}>{s}</span>
              {i < 2 && <span className="h-px flex-1 bg-ash" />}
            </li>
          );
        })}
      </ol>

      <label className="block">
        <span className="mb-1 block text-[10px] tracking-[0.2em] text-bone/40">TOKEN CONTRACT</span>
        <input value={token} onChange={(e) => setToken(e.target.value.trim())} placeholder="0x..." className="input font-mono" spellCheck={false} />
        {token && !valid && <span className="mt-1 block text-xs text-amber-400">Invalid EVM address</span>}
        {valid && (
          <div className="mt-2 flex items-center justify-between border border-ash bg-black/40 px-3 py-2 text-xs">
            <span className="font-semibold text-bone">${symbol}</span>
            <span className="text-bone/50">
              bal <span className="tabular-nums text-bone/80">{(Number(balance) / 10 ** decimals).toLocaleString()}</span>
            </span>
          </div>
        )}
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] tracking-[0.2em] text-bone/40">AMOUNT TO BURN</span>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" className="input text-lg tabular-nums" inputMode="decimal" />
        <div className="mt-2 grid grid-cols-4 gap-1">
          {[25, 50, 75, 100].map((p) => (
            <button
              key={p}
              type="button"
              disabled={!valid || balance === 0n}
              onClick={() => setAmount((Number((balance * BigInt(p)) / 100n) / 10 ** decimals).toString())}
              className={`border py-1 text-[10px] tracking-wider transition-colors disabled:opacity-30 ${Math.round(pctOfBal) === p ? "border-ember bg-ember/20 text-bone" : "border-ash text-bone/50 hover:border-ember hover:text-bone"}`}
            >
              {p === 100 ? "MAX" : `${p}%`}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.min(100, pctOfBal)}
          onChange={(e) => setAmount((Number((balance * BigInt(e.target.value)) / 100n) / 10 ** decimals).toString())}
          className="mt-2 w-full accent-ember"
          disabled={!valid || balance === 0n}
        />
      </label>

      <div className="mt-auto">
        {needsApprove ? (
          <button onClick={approve} disabled={!valid || busy || !address} className="btn-ember">
            {busy && step === "approve" ? "APPROVING..." : "APPROVE ERC-20"}
          </button>
        ) : (
          <button onClick={sacrifice} disabled={!valid || amt === 0n || busy || !address} className="btn-flame">
            {busy && step === "sacrifice" ? "SACRIFICING..." : "SACRIFICE TO ALTAR"}
          </button>
        )}
        {write.error && <p className="mt-2 text-xs text-amber-400">{write.error.message.split("\n")[0]}</p>}
        {!address && <p className="mt-2 text-center text-xs text-bone/30">Connect a wallet to feed the Altar.</p>}
      </div>
    </div>
  );
}