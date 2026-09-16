"use client";
import { useEffect } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { formatUnits } from "viem";
import { db } from "@/config/firebase";
import { useThanatosStore, type LeaderEntry, type Reincarnation, type Sacrifice } from "@/store/useThanatosStore";

const toMs = (v: unknown) =>
  typeof v === "number" ? (v < 1e12 ? v * 1000 : v) : ((v as { toMillis?: () => number })?.toMillis?.() ?? Date.now());

/** Indexed-event cache listeners. Everything here is derived from on-chain events by the indexer. */
export function useSacrificeLogs(currentEpoch?: number) {
  const setSacrifices = useThanatosStore((s) => s.setSacrifices);
  const setLeaderboard = useThanatosStore((s) => s.setLeaderboard);
  const setReincarnations = useThanatosStore((s) => s.setReincarnations);
  const setMeta = useThanatosStore((s) => s.setMeta);

  useEffect(() => {
    const unsubs = [
      onSnapshot(doc(db, "altar_state", "current"), (snap) => {
        const d = snap.data();
        if (d) setMeta({ status: d.status ?? "DORMANT" });
      }, () => {}),
      onSnapshot(
        query(collection(db, "sacrifices"), orderBy("timestamp", "desc"), limit(30)),
        (snap) => {
          setSacrifices(
            snap.docs.map((d) => {
              const x = d.data();
              return {
                id: d.id,
                wallet: x.user_address ?? "",
                amount: formatUnits(BigInt(x.raw_amount ?? "0"), x.token_decimals ?? 18),
                symbol: x.token_symbol ?? "???",
                karma: Number(x.karma ?? 0),
                verified: !!x.verified,
                timestamp: toMs(x.timestamp),
              } satisfies Sacrifice;
            }),
          );
          setMeta({ totalSacrifices: snap.size });
        },
        () => {},
      ),
      onSnapshot(
        query(collection(db, "leaderboard"), orderBy("lifetime_karma", "desc"), limit(50)),
        (snap) => {
          setLeaderboard(
            snap.docs.map((d) => {
              const x = d.data();
              return { wallet: d.id, lifetimeKarma: Number(x.lifetime_karma ?? 0), epochKarma: Number(x.epoch_karma?.[currentEpoch ?? 0] ?? 0), burns: x.burn_count ?? 0, tier: x.tier } satisfies LeaderEntry;
            }),
          );
        },
        () => {},
      ),
      onSnapshot(
        query(collection(db, "reincarnations"), orderBy("epoch", "desc"), limit(20)),
        (snap) => {
          setReincarnations(
            snap.docs.map((d) => {
              const x = d.data();
              return { epoch: x.epoch ?? 0, name: x.token_name ?? "", symbol: x.token_symbol ?? "???", token: x.token_address ?? "", tx: x.factory_tx_hash ?? "", createdAt: toMs(x.created_at) } satisfies Reincarnation;
            }),
          );
        },
        () => {},
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [setSacrifices, setLeaderboard, setReincarnations, setMeta, currentEpoch]);

  return useThanatosStore((s) => s.sacrifices);
}
