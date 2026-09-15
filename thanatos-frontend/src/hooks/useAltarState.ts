"use client";
import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useThanatosStore } from "@/store/useThanatosStore";

const toMs = (v: unknown) =>
  typeof v === "number" ? (v < 1e12 ? v * 1000 : v) : ((v as { toMillis?: () => number })?.toMillis?.() ?? Date.now());

export function useAltarState() {
  const setAltar = useThanatosStore((s) => s.setAltar);
  useEffect(() => {
    return onSnapshot(
      doc(db, "altar_state", "current"),
      (snap) => {
        const d = snap.data();
        if (!d) return;
        setAltar({
          epoch: d.reincarnation_epoch ?? 1,
          status: d.is_locked ? "EPOCH_EVALUATING" : "ACTIVE_BURNING",
          deathClockEnd: toMs(d.death_clock_ends_at),
          soulWeightCurrent: Number(d.soul_weight_current ?? 0),
          soulWeightTarget: Number(d.soul_weight_target ?? 1000),
          treasuryEth: Number(d.accumulated_rebirth_eth ?? 0),
          dividendEth: Number(d.accumulated_dividend_eth ?? 0),
          totalSacrifices: d.total_sacrifices ?? 0,
        });
      },
      () => {},
    );
  }, [setAltar]);
  return useThanatosStore((s) => s.altar);
}
