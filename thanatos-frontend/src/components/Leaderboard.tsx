"use client";
import { Crown } from "lucide-react";
import { useAccount } from "wagmi";
import { useThanatosStore } from "@/store/useThanatosStore";

const TIER = (rank: number) =>
  rank <= 3
    ? { label: "Arch-Necromancer", cls: "text-flame border-flame/40" }
    : rank <= 10
      ? { label: "Soul Reaper", cls: "text-purple-400 border-purple-400/40" }
      : { label: "Acolyte", cls: "text-bone/40 border-ash" };
const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

export function Leaderboard() {
  const board = useThanatosStore((s) => s.leaderboard);
  const { address } = useAccount();
  const me = address?.toLowerCase();
  const myIdx = board.findIndex((b) => b.wallet.toLowerCase() === me);

  return (
    <div className="panel p-5 text-xs">
      <h3 className="panel-title">
        <Crown className="h-3 w-3 text-flame" /> TOP SACRIFICERS
      </h3>
      {myIdx >= 0 && (
        <div className="mb-3 border border-ember/40 bg-ember/10 px-3 py-2 text-bone">
          You rank <span className="font-bold text-flame">#{myIdx + 1}</span> · top {Math.ceil(((myIdx + 1) / board.length) * 100)}%
        </div>
      )}
      <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
        {board.length === 0 && <div className="text-bone/30">no souls ranked yet</div>}
        {board.map((b, i) => {
          const t = TIER(i + 1);
          const mine = b.wallet.toLowerCase() === me;
          return (
            <div key={b.wallet} className={`flex items-center justify-between px-2 py-1.5 ${mine ? "bg-ember/15 text-bone" : "text-bone/70 hover:bg-white/[0.02]"}`}>
              <div className="flex items-center gap-2">
                <span className={`w-6 text-right tabular-nums ${i < 3 ? "text-flame font-bold" : "text-bone/40"}`}>{i + 1}</span>
                <span>{short(b.wallet)}</span>
                <span className={`hidden border px-1.5 py-0.5 text-[9px] tracking-wider sm:inline ${t.cls}`}>{t.label}</span>
              </div>
              <span className="tabular-nums">{b.karma.toFixed(1)} <span className="text-bone/40">pts</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
