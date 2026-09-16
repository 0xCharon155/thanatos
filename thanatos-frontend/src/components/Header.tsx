"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Code2 } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { robinhoodChain } from "@/config/wagmi";
import { useAltarState } from "@/hooks/useAltarState";

const STATUS = [
  { label: "EPOCH ACTIVE", dot: "bg-phosphor shadow-[0_0_8px_#4ade80]", text: "text-phosphor" },
  { label: "SEALED · EVALUATING", dot: "bg-amber-400 shadow-[0_0_8px_#fbbf24]", text: "text-amber-400" },
  { label: "REBIRTH IN PROGRESS", dot: "bg-purple-400 shadow-[0_0_8px_#c084fc]", text: "text-purple-400" },
];
const DORMANT = { label: "ALTAR NOT DEPLOYED", dot: "bg-bone/30", text: "text-bone/40" };

export function Header() {
  const a = useAltarState();
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const wrongChain = isConnected && chainId !== robinhoodChain.id;
  const st = a.deployed ? STATUS[a.phase] : DORMANT;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ash bg-void/80 px-5 py-3 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Link href="/"><Image src="/logo.svg" alt="THANATOS" width={40} height={40} className="h-10 w-10 drop-shadow-[0_0_12px_#dc2626] animate-flicker" priority /></Link>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-[0.3em] text-bone">THANATOS</div>
          <div className="text-[9px] tracking-[0.3em] text-bone/40">NECROMANCER PROTOCOL</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <nav className="hidden items-center gap-4 text-[10px] tracking-[0.2em] text-bone/50 md:flex">
          <Link href="/whitepaper" className="flex items-center gap-1 hover:text-bone"><BookOpen className="h-3 w-3" /> WHITEPAPER</Link>
          <a href="https://github.com/0xCharon155/thanatos" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-bone"><Code2 className="h-3 w-3" /> GITHUB</a>
        </nav>
        <span className={`hidden items-center gap-2 border border-ash px-3 py-1.5 text-[10px] tracking-[0.2em] sm:flex ${st.text}`}>
          <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${st.dot}`} />
          {st.label}
        </span>
        {wrongChain ? (
          <button onClick={() => switchChain({ chainId: robinhoodChain.id })} className="btn w-auto border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-void">
            SWITCH NETWORK
          </button>
        ) : (
          <ConnectButton showBalance accountStatus="address" chainStatus="none" />
        )}
      </div>
    </header>
  );
}
