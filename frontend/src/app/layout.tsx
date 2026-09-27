import React from 'react';
import './globals.css';
import Link from 'next/link';
import { ShieldCheck, Activity, Cpu, Sparkles, Binary, Lock, ArrowUpRight } from 'lucide-react';

export const metadata = {
  title: 'QDS Threat Detection Engine | Quantum Operations & Research',
  description: 'Deterministic Information-Theoretic Security (ITS) and Hoeffding Bound Evaluation for Quantum Digital Signatures.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8FAF9] text-[#071842] antialiased selection:bg-[#20C8A7] selection:text-[#040B1E] flex flex-col justify-between">
        {/* Top Technical Notice Bar */}
        <div className="bg-[#071842] text-white text-[11px] font-mono py-1.5 px-4 sm:px-6 border-b border-[#0B1E4E]">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center space-x-1.5 text-[#20C8A7]">
                <span className="h-2 w-2 rounded-full bg-[#20C8A7] animate-pulse"></span>
                <span className="font-semibold uppercase tracking-wider">QUANTUM SIMULATION PLATFORM</span>
              </span>
              <span className="hidden md:inline text-[#94A3B8]">|</span>
              <span className="hidden md:inline text-[#94A3B8]">
                Quantum Digital Signature Simulation &amp; Benchmarking Engine
              </span>
            </div>
            <div className="flex items-center space-x-4 text-[#94A3B8]">
              <span className="hidden sm:inline bg-[#E6FBF7]/20 text-[#20C8A7] px-2 py-0.5 rounded border border-[#20C8A7]/40 font-mono font-bold">
                SIMULATED QUANTUM RUNS
              </span>
              <span className="hidden sm:inline">·</span>
              <span>Baseline: <strong className="text-white font-mono">Practical QDS (Yin, Fu &amp; Chen)</strong></span>
            </div>
          </div>
        </div>

        {/* Quvora-Styled Institutional Header */}
        <header className="sticky top-0 z-50 bg-[#F8FAF9]/95 backdrop-blur-md border-b border-[#CBD5E1] transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="w-10 h-10 rounded-lg bg-[#071842] flex items-center justify-center text-[#20C8A7] shadow-sm group-hover:scale-105 transition-transform">
                  <Binary className="w-5 h-5 text-[#20C8A7]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-grotesk font-bold text-lg text-[#071842] tracking-tight">
                      QDS
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-[#F1F5F9] border border-[#CBD5E1] text-[#071842] font-semibold">
                      SIMULATION ENGINE
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-[#64748B] hidden sm:block tracking-wide uppercase">
                    Protocol Simulation &amp; Verification
                  </p>
                </div>
              </Link>
            </div>

            {/* Main Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-xs font-mono font-medium">
              <Link
                href="/"
                className="px-3.5 py-2 rounded-md text-[#475569] hover:text-[#071842] hover:bg-slate-100 transition-colors uppercase tracking-wider"
              >
                Overview
              </Link>
              <Link
                href="/workflow"
                className="px-3.5 py-2 rounded-md bg-[#071842] text-[#20C8A7] hover:bg-[#0c2464] font-bold transition-colors uppercase tracking-wider shadow-xs"
              >
                7-Step Research Workflow
              </Link>
              <Link
                href="/benchmarks"
                className="px-3.5 py-2 rounded-md text-[#475569] hover:text-[#071842] hover:bg-slate-100 transition-colors uppercase tracking-wider"
              >
                Benchmarks &amp; Sweeps
              </Link>
            </nav>

            {/* Right Action & Live Backend Status */}
            <div className="flex items-center space-x-3">
              <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded bg-[#F1F5F9] border border-[#E2E8F0] text-[11px] font-mono text-[#475569]">
                <span className="h-2 w-2 rounded-full bg-[#20C8A7] animate-pulse"></span>
                <span>FastAPI :8000</span>
              </div>
              <Link
                href="/workflow"
                className="btn-dark text-xs font-mono font-semibold px-4 py-2 rounded-md inline-flex items-center space-x-1.5 shadow-sm"
              >
                <span>Launch Workflow</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {children}
        </main>

        {/* Quvora-Styled Deep Navy Technical Footer */}
        <footer className="bg-[#071842] text-white border-t border-[#0B1E4E] mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-slate-800">
              <div className="md:col-span-5 space-y-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded bg-[#0B1E4E] border border-[#1D293D] flex items-center justify-center text-[#20C8A7]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="font-grotesk font-bold text-lg tracking-wider text-white">
                    QDS THREAT DETECTION
                  </span>
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed max-w-md font-sans">
                  Deterministic simulation and threat detection engine for multi-party quantum digital signatures (QDS). Evaluates Information-Theoretic Security (ITS) based on physical Born-rule measurement distributions, protocol thresholds (T_a, T_v), and finite-key statistical bounds.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-[11px] font-mono bg-[#0B1E4E] text-[#20C8A7] border border-[#1D293D] px-2.5 py-1 rounded">
                    Zero-AI Deterministic
                  </span>
                  <span className="text-[11px] font-mono bg-[#0B1E4E] text-slate-300 border border-[#1D293D] px-2.5 py-1 rounded">
                    Protocol-Aware Attacks
                  </span>
                  <span className="text-[11px] font-mono bg-[#0B1E4E] text-slate-300 border border-[#1D293D] px-2.5 py-1 rounded">
                    Statistical Security Bounds
                  </span>
                </div>
              </div>

              <div className="md:col-span-3 space-y-3 font-sans">
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#94A3B8] font-semibold">
                  Canonical Threats
                </h4>
                <ul className="space-y-2 text-xs font-mono text-[#CBD5E1]">
                  <li>01. FR-E1 Signature Forgery (ε₁)</li>
                  <li>02. FR-E2 Dishonest Alice Repudiation (ε₂)</li>
                  <li>03. FR-E3 Intercept-Resend (Eve QBER)</li>
                  <li>04. FR-E4 Detector Blinding (Side-Channel)</li>
                  <li>05. FR-B3 Photon Number Splitting (PNS)</li>
                </ul>
              </div>

              <div className="md:col-span-4 space-y-3 font-sans">
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#94A3B8] font-semibold">
                  Theoretical Foundations
                </h4>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Practical QDS (Yin, Fu &amp; Chen, Phys. Rev. A 2016) reference parameterization with conclusive bit postselection and 4 statistical bound evaluation regimes (Hoeffding, Chernoff, Random Sampling, Protocol Bound).
                </p>
                <div className="pt-2 text-xs font-mono text-[#20C8A7]">
                  ε_sec = ε₁ (forgery) + ε₂ (repudiation)
                </div>
              </div>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#64748B]">
              <div>
                © {new Date().getFullYear()} QDS Threat Detection Engine. All rights reserved.
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/workflow" className="hover:text-white transition-colors">
                  Research Workflow
                </Link>
                <span>·</span>
                <Link href="/benchmarks" className="hover:text-white transition-colors">
                  Benchmarks &amp; Sweeps
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
