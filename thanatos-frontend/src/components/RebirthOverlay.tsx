"use client";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Sparkles, X } from "lucide-react";
import { useAccount } from "wagmi";
import { useThanatosStore, type Reincarnation } from "@/store/useThanatosStore";

const PONS = "https://www.ponsfamily.com/token/";

export function RebirthOverlay() {
  const rows = useThanatosStore((s) => s.reincarnations);
  const board = useThanatosStore((s) => s.leaderboard);
  const { address } = useAccount();
  const seen = useRef<number | null>(null);
  const [show, setShow] = useState<Reincarnation | null>(null);
  const [phase, setPhase] = useState<"burst" | "reveal">("burst");

  useEffect(() => {
    if (rows.length === 0) return;
    const latest = rows[0];
    if (seen.current === null) {
      seen.current = latest.epoch;
      return;
    }
    if (latest.epoch > seen.current && Date.now() - latest.createdAt < 10 * 60_000) {
      seen.current = latest.epoch;
      setPhase("burst");
      setShow(latest);
      const t = setTimeout(() => setPhase("reveal"), 1800);
      return () => clearTimeout(t);
    }
  }, [rows]);

  if (!show) return null;
  const rank = board.findIndex((b) => b.wallet.toLowerCase() === address?.toLowerCase());
  const airdropped = rank >= 0 && rank < 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/90">
      <div className="rebirth-ring" />
      <div className="rebirth-ring" style={{ animationDelay: "0.4s" }} />
      <div className="rebirth-ring" style={{ animationDelay: "0.8s" }} />
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="rebirth-ash"
          style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 1.2}s`, animationDuration: `${1.5 + Math.random()}s` }}
        />
      ))}
      {phase === "reveal" && (
        <div className="rebirth-card panel relative mx-4 max-w-md p-8 text-center">
          <button onClick={() => setShow(null)} className="absolute right-3 top-3 text-bone/40 hover:text-bone" aria-label="close">
            <X className="h-4 w-4" />
          </button>
          <div className="mb-2 flex items-center justify-center gap-2 text-[10px] tracking-[0.3em] text-flame">
            <Sparkles className="h-3 w-3" /> EPOCH #{show.epoch} · REBIRTH COMPLETE
          </div>
          <div className="text-4xl font-bold tracking-[0.15em] text-bone drop-shadow-[0_0_20px_#f97316]">${show.symbol}</div>
          <div className="mt-1 text-sm text-bone/60">{show.name}</div>
          {airdropped && (
            <div className="mt-4 border border-flame/50 bg-flame/10 px-3 py-2 text-xs text-flame">
              You ranked #{rank + 1} this epoch. ${show.symbol} has been airdropped to your wallet.
            </div>
          )}
          <a
            href={`${PONS}${show.token}`}
            target="_blank"
            rel="noreferrer"
            className="btn-flame mt-6 inline-flex items-center justify-center gap-2"
          >
            TRADE ON PONS <ExternalLink className="h-3 w-3" />
          </a>
          <div className="mt-3 text-[10px] tracking-[0.2em] text-bone/30">A NEW EPOCH HAS BEGUN. THE CLOCK RESETS.</div>
        </div>
      )}
    </div>
  );
}
