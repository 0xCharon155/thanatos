import { create } from "zustand";

export type AltarStatus = "ACTIVE_BURNING" | "EPOCH_EVALUATING" | "REBIRTH_MINTING";

export type AltarState = {
  epoch: number;
  status: AltarStatus;
  deathClockEnd: number;
  soulWeightCurrent: number;
  soulWeightTarget: number;
  treasuryEth: number;
  dividendEth: number;
  totalSacrifices: number;
};

export type Sacrifice = {
  id: string;
  wallet: string;
  amount: string;
  symbol: string;
  soulWeight: number;
  clockBonusMin: number;
  timestamp: number;
  pending?: boolean;
};

export type LeaderEntry = { wallet: string; karma: number; epochKarma: number; burns: number };
export type Reincarnation = { epoch: number; name: string; symbol: string; token: string; tx: string; createdAt: number };

type Store = {
  altar: AltarState;
  sacrifices: Sacrifice[];
  leaderboard: LeaderEntry[];
  reincarnations: Reincarnation[];
  pulse: number;
  setAltar: (a: Partial<AltarState>) => void;
  setSacrifices: (s: Sacrifice[]) => void;
  addOptimistic: (s: Sacrifice) => void;
  setLeaderboard: (l: LeaderEntry[]) => void;
  setReincarnations: (r: Reincarnation[]) => void;
};

export const useThanatosStore = create<Store>((set) => ({
  altar: {
    epoch: 1,
    status: "ACTIVE_BURNING",
    deathClockEnd: Date.now() + 48 * 3600 * 1000,
    soulWeightCurrent: 0,
    soulWeightTarget: 1000,
    treasuryEth: 0,
    dividendEth: 0,
    totalSacrifices: 0,
  },
  sacrifices: [],
  leaderboard: [],
  reincarnations: [],
  pulse: 0,
  setAltar: (a) => set((s) => ({ altar: { ...s.altar, ...a } })),
  setSacrifices: (incoming) =>
    set((s) => {
      const pending = s.sacrifices.filter((x) => x.pending && !incoming.some((y) => y.id === x.id));
      return { sacrifices: [...pending, ...incoming].slice(0, 30), pulse: s.pulse + 1 };
    }),
  addOptimistic: (x) => set((s) => ({ sacrifices: [x, ...s.sacrifices].slice(0, 30), pulse: s.pulse + 1 })),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setReincarnations: (reincarnations) => set({ reincarnations }),
}));
