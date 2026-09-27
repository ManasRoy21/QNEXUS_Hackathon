'use client';

import React from 'react';
import SimulationWorkflow from '@/components/workflow/SimulationWorkflow';
import { ShieldCheck, Activity, Binary, ArrowRight } from 'lucide-react';

export default function WorkflowPage() {
  return (
    <div className="space-y-8">
      {/* Institutional Header Banner */}
      <div className="border-b border-[#CBD5E1] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-[11px] font-mono text-emerald-800 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#20C8A7] animate-pulse"></span>
            <span className="font-semibold uppercase tracking-wider">
              CENTRAL UNIFIED SIMULATION PLATFORM (PHASES 1–5)
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#071842] tracking-tight">
            Quantum Digital Signature Research Console
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] mt-1 max-w-2xl leading-relaxed">
            Execute the complete 6-step lifecycle: Protocol selection, physical channel state distribution, Alice OTP signing, protocol-aware adversarial injection, multi-point parameter sweeps, and finite-key statistical bounds.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-[#64748B]">
          <span className="px-2.5 py-1 rounded bg-white border border-[#CBD5E1] font-semibold text-[#071842]">
            100% REPRODUCIBLE
          </span>
          <span>·</span>
          <span>SEED-DRIVEN</span>
        </div>
      </div>

      {/* Unified 6-Step Workflow Component */}
      <SimulationWorkflow />
    </div>
  );
}
