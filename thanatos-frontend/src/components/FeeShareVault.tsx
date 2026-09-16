"use client";
import { Coins } from "lucide-react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useAltarState } from "@/hooks/useAltarState";
import { useFeeShareClaim } from "@/hooks/useFeeShareClaim";

const SPLIT = [
  ["30%", "FEE SHARE", "bg-ember"],
  ["40%", "SEED", "bg-flame"],
  ["30%", "BUYBACK", "bg-purple-500"],
] as const;

export function FeeShareVault() {
  const { address } = useAccount();
  const a = useAltarState();
  const d = useFeeShareClaim();

  return (
    <div className="panel animate-glow p-5 text-xs">
      <h3 className="panel-title"><Coins className="h-3 w-3 text-ember" /> FEE SHARE VAULT <span className="text-flame">◆</span></h3>
      <div className="mb-1 text-[9px] tracking-wider text-bone/40">20% PROTOCOL OFF THE TOP · REMAINDER:</div>
      <div className="mb-1 flex h-2 w-full gap-px overflow-hidden">
        {SPLIT.map(([p, k, c]) => <div key={k} className={c} style={{ width: p }} title={`${k} ${p}`} />)}
      </div>
      <div className="mb-4 flex justify-between text-[9px] tracking-wider text-bone/40">
        {SPLIT.map(([p, k]) => <span key={k}>{p} {k}</span>)}
      </div>
      <div className="mb-1 text-[10px] tracking-[0.2em] text-bone/40">CLAIMABLE (PAST EPOCHS)</div>
      <div className="text-3xl font-semibold tabular-nums text-bone">
        {a.deployed ? Number(formatEther(d.claimable)).toFixed(5) : "—"} <span className="text-sm text-bone/40">ETH</span>
      </div>
      <div className="mb-4 mt-1 text-bone/40">Lifetime paid out: {a.deployed ? a.totalDistributedEth.toFixed(4) : "—"} ETH</div>
      <button onClick={d.claim} disabled={!a.deployed || !address || d.claimable === 0n || d.isPending} className="btn-ember">
        {d.isPending ? "CLAIMING..." : "CLAIM FEE SHARE"}
      </button>
      {d.error && <div className="mt-2 text-amber-400">{d.error.message.split("\n")[0]}</div>}
      <p className="mt-3 text-[10px] leading-relaxed text-bone/30">
        Your share of each epoch&apos;s pool = your epoch karma / total epoch karma. Amounts depend on activity and may be zero.
      </p>
    </div>
  );
}
