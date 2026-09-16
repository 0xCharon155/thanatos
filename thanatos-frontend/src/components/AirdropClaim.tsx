"use client";
import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { formatUnits } from "viem";
import { useAccount, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { db } from "@/config/firebase";
import { IS_DEPLOYED, REINCARNATOR_ADDRESS, reincarnatorAbi } from "@/config/contracts";
import type { AirdropEntry } from "@/store/useThanatosStore";

export function AirdropClaim() {
  const { address } = useAccount();
  const [entries, setEntries] = useState<AirdropEntry[]>([]);
  useEffect(() => {
    if (!address) return setEntries([]);
    getDocs(query(collection(db, "airdrops"), where("wallet", "==", address.toLowerCase())))
      .then((s) => setEntries(s.docs.map((d) => d.data() as AirdropEntry)))
      .catch(() => {});
  }, [address]);

  const claimedReads = useReadContracts({
    contracts: entries.map((e) => ({ address: REINCARNATOR_ADDRESS, abi: reincarnatorAbi, functionName: "claimed" as const, args: [BigInt(e.epoch), address!] })),
    query: { enabled: IS_DEPLOYED && !!address && entries.length > 0 },
  });
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });
  useEffect(() => { if (receipt.isSuccess) claimedReads.refetch(); }, [receipt.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = entries.filter((_, i) => claimedReads.data?.[i]?.result === false);
  if (!address || entries.length === 0) return null;

  return (
    <div className="panel border-flame/40 p-5 text-xs">
      <h3 className="panel-title"><Gift className="h-3 w-3 text-flame" /> YOUR AIRDROPS <span className="text-flame">◆</span></h3>
      {open.length === 0 && <div className="text-bone/40">All claimed.</div>}
      {open.map((e) => (
        <div key={e.epoch} className="mb-2 flex items-center justify-between border border-ash px-3 py-2">
          <span className="text-bone/80">Epoch #{e.epoch} · {Number(formatUnits(BigInt(e.amount), 18)).toLocaleString()} tokens</span>
          <button
            onClick={() => write.writeContract({ address: REINCARNATOR_ADDRESS, abi: reincarnatorAbi, functionName: "claimAirdrop", args: [BigInt(e.epoch), BigInt(e.amount), e.proof] })}
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
