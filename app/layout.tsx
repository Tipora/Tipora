import type { Metadata } from "next";
import Link from "next/link";
import { MobileNav } from "@/components/ui/MobileNav";
import { AuthNav } from "@/components/ui/AuthNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tipora — Finding the angle the market missed",
  description: "Data-driven football tips with full P&L tracking. Daily tips, accumulators and transparent results.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-100">
        <header className="relative border-b border-zinc-800">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-xl font-bold tracking-tight text-white">
              tipora<span className="text-emerald-400">.</span>bet
            </Link>
            <div className="hidden items-center gap-6 text-sm sm:flex">
              <Link href="/tips" className="text-zinc-400 hover:text-white transition-colors">Tips</Link>
              <Link href="/tips/acca/game" className="text-zinc-400 hover:text-white transition-colors">Game Acca</Link>
              <Link href="/tips/acca/weekend" className="text-zinc-400 hover:text-white transition-colors">Weekend Acca</Link>
              <Link href="/tracker" className="text-zinc-400 hover:text-white transition-colors">Tracker</Link>
              <AuthNav />
            </div>
            <MobileNav />
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-600">
          <div className="mx-auto max-w-6xl px-4">
            <p>Tipora does not place bets. 18+ only. Please gamble responsibly.</p>
            <div className="mt-2 flex justify-center gap-4">
              <Link href="/about" className="hover:text-zinc-400">About</Link>
              <Link href="/faq" className="hover:text-zinc-400">FAQ</Link>
              <Link href="/responsible-gambling" className="hover:text-zinc-400">Responsible Gambling</Link>
              <Link href="/terms" className="hover:text-zinc-400">Terms</Link>
              <Link href="/privacy" className="hover:text-zinc-400">Privacy</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
