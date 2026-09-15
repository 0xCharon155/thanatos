"use client";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { FEE_SPLITTER_ADDRESS, feeSplitterAbi } from "@/config/contracts";

export function useDividendClaim() {
  const { address } = useAccount();
  const claimable = useReadContract({
    address: FEE_SPLITTER_ADDRESS,
    abi: feeSplitterAbi,
    functionName: "claimable",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });
  const total = useReadContract({
    address: FEE_SPLITTER_ADDRESS,
    abi: feeSplitterAbi,
    functionName: "totalDistributed",
    query: { refetchInterval: 30_000 },
  });
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });

  const claim = () =>
    write.writeContract({ address: FEE_SPLITTER_ADDRESS, abi: feeSplitterAbi, functionName: "claimDividends" });

  return {
    claimable: claimable.data ?? 0n,
    totalDistributed: total.data ?? 0n,
    claim,
    isPending: write.isPending || receipt.isLoading,
    isSuccess: receipt.isSuccess,
    error: write.error,
    refetch: claimable.refetch,
  };
}
