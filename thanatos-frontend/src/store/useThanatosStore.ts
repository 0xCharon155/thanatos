import { create } from "zustand";

/** Cache of indexed events (Firestore). Live numbers come from contract views via useAltarState. */
export type Sacrifice = {
  id: string;
  wallet: string;
  amount: string;
  symbol: string;
  karma: number;
  verified: boolean;
  timestamp: number;
  pending?: boolean;
};

export type LeaderEntry = { wallet: string; lifetimeKarma: number; epochKarma: number; burns: number; tier?: string };
export type Reincarnation = { epoch: number; name: string; symbol: string; token: string; tx: string; createdAt: number };
export type AirdropEntry = { epoch: number; amount: string; proof: `0x${string}`[]; token: string };

type Store = {
  status: string;
  totalSacrifices: number;
  sacrifices: Sacrifice[];
  leaderboard: LeaderEntry[];
  reincarnations: Reincarnation[];
  pulse: number;
  setMeta: (m: { status?: string; totalSacrifices?: number }) => void;
  setSacrifices: (s: Sacrifice[]) => void;
  addOptimistic: (s: Sacrifice) => void;
  setLeaderboard: (l: LeaderEntry[]) => void;
  setReincarnations: (r: Reincarnation[]) => void;
};

export const useThanatosStore = create<Store>((set) => ({
  status: "DORMANT",
  totalSacrifices: 0,
  sacrifices: [],
  leaderboard: [],
  reincarnations: [],
  pulse: 0,
  setMeta: (m) => set(m),
  setSacrifices: (incoming) =>
    set((s) => {
      const pending = s.sacrifices.filter((x) => x.pending && !incoming.some((y) => y.id === x.id));
      return { sacrifices: [...pending, ...incoming].slice(0, 30), pulse: s.pulse + 1 };
    }),
  addOptimistic: (x) => set((s) => ({ sacrifices: [x, ...s.sacrifices].slice(0, 30), pulse: s.pulse + 1 })),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setReincarnations: (reincarnations) => set({ reincarnations }),
}));
