"use client";
import { Flame, Skull, Sparkles } from "lucide-react";
import { useThanatosStore } from "@/store/useThanatosStore";

export function Hero() {
  const altar = useThanatosStore((s) => s.altar);
  return (
    <section className="relative overflow-hidden border-b border-ash px-5 py-10 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.15),transparent_60%)]" />
      <div className="relative mx-auto max-w-3xl">
        <div className="mb-3 inline-flex items-center gap-2 border border-ember/40 bg-ember/10 px-3 py-1 text-[10px] tracking-[0.3em] text-ember">
          <Sparkles className="h-3 w-3" /> ROBINHOOD CHAIN Â· EPOCH #{altar.epoch}
        </div>
        <h1 className="text-4xl font-bold tracking-[0.2em] text-bone md:text-6xl">
          <span className="text-ember drop-shadow-[0_0_20px_#dc2626]">$THANATOS</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-bone/60">
          Feed your dead tokens to the Altar. Every burn adds soul weight and bends the death clock. When the clock strikes zero, the
          ashes are reborn as a new token â€” and the top sacrificers inherit it.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-6 text-[10px] tracking-[0.2em] text-bone/40">
          <span className="flex items-center gap-2"><Skull className="h-3 w-3 text-ember" /> {altar.totalSacrifices.toLocaleString()} SOULS CLAIMED</span>
          <span className="flex items-center gap-2"><Flame className="h-3 w-3 text-flame" /> 30% OF ALL FEES PAID TO BURNERS IN ETH</span>
        </div>
      </div>
    </section>
  );
}
