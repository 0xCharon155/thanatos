"use client";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ALTAR_ADDRESS, altarAbi, IS_DEPLOYED } from "@/config/contracts";

/** Fee share (◆ on-chain): claimable() sums per-epoch pools by the wallet's epoch karma. */
export function useFeeShareClaim() {
  const { address } = useAccount();
  const claimable = useReadContract({
    address: ALTAR_ADDRESS,
    abi: altarAbi,
    functionName: "claimable",
    args: address ? [address] : undefined,
    query: { enabled: IS_DEPLOYED && !!address, refetchInterval: 15_000 },
  });
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });
  const claim = () => write.writeContract({ address: ALTAR_ADDRESS, abi: altarAbi, functionName: "claim" });
  return { claimable: claimable.data ?? 0n, claim, isPending: write.isPending || receipt.isLoading, isSuccess: receipt.isSuccess, error: write.error, refetch: claimable.refetch };
}
