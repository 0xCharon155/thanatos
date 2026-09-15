import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        void: "#050505",
        ash: "#1a1a1d",
        bone: "#e7e0d6",
        ember: "#dc2626",
        flame: "#f97316",
        phosphor: "#4ade80",
      },
      fontFamily: { mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"] },
      keyframes: {
        flicker: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.85" } },
        glow: { "0%,100%": { boxShadow: "0 0 12px #dc262655" }, "50%": { boxShadow: "0 0 28px #dc2626aa" } },
      },
      animation: { flicker: "flicker 3s infinite", glow: "glow 2.5s ease-in-out infinite" },
    },
  },
  plugins: [],
};
export default config;
