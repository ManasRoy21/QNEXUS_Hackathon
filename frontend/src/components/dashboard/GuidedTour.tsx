import React from 'react';
import { Sparkles, CheckCircle2, ArrowRight, HelpCircle, X } from 'lucide-react';

interface GuidedTourProps {
  currentStep: number; // 1: Choose Protocol, 2: Keygen, 3: Sign, 4: Verify & Transfer
  onOpenCatalogue: () => void;
  onDismiss?: () => void;
}

export default function GuidedTour({
  currentStep,
  onOpenCatalogue,
  onDismiss,
}: GuidedTourProps) {
  const steps = [
    {
      num: 1,
      title: 'Select Protocol',
      desc: 'Pick Practical QDS, MDI-QDS, or OTUH-QDS from the catalogue.',
    },
    {
      num: 2,
      title: 'Generate Keys',
      desc: 'Simulate tripartite quantum key distribution across optical fiber.',
    },
    {
      num: 3,
      title: 'Alice Signs',
      desc: 'Alice encodes message digest into quantum signature tokens.',
    },
    {
      num: 4,
      title: 'Verify & Transfer',
      desc: 'Bob verifies, then forwards to Charlie to demonstrate Transferability.',
    },
  ];

  return (
    <div className="bg-[#071842] text-white border border-[#20C8A7]/40 rounded-2xl p-4 sm:p-6 shadow-md relative overflow-hidden">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#20C8A7] animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#20C8A7] font-semibold">
              NFR-6: 5-Minute Interactive Demonstration Walkthrough
            </span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl text-white font-semibold">
            Evaluate Quantum Digital Signatures End-to-End
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl font-sans">
            Follow the 4 numbered steps below to observe unforgeability, non-repudiation, and transferability in action.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenCatalogue}
            className="px-4 py-2 rounded-lg bg-[#20C8A7] hover:bg-[#1bb395] text-[#071842] font-mono text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Protocol Catalogue</span>
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Dismiss guided tour banner"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4-Step Progress Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-6">
        {steps.map((s) => {
          const isDone = currentStep > s.num;
          const isCurrent = currentStep === s.num;

          return (
            <div
              key={s.num}
              className={`p-3 rounded-xl border transition-all text-xs font-mono ${
                isCurrent
                  ? 'bg-white/10 border-[#20C8A7] text-white ring-1 ring-[#20C8A7]'
                  : isDone
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-[11px] uppercase tracking-wider">
                  Step 0{s.num}
                </span>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-[#20C8A7]" />
                ) : isCurrent ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#20C8A7] text-[#071842] font-bold">
                    ACTIVE
                  </span>
                ) : null}
              </div>
              <div className="font-bold text-white text-xs mb-0.5">{s.title}</div>
              <div className="text-[11px] text-slate-300 line-clamp-2">{s.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
