"use client";
import { ExternalLink, Flame, Skull, Sparkles, Wallet } from "lucide-react";
import { useThanatosStore } from "@/store/useThanatosStore";
import { useAltarState } from "@/hooks/useAltarState";
import { THANATOS_TOKEN } from "@/config/contracts";

export function Hero() {
  const altar = useAltarState();
  const totalSacrifices = useThanatosStore((s) => s.totalSacrifices);
  return (
    <section className="relative overflow-hidden border-b border-ash px-5 py-10 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.15),transparent_60%)]" />
      <div className="relative mx-auto max-w-3xl">
        <div className="mb-3 inline-flex items-center gap-2 border border-ember/40 bg-ember/10 px-3 py-1 text-[10px] tracking-[0.3em] text-ember">
          <Sparkles className="h-3 w-3" /> ROBINHOOD CHAIN · {altar.deployed ? `EPOCH #${altar.epoch}` : "PRE-LAUNCH"}
        </div>
        <h1 className="text-4xl font-bold tracking-[0.2em] text-bone md:text-6xl">
          <span className="text-ember drop-shadow-[0_0_20px_#dc2626]">$THANATOS</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-bone/60">
          Hold $THANATOS and earn 2.7% of every trade, paid to holders by Pons. Burn your dead tokens at the Altar to earn permanent
          Karma, get airdropped every token reborn from the ashes, and claim a share of their fees in ETH. Amounts depend on activity and may be zero.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {THANATOS_TOKEN ? (
            <a href={`https://www.ponsfamily.com/token/${THANATOS_TOKEN}`} target="_blank" rel="noreferrer" className="btn-flame inline-flex w-auto items-center gap-2 px-6">
              BUY $THANATOS ON PONS <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="btn w-auto cursor-default border-ash px-6 text-bone/40">$THANATOS LAUNCHING SOON ON PONS</span>
          )}
          <a href="#altar" className={`btn-ember inline-flex w-auto items-center gap-2 px-6 ${altar.deployed ? "" : "pointer-events-none opacity-40"}`}>
            <Flame className="h-3 w-3" /> SACRIFICE A TOKEN
          </a>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-6 text-[10px] tracking-[0.2em] text-bone/40">
          <span className="flex items-center gap-2"><Skull className="h-3 w-3 text-ember" /> {totalSacrifices.toLocaleString()} SOULS CLAIMED</span>
          <span className="flex items-center gap-2"><Wallet className="h-3 w-3 text-flame" /> HOLDER FEE SHARING ON</span>
          <span className="flex items-center gap-2"><Flame className="h-3 w-3 text-flame" /> REBIRTH FEE SHARE TO BURNERS IN ETH</span>
        </div>
      </div>
    </section>
  );
}
