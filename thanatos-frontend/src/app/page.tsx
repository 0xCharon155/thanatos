import { HowItWorks } from "@/components/HowItWorks";
import { Hero } from "@/components/Hero";
import { Header } from "@/components/Header";
import { MetricStrip } from "@/components/MetricStrip";
import { IncineratorForm } from "@/components/IncineratorForm";
import { NecroPitCanvas } from "@/components/NecroPitCanvas";
import { TelemetryTerminal } from "@/components/TelemetryTerminal";
import { Leaderboard } from "@/components/Leaderboard";
import { Reincarnations } from "@/components/Reincarnations";
import { DividendModule } from "@/components/DividendModule";

export default function Page() {
  return (
    <main className="min-h-screen">
      <div className="fixed inset-0 -z-10 opacity-[0.035] [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22n%22><feTurbulence baseFrequency=%220.9%22/></filter><rect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22/></svg>')]" />
      <Header />
      <Hero />
      <MetricStrip />
      <section className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_1.5fr_1fr] lg:min-h-[480px]">
        <IncineratorForm />
        <NecroPitCanvas />
        <TelemetryTerminal />
      </section>
      <HowItWorks />
      <section className="px-4 pb-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-ash" />
          <h2 className="text-[10px] tracking-[0.3em] text-bone/40">CIRCULAR ECONOMY &amp; LEADERBOARDS</h2>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-ash" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Leaderboard />
          <DividendModule />
          <Reincarnations />
        </div>
      </section>
          <footer className="border-t border-ash px-5 py-6 text-center text-[10px] tracking-[0.2em] text-bone/30">
        THANATOS PROTOCOL · AUTONOMOUS · NON-CUSTODIAL · <a href="https://x.com/ThanatosAltar" target="_blank" rel="noreferrer" className="text-ember hover:text-flame">@THANATOSALTAR</a>
      </footer>
    </main>
  );
}
