"use client";
import Link from "next/link";
import { useSacrificeLogs } from "@/hooks/useSacrificeLogs";
import { Reincarnations } from "@/components/Reincarnations";

export default function ArchivePage() {
  useSacrificeLogs();
  return (
    <main className="mx-auto min-h-screen max-w-2xl p-6">
      <Link href="/" className="text-[10px] tracking-[0.2em] text-ember hover:text-flame">← ALTAR</Link>
      <div className="mt-4">
        <Reincarnations full />
      </div>
    </main>
  );
}
