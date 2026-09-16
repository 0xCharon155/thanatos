"use client";
import { useEffect, useState } from "react";
import { Clock, Flame, Hash, Landmark } from "lucide-react";
import { useAltarState } from "@/hooks/useAltarState";

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

const OnChain = () => <span title="read directly from the Altar contract" className="ml-1 text-[9px] text-flame">◆</span>;

export function MetricStrip() {
  const a = useAltarState();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = !a.deployed || now === null ? Infinity : a.epochEndsAt - now;
  const urgent = remaining < 3600_000;
  const panic = remaining < 60_000;
  const pct = a.soulTarget > 0 ? Math.min(100, (a.soulWeight / a.soulTarget) * 100) : 0;
  const dash = !a.deployed;

  const cells = [
    { k: "EPOCH", v: dash ? "—" : `#${a.epoch}`, Icon: Hash },
    { k: "DEATH CLOCK", v: dash || now === null ? "--:--:--" : a.phase !== 0 ? "SEALED" : fmt(remaining), Icon: Clock, cls: panic ? "clock-panic" : urgent ? "text-amber-400 animate-pulse" : "" },
    { k: "SOUL WEIGHT", v: dash ? "—" : `${a.soulWeight.toFixed(1)} / ${a.soulTarget.toFixed(0)}`, Icon: Flame, bar: true },
    { k: "TREASURY", v: dash ? "—" : `${a.treasuryEth.toFixed(4)} ETH`, Icon: Landmark, sub: a.uncollectedEth > 0 ? `+${a.uncollectedEth.toFixed(4)} ETH uncollected on Pons` : undefined },
  ];

  return (
    <section className="grid grid-cols-2 gap-px border-b border-ash bg-ash md:grid-cols-4">
      {cells.map(({ k, v, Icon, cls, bar, sub }) => (
        <div key={k} className="group relative bg-void p-4 transition-colors hover:bg-ember/5">
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-bone/40">
            <Icon className="h-3 w-3" /> {k}
            {!dash && <OnChain />}
          </div>
          <div className={`mt-1 text-2xl font-semibold tabular-nums text-bone ${cls ?? ""}`}>{v}</div>
          {sub && <div className="text-[10px] text-bone/40">{sub}</div>}
          {bar && (
            <div className="mt-2 h-1 w-full bg-ash">
              <div className="h-full bg-gradient-to-r from-ember to-flame shadow-[0_0_8px_#f97316] transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
