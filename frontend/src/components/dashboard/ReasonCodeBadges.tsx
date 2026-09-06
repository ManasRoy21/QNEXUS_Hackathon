'use client';

import React from 'react';

interface ReasonCodeBadgesProps {
  reasonCodes?: string[];
  diagnosticMessage?: string;
  postselectedShots?: number;
  discardedShots?: number;
}

const CODE_LABELS: Record<string, { title: string; desc: string; color: string }> = {
  ERR_HOEFFDING_QBER_ANOMALY: {
    title: 'Physical Eavesdropping (Hoeffding Breach)',
    desc: 'Measured QBER breached repudiation/eavesdrop statistical bound e_rep.',
    color: 'bg-rose-950/80 text-rose-300 border-rose-800',
  },
  ERR_PAYLOAD_FORGERY_DETECTED: {
    title: 'Quantum/Classical Payload Forgery',
    desc: 'Disagreement between message hash and quantum basis states exceeds e_forg.',
    color: 'bg-orange-950/80 text-orange-300 border-orange-800',
  },
  ERR_SIGNER_IDENTITY_MISMATCH: {
    title: 'Signer Credential Spoofing',
    desc: 'Public key transmitted differs from authorized Alice master credentials.',
    color: 'bg-red-950/80 text-red-300 border-red-800',
  },
  ERR_IMPERSONATION_SIGNER_KEY_MISMATCH: {
    title: 'Signer Credential Spoofing',
    desc: 'Public key transmitted differs from authorized Alice credentials.',
    color: 'bg-red-950/80 text-red-300 border-red-800',
  },
  ERR_REPLAY_STALE_OR_DUPLICATE_NONCE: {
    title: 'Cryptographic Replay Attempt',
    desc: 'Signature timestamp or nonce outside legitimate verification window or already consumed.',
    color: 'bg-amber-950/80 text-amber-300 border-amber-800',
  },
  ERR_REPLAY_STALE_TIMESTAMP: {
    title: 'Cryptographic Replay Attempt',
    desc: 'Signature timestamp or nonce outside legitimate verification window.',
    color: 'bg-amber-950/80 text-amber-300 border-amber-800',
  },
  ERR_HOEFFDING_REPUDIATION_BOUND_BREACH: {
    title: 'Repudiation Attack (Module G Intercept)',
    desc: 'Dishonest Alice distributed mismatched states intercepted by symmetrization swap.',
    color: 'bg-purple-950/80 text-purple-300 border-purple-800',
  },
  ERR_DETECTOR_SIDE_CHANNEL_BIAS: {
    title: 'Detector Side-Channel Blinding',
    desc: 'MDI Path A vs Path B statistical variation exceeds counterfactual threshold.',
    color: 'bg-pink-950/80 text-pink-300 border-pink-800',
  },
  ERR_DETECTOR_PATH_BIAS_ANOMALY: {
    title: 'Detector Side-Channel Blinding',
    desc: 'MDI Path A vs Path B statistical variation exceeds counterfactual threshold.',
    color: 'bg-pink-950/80 text-pink-300 border-pink-800',
  },
};

export default function ReasonCodeBadges({
  reasonCodes = [],
  diagnosticMessage,
  postselectedShots,
  discardedShots,
}: ReasonCodeBadgesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
          Diagnostic Analysis & Reason Codes
        </h3>
        {postselectedShots !== undefined && (
          <span className="text-[11px] font-mono text-cyan-400">
            Postselection: {postselectedShots} kept / {discardedShots ?? 0} rejected
          </span>
        )}
      </div>

      {reasonCodes.length === 0 ? (
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center space-x-3">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-sm font-mono text-emerald-400">
            CLEAN — Hoeffding bounded confidence verified. No reason codes raised.
          </span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {reasonCodes.map((code) => {
            const meta = CODE_LABELS[code] || {
              title: code,
              desc: 'Security anomaly flagged by Hoeffding bound evaluator.',
              color: 'bg-amber-950/80 text-amber-300 border-amber-800',
            };
            return (
              <div
                key={code}
                className={`p-3 rounded-lg border flex flex-col space-y-1 transition-all ${meta.color}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono tracking-wide">{code}</span>
                  <span className="text-[11px] uppercase tracking-wider font-semibold opacity-90">
                    {meta.title}
                  </span>
                </div>
                <p className="text-xs opacity-80">{meta.desc}</p>
              </div>
            );
          })}
        </div>
      )}

      {diagnosticMessage && (
        <div className="p-3 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed">
          <span className="text-cyan-400 font-bold block mb-1">DETECTION LOG:</span>
          {diagnosticMessage}
        </div>
      )}
    </div>
  );
}
