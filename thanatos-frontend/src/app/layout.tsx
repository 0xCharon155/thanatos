import type { Metadata } from "next";
import localFont from "next/font/local";
import { Web3Providers } from "@/components/Web3Providers";
import "./globals.css";

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://thanatosaltar.xyz"),
  title: "$THANATOS // Necromancer Protocol",
  description: "Incinerate dead tokens. Feed the altar. Claim the rebirth.",
  openGraph: {
    title: "$THANATOS // The Autonomous Necromancer",
    description: "Burn dead tokens, earn Karma, inherit every rebirth. Robinhood Chain.",
    url: "https://thanatosaltar.xyz",
    siteName: "THANATOS",
    images: [{ url: "/logo.png", width: 1080, height: 1080 }],
  },
  twitter: { card: "summary_large_image", site: "@ThanatosAltar", images: ["/logo.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistMono.variable} bg-black font-mono text-red-200 antialiased`}>
        <Web3Providers>{children}</Web3Providers>
      </body>
    </html>
  );
}
