"use client";
import { useEffect, useRef } from "react";
import { useThanatosStore } from "@/store/useThanatosStore";

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number };

export function NecroPitCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const altar = useThanatosStore((s) => s.altar);
  const pulse = useThanatosStore((s) => s.pulse);
  const shock = useRef(0);
  const ratio = useRef(0);

  useEffect(() => {
    ratio.current = Math.min(1, altar.soulWeightCurrent / altar.soulWeightTarget);
  }, [altar]);

  useEffect(() => {
    if (pulse > 0) shock.current = 1;
  }, [pulse]);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const parts: P[] = [];
    let raf = 0;
    let last = performance.now();
    let scale = window.innerWidth < 768 ? 0.3 : 1;
    let slow = 0;

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = () => {
      const { width: w, height: h } = canvas;
      const a = Math.random() * Math.PI * 2;
      const d = 20 + Math.random() * 40;
      parts.push({
        x: w / 2 + Math.cos(a) * d,
        y: h * 0.75 + Math.sin(a) * d * 0.3,
        vx: (Math.random() - 0.5) * (1 + ratio.current * 3),
        vy: -(1 + Math.random() * 2 + ratio.current * 3),
        life: 0,
        max: 60 + Math.random() * 60,
        r: 1 + Math.random() * 2,
      });
    };

    const frame = (t: number) => {
      const dt = t - last;
      last = t;
      if (dt > 22) slow++;
      else slow = Math.max(0, slow - 1);
      if (slow > 30) scale = 0.3;

      const { width: w, height: h } = canvas;
      ctx.fillStyle = "rgba(5,5,5,0.28)";
      ctx.fillRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(w / 2, h * 0.75, 10, w / 2, h * 0.75, w * 0.45);
      glow.addColorStop(0, `rgba(220,38,38,${0.10 + ratio.current * 0.25})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      const target = (60 + ratio.current * 240) * scale;
      for (let i = 0; i < (shock.current > 0 ? 40 : 3) && parts.length < target + 200; i++) spawn();

      for (let r = 0; r < 3; r++) {
        ctx.beginPath();
        ctx.ellipse(w / 2, h * 0.75 + r * 6, 90 - r * 12, 24 - r * 4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(220,38,38,${0.5 - r * 0.15})`;
        ctx.lineWidth = r === 0 ? 2 : 1;
        ctx.stroke();
      }
      ctx.lineWidth = 1;

      if (shock.current > 0) {
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.75, (1 - shock.current) * w * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,80,40,${shock.current})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.lineWidth = 1;
        shock.current -= 0.03;
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life++;
        p.x += p.vx + Math.sin(p.life / 10) * 0.5;
        p.y += p.vy;
        if (p.life > p.max) {
          parts.splice(i, 1);
          continue;
        }
        const a = 1 - p.life / p.max;
        const lum = 40 + ratio.current * 60;
        ctx.fillStyle = `hsla(${10 + ratio.current * 25},100%,${lum}%,${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const pct = Math.min(100, (altar.soulWeightCurrent / altar.soulWeightTarget) * 100);
  return (
    <div className="panel flex h-full flex-col overflow-hidden">
      <canvas ref={ref} className="min-h-[320px] w-full flex-1" />
      <div className="border-t border-ash p-3 text-center text-[10px] tracking-[0.2em] text-bone/50">
        SOUL BAR: {altar.soulWeightCurrent.toFixed(0)}/{altar.soulWeightTarget.toFixed(0)}
        <div className="mt-2 h-1.5 w-full bg-ash">
          <div className="h-full bg-gradient-to-r from-ember to-flame shadow-[0_0_10px_#f97316] transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
