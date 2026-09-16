"use client";
import { useReadContracts } from "wagmi";
import { formatEther } from "viem";
import { ALTAR_ADDRESS, altarAbi, IS_DEPLOYED } from "@/config/contracts";

export type AltarState = {
  deployed: boolean;
  epoch: number;
  phase: 0 | 1 | 2;
  epochEndsAt: number;
  soulWeight: number;
  soulTarget: number;
  treasuryEth: number;
  totalDistributedEth: number;
  altarFeeWei: bigint;
  loading: boolean;
};

const c = { address: ALTAR_ADDRESS, abi: altarAbi } as const;
const K = 1e18;

/** All numbers come from contract views (◆ on-chain). Firestore is not consulted here. */
export function useAltarState(): AltarState {
  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...c, functionName: "epoch" },
      { ...c, functionName: "phase" },
      { ...c, functionName: "epochEndsAt" },
      { ...c, functionName: "soulWeight" },
      { ...c, functionName: "soulTarget" },
      { ...c, functionName: "treasury" },
      { ...c, functionName: "totalDistributed" },
      { ...c, functionName: "altarFee" },
    ],
    query: { enabled: IS_DEPLOYED, refetchInterval: 12_000 },
  });
  const r = (i: number) => data?.[i]?.result as bigint | number | undefined;
  return {
    deployed: IS_DEPLOYED,
    epoch: Number(r(0) ?? 0),
    phase: Number(r(1) ?? 0) as 0 | 1 | 2,
    epochEndsAt: Number(r(2) ?? 0) * 1000,
    soulWeight: Number(r(3) ?? 0n) / K,
    soulTarget: Number(r(4) ?? 0n) / K,
    treasuryEth: Number(formatEther((r(5) as bigint) ?? 0n)),
    totalDistributedEth: Number(formatEther((r(6) as bigint) ?? 0n)),
    altarFeeWei: (r(7) as bigint) ?? 0n,
    loading: IS_DEPLOYED && isLoading,
  };
}
