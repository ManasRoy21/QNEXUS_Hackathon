import React from 'react';
import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'QDS Threat Detection Dashboard | Quantum SOC',
  description: 'Real-Time Quantum Digital Signatures (QDS) Threat Detection Operations Center',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-950">
        <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-wider text-cyan-400">QDS</span>
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                Threat Engine v1
              </span>
            </Link>
          </div>
          <nav className="flex items-center space-x-1 sm:space-x-4 text-sm font-medium">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-md hover:bg-slate-900 hover:text-cyan-300 text-slate-300 transition-colors"
            >
              Operations Console
            </Link>
            <Link
              href="/attacks"
              className="px-3 py-1.5 rounded-md hover:bg-slate-900 hover:text-rose-300 text-slate-300 transition-colors"
            >
              Attack Injection
            </Link>
            <Link
              href="/analytics"
              className="px-3 py-1.5 rounded-md hover:bg-slate-900 hover:text-indigo-300 text-slate-300 transition-colors"
            >
              Hoeffding Analytics
            </Link>
          </nav>
          <div className="hidden md:flex items-center space-x-3 text-xs text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span>FastAPI Backend :8000</span>
            </span>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
