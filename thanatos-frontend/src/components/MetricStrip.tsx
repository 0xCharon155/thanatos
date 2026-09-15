"use client";
import { useEffect, useState } from "react";
import { Clock, Flame, Hash, Landmark } from "lucide-react";
import { useAltarState } from "@/hooks/useAltarState";

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

export function MetricStrip() {
  const altar = useAltarState();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const pct = Math.min(100, (altar.soulWeightCurrent / altar.soulWeightTarget) * 100);
  const urgent = now !== null && altar.deathClockEnd - now < 3600_000;

  const cells = [
    { k: "ACTIVE EPOCH", v: `#${altar.epoch}`, Icon: Hash },
    { k: "DEATH CLOCK", v: now === null ? "--:--:--" : fmt(altar.deathClockEnd - now), Icon: Clock, cls: urgent ? "text-amber-400 animate-pulse" : "" },
    { k: "SOUL WEIGHT", v: `${altar.soulWeightCurrent.toFixed(1)} / ${altar.soulWeightTarget.toFixed(0)}`, Icon: Flame, bar: true },
    { k: "REBIRTH TREASURY", v: `${altar.treasuryEth.toFixed(3)} ETH`, Icon: Landmark },
  ];

  return (
    <section className="grid grid-cols-2 gap-px border-b border-ash bg-ash md:grid-cols-4">
      {cells.map(({ k, v, Icon, cls, bar }) => (
        <div key={k} className="group relative bg-void p-4 transition-colors hover:bg-ember/5">
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-bone/40">
            <Icon className="h-3 w-3" /> {k}
          </div>
          <div className={`mt-1 text-2xl font-semibold tabular-nums text-bone ${cls ?? ""}`}>{v}</div>
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
