"use client";
import { useEffect } from "react";
import { Gift } from "lucide-react";
import { formatUnits } from "viem";
import { useAccount, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { IS_DEPLOYED, REINCARNATOR_ADDRESS, reincarnatorAbi } from "@/config/contracts";
import { useAltarState } from "@/hooks/useAltarState";

const r = { address: REINCARNATOR_ADDRESS, abi: reincarnatorAbi } as const;
const LOOKBACK = 20;

/** Airdrops are pro-rata by epoch karma and read straight from the Reincarnator (◆ on-chain). */
export function AirdropClaim() {
  const { address } = useAccount();
  const { epoch } = useAltarState();
  const epochs = Array.from({ length: Math.min(LOOKBACK, Math.max(0, epoch - 1)) }, (_, i) => BigInt(epoch - 1 - i));
  const enabled = IS_DEPLOYED && !!address && epochs.length > 0;
  const amounts = useReadContracts({
    contracts: epochs.map((e) => ({ ...r, functionName: "airdropOf" as const, args: [e, address!] as const })),
    query: { enabled, refetchInterval: 30_000 },
  });
  const claimed = useReadContracts({
    contracts: epochs.map((e) => ({ ...r, functionName: "claimed" as const, args: [e, address!] as const })),
    query: { enabled, refetchInterval: 30_000 },
  });
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });
  useEffect(() => { if (receipt.isSuccess) claimed.refetch(); }, [receipt.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = epochs
    .map((e, i) => ({ epoch: e, amount: (amounts.data?.[i]?.result as bigint | undefined) ?? 0n, done: claimed.data?.[i]?.result === true }))
    .filter((x) => x.amount > 0n && !x.done);
  if (!address || open.length === 0) return null;

  return (
    <div className="panel border-flame/40 p-5 text-xs">
      <h3 className="panel-title"><Gift className="h-3 w-3 text-flame" /> YOUR AIRDROPS <span className="text-flame">◆</span></h3>
      {open.map((x) => (
        <div key={String(x.epoch)} className="mb-2 flex items-center justify-between border border-ash px-3 py-2">
          <span className="text-bone/80">Epoch #{String(x.epoch)} · {Number(formatUnits(x.amount, 18)).toLocaleString()} tokens</span>
          <button
            onClick={() => write.writeContract({ ...r, functionName: "claimAirdrop", args: [x.epoch] })}
            disabled={write.isPending || receipt.isLoading}
            className="btn-flame w-auto px-3 py-1"
          >
            CLAIM
          </button>
        </div>
      ))}
      {write.error && <div className="text-amber-400">{write.error.message.split("\n")[0]}</div>}
    </div>
  );
}
