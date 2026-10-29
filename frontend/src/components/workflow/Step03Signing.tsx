'use client';
import { useEffect, useState } from 'react';
import { CanonicalSimulationState, MessageReceipt, MessageVerification } from '@/types/unifiedSimulation';
import { qdsClient } from '@/services/qdsClient';
import { downloadFile } from '@/services/imageLab';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Fingerprint, Loader2, ShieldCheck, FileText, Check, X, Send } from 'lucide-react';
import styles from './workflow.module.css';

interface Props {
  simulationState: CanonicalSimulationState | null;
  signingDone?: boolean;
  onSigningComplete?: () => void;
  onNext: () => void;
  onBack: () => void;
}
export default function Step03Signing({ simulationState, onSigningComplete, onNext, onBack }: Props) {
  const [message, setMessage] = useState(simulationState?.signing?.message || 'QDS research evidence');
  const [digest, setDigest] = useState('');
  const [receipt, setReceipt] = useState<MessageReceipt | null>(null);
  const [result, setResult] = useState<MessageVerification | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(message)).then(bytes => {
      if (active) setDigest(Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join(''));
    }).catch(() => { if (active) setDigest('Preview unavailable; the backend calculates the authoritative digest.'); });
    return () => { active = false; };
  }, [message]);
  async function sign() {
    if (!simulationState) return;
    setBusy('Signing on backend…'); setError('');
    try { setReceipt(await qdsClient.signRunMessage(simulationState.simulation_id, message)); setResult(null); }
    catch (err: any) { setError(err?.response?.data?.detail || err.message || 'Signing failed.'); }
    finally { setBusy(''); }
  }
  async function verify() {
    if (!receipt) return;
    setBusy('Checking receipt, message and saved run…'); setError('');
    try {
      const response = await qdsClient.verifyRunMessage(message, receipt);
      setResult(response);
      if (response.verdict === 'VERIFIED') onSigningComplete?.();
    } catch (err: any) { setError(err?.response?.data?.detail || err.message || 'Verification failed.'); }
    finally { setBusy(''); }
  }
  return <div>
    <div className={styles.sectionHeading}><div><span className={styles.overline}>03 / MESSAGE EVIDENCE</span><h2>Sign. Verify. Inspect.</h2><p>Create a signed receipt for your message and saved experiment. Edit a character after signing to test the integrity check.</p></div><span className={styles.countBadge}>SHA-256 + Ed25519</span></div>
    <div className={styles.signingGrid}>
      <section className={styles.signingPanel} aria-label="Message signing">
        <div className={styles.signingPanelHeader}><span className={styles.protocolIcon}><FileText size={18} /></span><div><span>ALICE / SENDER</span><h3>Prepare your message</h3></div></div>
        <label className={styles.messageLabel} htmlFor="workflow-message">Message to sign or verify<span>{Array.from(message).length.toLocaleString()} / 4,096 characters</span></label>
        <textarea id="workflow-message" aria-label="Message to sign or verify" rows={6} maxLength={4096} value={message} disabled={!!busy} onChange={e => { setMessage(e.target.value); setResult(null); }} className={styles.messageEditor} />
        <div className={styles.hashPreview}><span>CURRENT MESSAGE FINGERPRINT / SHA-256</span><code>{digest}</code></div>
        <button className={`${styles.primaryButton} ${styles.fullWidth}`} disabled={!!busy || !simulationState || !message.length} onClick={sign}>{busy ? <Loader2 className={styles.spinner} size={15} /> : <Fingerprint size={15} />}{receipt ? 'Sign current message' : 'Create signed receipt'}</button>
        {receipt && <div className={styles.receiptDetails}><span className={styles.receiptStatus}><Check size={13} /> Receipt created on the backend</span><span>SIGNED MESSAGE FINGERPRINT</span><code>{receipt.manifest.message_sha256}</code><div><span>Issuer {receipt.manifest.key_id}</span><span>{receipt.algorithm}</span></div><button className={styles.downloadButton} onClick={() => downloadFile('message-evidence.json',JSON.stringify({receipt,verification:result},null,2))}><ArrowDownToLine size={14} /> Download signed receipt <ArrowRight size={13} /></button></div>}
      </section>
      <section className={styles.signingPanel} aria-label="Message verification">
        <div className={styles.signingPanelHeader}><span className={styles.protocolIcon}><ShieldCheck size={18} /></span><div><span>BOB + CHARLIE / VERIFIERS</span><h3>Inspect the evidence</h3></div></div>
        {result ? <>
          <div role="status" className={`${styles.verificationResult} ${result.verdict === 'VERIFIED' ? styles.resultPass : result.verdict === 'INCONCLUSIVE' ? styles.resultUncertain : styles.resultFail}`}><ShieldCheck size={23} /><div><strong>{result.verdict.replace(/_/g,' ')}</strong><p>{result.verdict === 'VERIFIED' ? 'Message and saved experiment checks passed.' : result.verdict === 'MESSAGE_CHANGED' ? 'The message differs from the signed original.' : 'Review the checks and sampling decisions below.'}</p></div></div>
          <div className={styles.checkList}>{[
            { label: 'Receipt signature', pass: result.signature_valid },
            { label: 'Message fingerprint', pass: result.message_matches },
            { label: 'Saved measurement evidence', pass: result.evidence_matches },
          ].map(check => <div key={check.label}><span>{check.pass ? <Check size={14} /> : <X size={14} />}{check.label}</span><strong>{check.pass ? 'Matches' : 'Failed or untrusted'}</strong></div>)}</div>
          <div className={styles.recipientGrid}>{result.verifiers.map(v => <div key={v.verifier}><div><strong>{v.verifier}</strong><span>{v.status}</span></div><p>Sampling: {v.sampling_decision.replace(/_/g, ' ').toLowerCase()}</p><small>Retained error upper bound</small><b>{v.remaining_error_upper_bound === null ? 'No data' : `${(v.remaining_error_upper_bound*100).toFixed(2)}%`}</b></div>)}</div>
        </> : <div className={styles.verificationEmpty}><span><ShieldCheck size={30} strokeWidth={1.3} /></span><h4>Ready when your message is.</h4><p>Create a signed receipt, then verify its signature, message fingerprint, and saved channel evidence.</p><div><span>01 Create receipt</span><ArrowRight size={12} /><span>02 Verify evidence</span></div></div>}
        <button className={styles.secondaryButton} disabled={!!busy || !receipt || !message.length} onClick={verify}><ShieldCheck size={15} /> Verify message <ArrowRight size={15} /></button>
        <p className={styles.panelNote}>After signing, edit one character and verify again without re-signing. Weak channel evidence can produce an inconclusive result even when the message matches.</p>
      </section>
    </div>
    <div className={styles.runDetails}><span><Send size={14} /> SAVED EXPERIMENT</span><code>{simulationState?.simulation_id || 'Generate material first'}</code><span>{simulationState?.execution?.backend || 'No measurement engine'}</span><span>Retained bits: Bob {simulationState?.material.untested_bits.M_u_bob ?? '—'} / Charlie {simulationState?.material.untested_bits.M_u_charlie ?? '—'}</span></div>
    {busy && <p role="status" className={styles.inlineStatus}><Loader2 className={styles.spinner} size={14} />{busy}</p>}
    {error && <div role="alert" className={styles.error}>{typeof error === 'string' ? error : 'Request rejected. Check the message and backend connection.'}</div>}
    <div className={styles.stepFooter}><button className={styles.backButton} onClick={onBack}><ArrowLeft size={14} /> Material</button><button className={styles.primaryButton} onClick={onNext}>Explore attacks <ArrowRight size={15} /></button></div>
    <p className={styles.bottomNote}>Classical evidence receipt, not a quantum signature. The experiment registers are not signing keys. Default issuer keys change when the backend restarts.</p>
  </div>;
}
