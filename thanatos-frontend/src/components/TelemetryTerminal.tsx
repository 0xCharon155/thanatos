"use client";
import { useEffect, useRef } from "react";
import { Radio } from "lucide-react";
import { useSacrificeLogs } from "@/hooks/useSacrificeLogs";

const short = (a: string) => (a ? `${a.slice(0, 4)}...${a.slice(-2)}` : "??");
const time = (ms: number) => new Date(ms).toTimeString().slice(0, 8);

export function TelemetryTerminal() {
  const logs = useSacrificeLogs();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className="crt flex h-full flex-col border border-phosphor/20 p-5 text-xs">
      <h2 className="panel-title text-phosphor/50">
        <Radio className="h-3 w-3" /> TELEMETRY TERMINAL
      </h2>
      <div ref={ref} className="relative z-[2] flex-1 space-y-1 overflow-y-auto font-mono text-phosphor">
        {logs.length === 0 && <div className="text-phosphor/40">&gt; awaiting sacrifices<span className="animate-pulse">_</span></div>}
        {logs.map((l) => (
          <div key={l.id} className={`log-new leading-relaxed ${l.pending ? "text-phosphor/50" : ""}`}>
            <span className="text-phosphor/40">[{time(l.timestamp)}]</span> &gt; <span className="text-bone/80">{short(l.wallet)}</span> burned{" "}
            <span className="font-semibold">{Number(l.amount).toLocaleString()} ${l.symbol}</span>
            <div className="pl-4 text-phosphor/60">
              karma +{l.karma.toFixed(1)} {l.verified ? "| verified" : "| unverified"}{l.pending ? " | PENDING" : ""}
            </div>
          </div>
        ))}
      </div>
      <div className="relative z-[2] mt-3 flex items-center gap-2 text-[10px] tracking-[0.2em] text-phosphor/50">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-phosphor" /> LISTENING TO RPC
      </div>
    </div>
  );
}
