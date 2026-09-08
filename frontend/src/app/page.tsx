import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Binary,
  Cpu,
  Activity,
  ArrowRight,
  ExternalLink,
  Lock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-16 lg:space-y-24">
      {/* ── Hero Section with Blueprint Texture ── */}
      <section className="relative bg-blueprint rounded-2xl border border-[#CBD5E1] p-8 sm:p-12 lg:p-16 overflow-hidden shadow-sm">
        <div className="relative z-10 max-w-4xl space-y-6">
          <div className="inline-flex items-center space-x-2 bg-white/90 border border-[#CBD5E1] px-3 py-1 rounded-full text-xs font-mono text-[#071842] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#20C8A7] animate-pulse"></span>
            <span className="font-semibold tracking-wider uppercase">
              CATEGORY: QUANTUM DIGITAL SIGNATURES (CV-QDS)
            </span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#071842] leading-[1.12] tracking-tight">
            Where Quantum Cryptography Becomes Defensible Threat Detection.
          </h1>

          <p className="font-sans text-base sm:text-lg text-[#334155] leading-relaxed max-w-2xl font-normal">
            Information-Theoretic Security (ITS) for multi-party digital signatures. Built on physical Born-rule measurement perturbations and finite-key Hoeffding concentration bounds—eliminating both classical factorization and post-quantum algorithmic vulnerabilities.
          </p>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 font-mono">
            <Link
              href="/dashboard"
              className="btn-dark px-6 py-3 rounded-lg text-sm font-semibold inline-flex items-center space-x-2 shadow-md"
            >
              <span>Launch Operations Console</span>
              <ArrowRight className="w-4 h-4 text-[#20C8A7]" />
            </Link>
            <Link
              href="/attacks"
              className="px-6 py-3 rounded-lg text-sm font-semibold bg-white border border-[#CBD5E1] text-[#071842] hover:bg-slate-50 transition-colors inline-flex items-center space-x-2"
            >
              <span>Inject Attack Vectors</span>
              <Zap className="w-4 h-4 text-[#20C8A7]" />
            </Link>
            <Link
              href="/analytics"
              className="px-6 py-3 rounded-lg text-sm font-semibold bg-white border border-[#CBD5E1] text-[#071842] hover:bg-slate-50 transition-colors inline-flex items-center space-x-2"
            >
              <span>Statistical Analytics</span>
              <Activity className="w-4 h-4 text-[#263EDC]" />
            </Link>
          </div>
        </div>

        {/* Decorative Watermark / Geometric Accent */}
        <div className="absolute right-[-40px] bottom-[-40px] opacity-10 pointer-events-none hidden lg:block">
          <Binary className="w-96 h-96 text-[#071842]" />
        </div>
      </section>

      {/* ── Empirical Performance Metric Cards (Quvora Numbered Card Style) ── */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#CBD5E1] pb-4">
          <div>
            <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider block">
              EMPIRICAL BENCHMARKS
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#071842]">
              Deterministic Protocol Performance
            </h2>
          </div>
          <span className="text-xs font-mono text-[#64748B]">
            Automated Day 10 Benchmark Suite (70 Protocol Runs)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Metric 1 */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 sm:p-6 shadow-xs hover:border-[#071842]/40 transition-all group">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-3 text-xs font-mono">
              <span className="text-[#64748B] uppercase tracking-wider">DETECTION</span>
              <span className="font-bold text-[#071842] text-sm">01</span>
            </div>
            <div className="text-3xl sm:text-4xl font-mono font-black text-[#071842] tracking-tight mb-1">
              100.0%
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              Empirical threat detection accuracy across all 6 quantum and classical attack vectors.
            </p>
          </div>

          {/* Metric 2 */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 sm:p-6 shadow-xs hover:border-[#071842]/40 transition-all group">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-3 text-xs font-mono">
              <span className="text-[#64748B] uppercase tracking-wider">FALSE ALARM</span>
              <span className="font-bold text-[#071842] text-sm">02</span>
            </div>
            <div className="text-3xl sm:text-4xl font-mono font-black text-[#20C8A7] tracking-tight mb-1">
              0.00%
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              Zero false positives under channel thermal noise thanks to Hoeffding statistical bounds.
            </p>
          </div>

          {/* Metric 3 */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 sm:p-6 shadow-xs hover:border-[#071842]/40 transition-all group">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-3 text-xs font-mono">
              <span className="text-[#64748B] uppercase tracking-wider">VERIFY SLA</span>
              <span className="font-bold text-[#071842] text-sm">03</span>
            </div>
            <div className="text-3xl sm:text-4xl font-mono font-black text-[#071842] tracking-tight mb-1">
              1.50ms
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              Sub-2ms verification latency enabling real-time cyber-quantum SOC stream processing.
            </p>
          </div>

          {/* Metric 4 */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 sm:p-6 shadow-xs hover:border-[#071842]/40 transition-all group">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-3 text-xs font-mono">
              <span className="text-[#64748B] uppercase tracking-wider">POSTSELECTION</span>
              <span className="font-bold text-[#071842] text-sm">04</span>
            </div>
            <div className="text-3xl sm:text-4xl font-mono font-black text-[#263EDC] tracking-tight mb-1">
              97.0%
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              Observed empirical yield surpassing the theoretical threshold (Yield ≥ 95%).
            </p>
          </div>
        </div>
      </section>

      {/* ── Tripartite Quantum Architecture (Quvora Research Section) ── */}
      <section className="space-y-6">
        <div className="border-b border-[#CBD5E1] pb-4">
          <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider block">
            PROTOCOL ARCHITECTURE
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#071842]">
            Tripartite Bell Distribution & Finite-Key Guard
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 flex flex-col justify-between shadow-xs hover:border-[#071842]/40 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 text-xs font-mono">
                <span className="font-bold text-[#64748B] uppercase tracking-wider">
                  SIGNER MODULE A
                </span>
                <span className="font-bold text-[#071842] text-sm">01</span>
              </div>
              <h3 className="text-lg font-bold text-[#071842] font-grotesk">
                Alice Pauli State Encoding
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                Alice encodes classical digest elements into physical Pauli eigenstates &#123;|0⟩, |1⟩, |+⟩, |-⟩&#125;. Eavesdropping by Eve irrevocably collapses the wavefunction via Born-rule projective disturbance.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E2E8F0] mt-4 flex items-center justify-between text-xs font-mono text-[#071842]">
              <span className="text-[#64748B]">Transit Channels</span>
              <span className="font-semibold text-[#20C8A7]">Fiber 1 &amp; Fiber 2</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 flex flex-col justify-between shadow-xs hover:border-[#071842]/40 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 text-xs font-mono">
                <span className="font-bold text-[#64748B] uppercase tracking-wider">
                  GUARD MODULE G
                </span>
                <span className="font-bold text-[#071842] text-sm">02</span>
              </div>
              <h3 className="text-lg font-bold text-[#071842] font-grotesk">
                Module G Symmetrization
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                Bob and Charlie swap 50% of their received signature registers through an encrypted classical channel without Alice&apos;s knowledge, neutralizing dishonest-Alice repudiation attacks.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E2E8F0] mt-4 flex items-center justify-between text-xs font-mono text-[#071842]">
              <span className="text-[#64748B]">Repudiation Protection</span>
              <span className="font-semibold text-[#263EDC]">Alice Blind Swapping</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 flex flex-col justify-between shadow-xs hover:border-[#071842]/40 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 text-xs font-mono">
                <span className="font-bold text-[#64748B] uppercase tracking-wider">
                  STATISTICAL MODULE C
                </span>
                <span className="font-bold text-[#071842] text-sm">03</span>
              </div>
              <h3 className="text-lg font-bold text-[#071842] font-grotesk">
                Hoeffding Bound Evaluator
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                Module C dynamically computes finite-key robustness ($e_&#123;rob&#125; \approx 6.58\%$), repudiation ($e_&#123;rep&#125; \approx 13.58\%$), and forgery ($e_&#123;forg&#125; \approx 20.58\%$) bounds to guarantee mathematical security.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E2E8F0] mt-4 flex items-center justify-between text-xs font-mono text-[#071842]">
              <span className="text-[#64748B]">Evaluation Method</span>
              <span className="font-semibold text-[#071842]">Deterministic Bounds</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Threat Detection Matrix Table ── */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#CBD5E1] pb-4">
          <div>
            <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider block">
              COVERAGE MATRIX
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#071842]">
              100% Deterministic Attack Coverage
            </h2>
          </div>
          <Link
            href="/attacks"
            className="text-xs font-mono font-semibold text-[#071842] hover:text-[#263EDC] inline-flex items-center space-x-1"
          >
            <span>Launch Attack Suite</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto bg-white border border-[#CBD5E1] rounded-xl shadow-xs">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#F8FAF9] border-b border-[#CBD5E1] text-[#64748B] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Threat Class</th>
                <th className="py-3 px-4 font-semibold">Attack Mechanism</th>
                <th className="py-3 px-4 font-semibold">Detection Layer</th>
                <th className="py-3 px-4 font-semibold">Breach Trigger</th>
                <th className="py-3 px-4 font-semibold">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[#334155]">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-[#071842]">INTERCEPT_RESEND</td>
                <td className="py-3 px-4 font-sans">Fiber tapping; unaligned projective measurement</td>
                <td className="py-3 px-4">Born-Rule QBER</td>
                <td className="py-3 px-4 text-rose-600 font-semibold">QBER &gt; e_rep (13.58%)</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">CRITICAL</span></td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-[#071842]">FORGERY</td>
                <td className="py-3 px-4 font-sans">Tampering with message hash / eigenstates</td>
                <td className="py-3 px-4">Hamming Disagreement</td>
                <td className="py-3 px-4 text-amber-600 font-semibold">Hamming &gt; e_forg (20.58%)</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">HIGH</span></td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-[#071842]">IMPERSONATION</td>
                <td className="py-3 px-4 font-sans">Adversary (Mallory) forged public key</td>
                <td className="py-3 px-4">PKI Credential Inspector</td>
                <td className="py-3 px-4 text-amber-600 font-semibold">Key ≠ Authorized Alice</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">HIGH</span></td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-[#071842]">REPLAY</td>
                <td className="py-3 px-4 font-sans">Replaying historic valid signature block</td>
                <td className="py-3 px-4">Temporal Nonce Guard</td>
                <td className="py-3 px-4 text-amber-600 font-semibold">Δt &gt; 60s or Reused Nonce</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">HIGH</span></td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-[#071842]">REPUDIATION</td>
                <td className="py-3 px-4 font-sans">Dishonest Alice sends mismatched states</td>
                <td className="py-3 px-4">Module G Symmetrization</td>
                <td className="py-3 px-4 text-rose-600 font-semibold">Both Verifiers QBER &gt; e_rep</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">CRITICAL</span></td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-[#071842]">DETECTOR_SIDE_CHANNEL</td>
                <td className="py-3 px-4 font-sans">CW laser blinding injected into Path B</td>
                <td className="py-3 px-4">MDI Dual-Path Cross-Check</td>
                <td className="py-3 px-4 text-rose-600 font-semibold">|Path A - Path B| &gt; τ_bias</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">CRITICAL</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Ready to Operate Banner (Quvora Callout) ── */}
      <section className="bg-[#071842] text-white rounded-2xl p-8 sm:p-12 border border-[#0B1E4E] flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="font-serif text-2xl sm:text-3xl text-white">
            Ready to Inspect Live Quantum Telemetry?
          </h3>
          <p className="text-sm text-[#94A3B8] font-sans max-w-xl">
            Execute full keygen, signing, and deterministic verification workflows with live Born-rule histograms and Hoeffding statistical bounds.
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <Link
            href="/dashboard"
            className="btn-teal px-5 py-2.5 rounded-lg text-xs font-mono font-bold shadow-sm"
          >
            Launch Console
          </Link>
          <Link
            href="/attacks"
            className="px-5 py-2.5 rounded-lg text-xs font-mono font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
          >
            Attack Suite
          </Link>
        </div>
      </section>
    </div>
  );
}
