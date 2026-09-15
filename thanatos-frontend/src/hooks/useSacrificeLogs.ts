"use client";
import { useEffect } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { formatUnits } from "viem";
import { db } from "@/config/firebase";
import { useThanatosStore, type LeaderEntry, type Reincarnation, type Sacrifice } from "@/store/useThanatosStore";

const toMs = (v: unknown) =>
  typeof v === "number" ? (v < 1e12 ? v * 1000 : v) : ((v as { toMillis?: () => number })?.toMillis?.() ?? Date.now());

export function useSacrificeLogs() {
  const setSacrifices = useThanatosStore((s) => s.setSacrifices);
  const setLeaderboard = useThanatosStore((s) => s.setLeaderboard);
  const setReincarnations = useThanatosStore((s) => s.setReincarnations);

  useEffect(() => {
    const unsubs = [
      onSnapshot(
        query(collection(db, "sacrifices"), orderBy("timestamp", "desc"), limit(30)),
        (snap) => {
          const rows: Sacrifice[] = snap.docs.map((d) => {
            const x = d.data();
            return {
              id: d.id,
              wallet: x.user_address ?? "",
              amount: formatUnits(BigInt(x.raw_amount ?? "0"), x.token_decimals ?? 18),
              symbol: x.token_symbol ?? "???",
              soulWeight: Number(x.soul_weight_awarded ?? 0),
              clockBonusMin: Number(x.clock_bonus_min ?? 0),
              timestamp: toMs(x.timestamp),
            };
          });
          setSacrifices(rows);
        },
        () => {},
      ),
      onSnapshot(
        query(collection(db, "leaderboard"), orderBy("total_karma", "desc"), limit(50)),
        (snap) => {
          const rows: LeaderEntry[] = snap.docs.map((d) => {
            const x = d.data();
            return { wallet: d.id, karma: Number(x.total_karma ?? 0), epochKarma: Number(x.epoch_karma ?? 0), burns: x.burn_count ?? 0 };
          });
          setLeaderboard(rows);
        },
        () => {},
      ),
      onSnapshot(
        query(collection(db, "reincarnations"), orderBy("epoch", "desc"), limit(20)),
        (snap) => {
          const rows: Reincarnation[] = snap.docs.map((d) => {
            const x = d.data();
            return {
              epoch: x.epoch ?? 0,
              name: x.token_name ?? "",
              symbol: x.token_symbol ?? "???",
              token: x.token_address ?? "",
              tx: x.factory_tx_hash ?? "",
              createdAt: toMs(x.created_at),
            };
          });
          setReincarnations(rows);
        },
        () => {},
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [setSacrifices, setLeaderboard, setReincarnations]);

  return useThanatosStore((s) => s.sacrifices);
}
