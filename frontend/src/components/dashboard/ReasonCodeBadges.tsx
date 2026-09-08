'use client';

import React from 'react';
import { CheckCircle, AlertTriangle, Terminal } from 'lucide-react';

interface ReasonCodeBadgesProps {
  reasonCodes?: string[];
  diagnosticMessage?: string;
  postselectedShots?: number;
  discardedShots?: number;
}

const CODE_LABELS: Record<string, { title: string; desc: string; badge: string }> = {
  ERR_HOEFFDING_QBER_ANOMALY: {
    title: 'Physical Eavesdropping (Eve Projective Measurement)',
    desc: 'Measured QBER breached repudiation/eavesdrop statistical bound e_rep (13.58%). Irreversible Born-rule collapse.',
    badge: 'bg-rose-50 text-rose-700 border-rose-300',
  },
  ERR_PAYLOAD_FORGERY_DETECTED: {
    title: 'State-Digest Disagreement (Payload Forgery)',
    desc: 'Hamming distance between classical message digest and measured Pauli eigenstates exceeds e_forg (20.58%).',
    badge: 'bg-amber-50 text-amber-700 border-amber-300',
  },
  ERR_SIGNER_IDENTITY_MISMATCH: {
    title: 'Public Key Credential Spoofing (Mallory)',
    desc: 'Transmitted signer public key credential does not match authorized Alice master PKI registration.',
    badge: 'bg-red-50 text-red-700 border-red-300',
  },
  ERR_IMPERSONATION_SIGNER_KEY_MISMATCH: {
    title: 'Signer Impersonation Detected',
    desc: 'Adversary key injection identified at public key verification layer.',
    badge: 'bg-red-50 text-red-700 border-red-300',
  },
  ERR_REPLAY_STALE_OR_DUPLICATE_NONCE: {
    title: 'Historic Signature Replay Breach',
    desc: 'Transmission timestamp latency Δt > 60s or duplicate cryptographic nonce detected in temporal registry.',
    badge: 'bg-amber-50 text-amber-700 border-amber-300',
  },
  ERR_REPLAY_STALE_TIMESTAMP: {
    title: 'Stale Timestamp Replay Attempt',
    desc: 'Signature timestamp outside legitimate verification window.',
    badge: 'bg-amber-50 text-amber-700 border-amber-300',
  },
  ERR_HOEFFDING_REPUDIATION_BOUND_BREACH: {
    title: 'Dishonest Alice Repudiation Intercept',
    desc: 'Module G encrypted bit exchange forced verifier symmetry; both Bob & Charlie observed QBER > e_rep simultaneously.',
    badge: 'bg-purple-50 text-purple-700 border-purple-300',
  },
  ERR_DETECTOR_SIDE_CHANNEL_BIAS: {
    title: 'Detector Side-Channel CW Laser Blinding',
    desc: 'MDI Path A vs Path B statistical variation exceeds counterfactual threshold τ_bias.',
    badge: 'bg-rose-50 text-rose-700 border-rose-300',
  },
  ERR_DETECTOR_PATH_BIAS_ANOMALY: {
    title: 'Detector Path Bias Asymmetry',
    desc: 'Asymmetric detector response observed in dual-path measurement unit.',
    badge: 'bg-rose-50 text-rose-700 border-rose-300',
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
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 text-xs font-mono">
        <h3 className="font-bold text-[#64748B] uppercase tracking-wider">
          DIAGNOSTIC REASON CODES
        </h3>
        {postselectedShots !== undefined && (
          <span className="text-[11px] font-mono text-[#071842] font-semibold bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#CBD5E1]">
            Postselection: {postselectedShots} Kept / {discardedShots ?? 0} Discarded
          </span>
        )}
      </div>

      {reasonCodes.length === 0 ? (
        <div className="p-4 rounded-xl bg-[#E6FBF7]/60 border border-[#20C8A7]/40 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-[#20C8A7] shrink-0" />
          <div className="text-xs font-mono text-[#071842]">
            <span className="font-bold block">STATUS: VERIFIED SECURE</span>
            <span className="text-[#475569]">All Hoeffding bounds satisfied. Zero reason codes raised by deterministic engine.</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {reasonCodes.map((code) => {
            const meta = CODE_LABELS[code] || {
              title: code,
              desc: 'Deterministic bound breach flagged by Hoeffding finite-key evaluation layer.',
              badge: 'bg-amber-50 text-amber-700 border-amber-300',
            };
            return (
              <div
                key={code}
                className={`p-3.5 rounded-xl border flex flex-col space-y-1.5 transition-all ${meta.badge}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono tracking-wider">{code}</span>
                  <span className="text-[10px] uppercase font-mono tracking-widest font-semibold px-2 py-0.5 rounded bg-white/70">
                    BREACH CODE
                  </span>
                </div>
                <div className="text-xs font-bold font-sans text-[#071842]">{meta.title}</div>
                <p className="text-xs font-sans text-[#475569] leading-relaxed">{meta.desc}</p>
              </div>
            );
          })}
        </div>
      )}

      {diagnosticMessage && (
        <div className="p-3.5 rounded-xl bg-[#071842] text-white font-mono text-xs leading-relaxed border border-[#0B1E4E] shadow-inner">
          <div className="flex items-center space-x-2 text-[#20C8A7] font-bold text-[11px] mb-1 tracking-wider uppercase">
            <Terminal className="w-3.5 h-3.5" />
            <span>DETERMINISTIC EVALUATION LOG:</span>
          </div>
          <p className="text-[#CBD5E1] text-[11px] font-mono whitespace-pre-wrap">{diagnosticMessage}</p>
        </div>
      )}
    </div>
  );
}
