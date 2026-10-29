import React from 'react';
import './globals.css';
import Link from 'next/link';
import { Fingerprint, ArrowUpRight } from 'lucide-react';

export const metadata = {
  title: 'QNexus | Integrity, Quantum Key Exchange & Entanglement',
  description: 'Seal images or text, test for changes, and explore quantum channel disturbance with a reproducible Qiskit Aer simulation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="min-h-screen flex flex-col antialiased">
    <div className="bg-[#172035] text-[#adb2c5] text-[9px] sm:text-[10px] py-2 px-5 text-center tracking-wide">A crash-test lab for digital trust <span className="mx-3 text-[#5d6478]">/</span> Qiskit experiments · Signed receipts · Optional IBM hardware</div>
    <header className="border-b border-[#e0e3e7] bg-[#f8f9fb]/95 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 h-[76px] flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 text-[#253045]" aria-label="QDS Lab home"><span className="h-9 w-9 border border-[#d4cee3] bg-[#eeebf5] rounded-lg grid place-items-center text-[#8c79ae]"><Fingerprint size={21} strokeWidth={1.5} /></span><span className="font-grotesk font-semibold text-lg tracking-tight">QDS<span className="font-normal text-[#9296a4] ml-1">Lab</span><span className="hidden sm:block text-[8px] uppercase tracking-[1.8px] text-[#9c9eac] font-mono mt-0.5">Observe. Challenge. Verify.</span></span></Link>
        <nav className="flex items-center flex-wrap justify-end gap-x-3 gap-y-1 sm:gap-x-5 text-[11px] text-[#8b91a0]" aria-label="Main navigation"><Link className="hover:text-[#6e5e9c]" href="/image-lab">Image lab</Link><Link className="hover:text-[#6e5e9c]" href="/text-lab">Text lab</Link><Link className="hover:text-[#6e5e9c]" href="/quantum-lab">Quantum lab</Link><Link className="hover:text-[#6e5e9c]" href="/workflow">Research<span className="hidden sm:inline"> workflow</span></Link><Link className="hidden md:inline hover:text-[#6e5e9c]" href="/experiments">Experiment engine</Link><a className="hidden sm:flex items-center gap-1 border border-[#dfe2e8] rounded-md px-3 py-2 text-[#5f6879] hover:bg-white" href="https://github.com/ManasRoy21/QNEXUS_Hackathon" target="_blank" rel="noreferrer">Source <ArrowUpRight size={12} /></a></nav>
      </div>
    </header>
    <main className="flex-1 w-full max-w-[1180px] mx-auto px-5 sm:px-8 py-7 sm:py-10">{children}</main>
    <footer className="border-t border-[#e0e3e7] mt-10"><div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-7 flex flex-wrap justify-between gap-4 text-[9px] text-[#9a9eaa]"><span>QDS Lab <span className="mx-2">/</span> Make the science visible.</span><span>Simulator experiments · Hardware runs labelled separately</span><Link href="/research">Research overview ↗</Link></div></footer>
  </body></html>;
}
