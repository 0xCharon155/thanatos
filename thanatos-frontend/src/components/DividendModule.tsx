"use client";
import { Coins } from "lucide-react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useDividendClaim } from "@/hooks/useDividendClaim";
import { useThanatosStore } from "@/store/useThanatosStore";

const SPLIT = [
  ["DIVIDENDS", 30, "bg-ember"],
  ["REBIRTH", 40, "bg-flame"],
  ["BUYBACK", 30, "bg-purple-500"],
] as const;

export function DividendModule() {
  const { address } = useAccount();
  const d = useDividendClaim();
  const pool = useThanatosStore((s) => s.altar.dividendEth);
  const board = useThanatosStore((s) => s.leaderboard);
  const total = board.reduce((a, b) => a + b.karma, 0);
  const mine = board.find((b) => b.wallet.toLowerCase() === address?.toLowerCase())?.karma ?? 0;
  const sharePct = total > 0 ? (mine / total) * 100 : 0;
  const onChain = d.claimable > 0n;
  const shown = onChain ? Number(formatEther(d.claimable)) : (sharePct / 100) * pool;

  return (
    <div className="panel animate-glow p-5 text-xs">
      <h3 className="panel-title">
        <Coins className="h-3 w-3 text-ember" /> DIVIDEND CLAIM VAULT
      </h3>
      <div className="mb-1 flex h-2 w-full gap-px overflow-hidden">
        {SPLIT.map(([k, p, c]) => (
          <div key={k} className={c} style={{ width: `${p}%` }} title={`${k} ${p}%`} />
        ))}
      </div>
      <div className="mb-4 flex justify-between text-[9px] tracking-wider text-bone/40">
        {SPLIT.map(([k, p]) => (
          <span key={k}>{p}% {k}</span>
        ))}
      </div>
      <div className="mb-1 text-[10px] tracking-[0.2em] text-bone/40">CLAIMABLE</div>
      <div className="text-3xl font-semibold tabular-nums text-bone">
        {shown.toFixed(4)} <span className="text-sm text-bone/40">ETH{onChain ? "" : " (est.)"}</span>
      </div>
      <div className="mt-1 text-bone/40">
        Dividend pool: {pool.toFixed(4)} ETH | your karma share {sharePct.toFixed(2)}%
      </div>
      <div className="mb-4 text-bone/40">Lifetime distributed: {Number(formatEther(d.totalDistributed)).toFixed(3)} ETH</div>
      <button onClick={d.claim} disabled={!address || d.claimable === 0n || d.isPending} className="btn-ember">
        {d.isPending ? "CLAIMING..." : "CLAIM ETH DIVIDENDS"}
      </button>
      {d.error && <div className="mt-2 text-amber-400">{d.error.message.split("\n")[0]}</div>}
    </div>
  );
}
