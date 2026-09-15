"use client";
import Link from "next/link";
import { History } from "lucide-react";
import { useThanatosStore } from "@/store/useThanatosStore";

export function Reincarnations({ full = false }: { full?: boolean }) {
  const rows = useThanatosStore((s) => s.reincarnations);
  const epoch = useThanatosStore((s) => s.altar.epoch);
  const explorer = process.env.NEXT_PUBLIC_EXPLORER_URL;
  const list = full ? rows : rows.slice(0, 3);

  return (
    <div className="panel p-5 text-xs">
      <h3 className="panel-title">
        <History className="h-3 w-3 text-purple-400" /> {full ? "REBIRTH ARCHIVE" : "PREVIOUS REINCARNATIONS"}
      </h3>
      <div className="space-y-2">
        <div className="flex justify-between border-l-2 border-ash pl-3 text-bone/40">
          <span>Epoch #{epoch}</span>
          <span className="animate-pulse">Pending...</span>
        </div>
        {list.map((r) => (
          <div key={r.epoch} className="flex justify-between border-l-2 border-purple-400 pl-3 text-bone/80">
            <span>Epoch #{r.epoch}</span>
            {r.token && explorer ? (
              <a href={`${explorer}/token/${r.token}`} target="_blank" rel="noreferrer" className="font-semibold hover:text-flame">
                ${r.symbol}
              </a>
            ) : (
              <span className="font-semibold">${r.symbol}</span>
            )}
          </div>
        ))}
        {rows.length === 0 && <div className="text-bone/30">no reincarnations yet</div>}
      </div>
      {!full && (
        <Link href="/archive" className="mt-4 inline-block text-[10px] tracking-[0.2em] text-ember hover:text-flame">
          FULL ARCHIVE →
        </Link>
      )}
    </div>
  );
}
