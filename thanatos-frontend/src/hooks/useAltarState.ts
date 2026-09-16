"use client";
import { useReadContracts } from "wagmi";
import { formatEther } from "viem";
import { ALTAR_ADDRESS, altarAbi, escrowAbi, IS_DEPLOYED, PONS_FEE_ESCROW } from "@/config/contracts";

export type AltarState = {
  deployed: boolean;
  epoch: number;
  phase: 0 | 1;
  epochEndsAt: number;
  soulWeight: number;
  soulTarget: number;
  treasuryEth: number;
  buybackReserveEth: number;
  uncollectedEth: number;
  totalDistributedEth: number;
  altarFeeWei: bigint;
  loading: boolean;
};

const c = { address: ALTAR_ADDRESS, abi: altarAbi } as const;
const K = 1e18;
const eth = (v: unknown) => Number(formatEther((v as bigint) ?? 0n));

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
      { ...c, functionName: "buybackReserve" },
      { ...c, functionName: "totalDistributed" },
      { ...c, functionName: "altarFee" },
      { address: PONS_FEE_ESCROW, abi: escrowAbi, functionName: "balanceOf", args: [ALTAR_ADDRESS] },
    ],
    query: { enabled: IS_DEPLOYED, refetchInterval: 12_000 },
  });
  const r = (i: number) => data?.[i]?.result;
  return {
    deployed: IS_DEPLOYED,
    epoch: Number(r(0) ?? 0),
    phase: Number(r(1) ?? 0) as 0 | 1,
    epochEndsAt: Number(r(2) ?? 0) * 1000,
    soulWeight: Number(r(3) ?? 0n) / K,
    soulTarget: Number(r(4) ?? 0n) / K,
    treasuryEth: eth(r(5)),
    buybackReserveEth: eth(r(6)),
    totalDistributedEth: eth(r(7)),
    altarFeeWei: (r(8) as bigint) ?? 0n,
    uncollectedEth: eth(r(9)),
    loading: IS_DEPLOYED && isLoading,
  };
}
