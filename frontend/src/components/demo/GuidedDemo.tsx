'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, ArrowRight, Check, Cpu, Fingerprint, Loader2, Play, Radio, ShieldCheck, ShieldX } from 'lucide-react';
import { textLab, TextReceipt, TextVerification } from '@/services/textLab';
import { quantumLab, ExchangeConfig, ExchangeResult, HardwareJob } from '@/services/quantumLab';
import { downloadFile } from '@/services/imageLab';
import BellEvidence from '@/components/quantum-lab/BellEvidence';
import savedHardware from '@/data/hardware-bell-evidence.json';
import styles from './demo.module.css';

const ORIGINAL = 'Pay ₹100 to Rahul. Reference QN-204.';
const ALTERED = 'Pay ₹1,000 to Rahul. Reference QN-204.';
const EXCHANGE: ExchangeConfig = { pulses: 4096, seed: 42, noise: 0, interception: 0, message: ORIGINAL };
const hardware: HardwareJob & { retrieved_at: string; provenance: string; scope: string } = savedHardware;
const STEPS = [
  { title: 'Catch a changed payment', subtitle: 'Classical integrity', Icon: Fingerprint },
  { title: 'Let Eve intercept', subtitle: 'Live quantum simulation', Icon: Radio },
  { title: 'Inspect physical measurements', subtitle: 'Recorded IBM hardware', Icon: Cpu },
];
const percent = (n: number) => `${(n * 100).toFixed(2)}%`;

export default function GuidedDemo() {
  const [step, setStep] = useState(0);
  const [receipt, setReceipt] = useState<TextReceipt | null>(null);
  const [original, setOriginal] = useState<TextVerification | null>(null);
  const [altered, setAltered] = useState<TextVerification | null>(null);
  const [clean, setClean] = useState<ExchangeResult | null>(null);
  const [eve, setEve] = useState<ExchangeResult | null>(null);
  const [hardwareShown, setHardwareShown] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const paymentPassed = original?.verdict === 'VERIFIED' && altered?.verdict === 'MESSAGE_CHANGED' && altered.signature_valid;
  const interceptionPassed = !!clean?.key && clean.key.alice_hex === clean.key.bob_hex && eve?.verdict === 'CHANNEL_REJECTED' && !eve.key;
  const completed = [!!paymentPassed, !!interceptionPassed, hardwareShown];
  const total = completed.filter(Boolean).length;

  async function action(label: string, work: () => Promise<void>) {
    setBusy(label); setError('');
    try { await work(); }
    catch (err) { setError(err instanceof Error ? err.message : 'The experiment could not finish. Please retry.'); }
    finally { setBusy(''); }
  }
  async function sealPayment() {
    setReceipt(null); setOriginal(null); setAltered(null);
    const signed = await textLab.seal(ORIGINAL, { shots: 1024, seed: 42, noise: 0, interception: 0 });
    setReceipt(signed);
    const checked = await textLab.verify(ORIGINAL, signed);
    setOriginal(checked);
    return { signed, checked };
  }
  async function compareChannels() {
    setClean(null); setEve(null);
    const baseline = await quantumLab.exchange(EXCHANGE);
    setClean(baseline);
    const intercepted = await quantumLab.exchange({ ...EXCHANGE, interception: 1 });
    setEve(intercepted);
    return { baseline, intercepted };
  }
  async function runAll() {
    await action('Step 1 of 3: signing and checking the payment…', async () => {
      setStep(0); setHardwareShown(false); setClean(null); setEve(null);
      const { signed, checked } = await sealPayment();
      const changed = await textLab.verify(ALTERED, signed);
      setAltered(changed);
      if (checked.verdict !== 'VERIFIED' || changed.verdict !== 'MESSAGE_CHANGED' || !changed.signature_valid)
        throw new Error('The payment check did not produce the expected evidence. Inspect the returned verdicts and retry.');
      setStep(1); setBusy('Step 2 of 3: comparing the clean channel with Eve’s interception…');
      const { baseline, intercepted } = await compareChannels();
      if (!baseline.key || baseline.key.alice_hex !== baseline.key.bob_hex || intercepted.verdict !== 'CHANNEL_REJECTED' || intercepted.key)
        throw new Error('The channel comparison did not produce the expected evidence. Inspect both results before presenting.');
      setHardwareShown(true); setStep(2);
    });
  }
  function exportEvidence() {
    downloadFile('qnexus-guided-demo-evidence.json', JSON.stringify({
      version: 'qnexus-guided-demo/v1', exported_at: new Date().toISOString(),
      payment: { original_message: ORIGINAL, altered_message: ALTERED, signed_receipt: receipt, original_verification: original, altered_verification: altered },
      key_exchange: { clean, intercepted: eve }, hardware: hardwareShown ? hardware : null,
      scope: 'Classical message integrity, classically simulated key exchange with exposed demonstration keys, and a saved physical same-chip Bell experiment. No banking-security or computational quantum-advantage claim.',
    }, null, 2));
  }

  return <div className={styles.demo}>
    <header className={styles.hero}>
      <span className={styles.eyebrow}>QNEXUS / THE GUIDED DEMO</span>
      <h1>One payment.<br /><span>Three questions of trust.</span></h1>
      <p>Can we catch an edit? Can we see a spy’s disturbance? What does a real quantum processor actually measure?</p>
      <div className={styles.heroActions}><button className={styles.primary} disabled={!!busy} onClick={runAll}><Play size={15} />{total === 3 ? 'Replay all three steps' : 'Run the three-step demo'}<ArrowRight size={15} /></button><span>Live integrity + simulator checks. A saved physical result. No new QPU job.</span></div>
    </header>

    <div className={styles.progress}><span>{total} OF 3 DEMONSTRATED</span><div aria-hidden="true">{completed.map((done, i) => <span key={i} className={done ? styles.filled : ''} />)}</div><button className={styles.download} disabled={!!busy || total === 0} onClick={exportEvidence}><ArrowDownToLine size={14} /> Export evidence</button></div>
    <nav className={styles.steps} aria-label="Guided demo steps">{STEPS.map(({ title, subtitle, Icon }, i) => <button key={title} disabled={!!busy} aria-current={step === i ? 'step' : undefined} onClick={() => { setStep(i); setError(''); }}><span className={styles.stepNumber}>{completed[i] ? <Check size={16} /> : `0${i + 1}`}</span><span><small>{subtitle}</small><strong>{title}</strong></span><Icon size={18} /></button>)}</nav>
    <div aria-live="polite" aria-atomic="true">{busy && <p className={styles.loading}><Loader2 size={16} className={styles.spinner} />{busy}</p>}</div>
    {error && <p role="alert" className={`${styles.callout} ${styles.warning}`}>{error}</p>}

    {step === 0 && <section className={styles.panel} aria-labelledby="payment-heading">
      <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>01 / DID THE PAYMENT CHANGE?</span><h2 id="payment-heading">Keep the receipt. Change the amount.</h2></div><span className={styles.badge}>SHA-256 + Ed25519</span></div>
      <p className={styles.intro}>We sign a fingerprint of the original payment, then check two messages against the same signed receipt. This protection uses ordinary cryptography.</p>
      <div className={styles.comparison}>
        <article className={styles.payment}><span>ALICE’S SIGNED PAYMENT</span><p>Pay <strong>₹100</strong> to Rahul.</p><small>Reference QN-204.</small><div className={styles.status}>{original ? <><ShieldCheck size={16} /><strong>{original.verdict.replace(/_/g, ' ')}</strong></> : <span>Waiting for signature and verification</span>}</div></article>
        <article className={`${styles.payment} ${styles.changed}`}><span>PAYMENT AFTER SOMEONE EDITS IT</span><p>Pay <strong>₹1,000</strong> to Rahul.</p><small>The amount changed. The original receipt did not.</small><div className={styles.status}>{altered ? <><ShieldX size={16} /><strong>{altered.verdict.replace(/_/g, ' ')}</strong></> : <span>Waiting for the altered-message check</span>}</div></article>
      </div>
      <div className={styles.actions}><button className={styles.primary} disabled={!!busy} onClick={() => action('Signing and verifying the original payment…', async () => { await sealPayment(); })}><Fingerprint size={15} />{receipt ? 'Reseal & verify original' : 'Sign & verify original'}</button><button className={styles.secondary} disabled={!!busy || !receipt || original?.verdict !== 'VERIFIED'} onClick={() => action('Checking the changed amount against the original receipt…', async () => setAltered(await textLab.verify(ALTERED, receipt!)))}><ShieldX size={15} />Change ₹100 to ₹1,000 & verify</button></div>
      {altered && <div className={`${styles.callout} ${paymentPassed ? styles.success : styles.warning}`} role="status"><strong>{paymentPassed ? 'The changed payment was caught.' : 'Inspect the verification result.'}</strong><p>The original receipt’s signature is {altered.signature_valid ? 'authentic' : 'not trusted'}. The received message {altered.message_matches ? 'matches' : 'does not match'} its signed fingerprint. {altered.explanation}</p></div>}
      {receipt && <details className={styles.details}><summary>Inspect the fingerprints and signed receipt</summary><dl><dt>Signed original SHA-256</dt><dd><code>{receipt.manifest.message_sha256}</code></dd>{altered && <><dt>Altered message SHA-256</dt><dd><code>{altered.candidate_sha256}</code></dd></>}<dt>Receipt ID</dt><dd><code>{receipt.manifest.receipt_id}</code></dd><dt>Signature algorithm</dt><dd>{receipt.algorithm}</dd></dl><button className={styles.download} onClick={() => downloadFile('qnexus-payment-receipt.json', JSON.stringify(receipt, null, 2))}><ArrowDownToLine size={14} /> Download signed receipt</button></details>}
      <div className={styles.presenter}><span>SAY IT SIMPLY</span><p>“The seal belongs to the ₹100 instruction. Adding a zero changes the fingerprint, so the app catches it. We don’t need quantum for this part.”</p></div>
      <button className={styles.next} disabled={!!busy} onClick={() => setStep(1)}>Next: let Eve intercept <ArrowRight size={15} /></button>
    </section>}

    {step === 1 && <section className={styles.panel} aria-labelledby="eve-heading">
      <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>02 / WHAT DOES A SPY DISTURB?</span><h2 id="eve-heading">Same experiment. Now add Eve.</h2></div><span className={styles.badge}>Qiskit Aer simulation</span></div>
      <p className={styles.intro}>Run 4,096 simulated signals twice with seed 42 and no background noise. In the second run, Eve measures and resends every signal. The app measures the errors before releasing a demonstration key.</p>
      <div className={styles.comparison}>{[{ title: 'Clean channel', interception: '0% intercepted', value: clean }, { title: 'Eve intercepts', interception: '100% intercepted', value: eve }].map(({ title, interception, value }) => <article key={title} className={styles.channel}><span>{interception}</span><h3>{title}</h3><strong className={styles.qber}>{value ? percent(value.qber) : '—'}</strong><small>Errors in the disclosed test sample</small>{value ? <><p className={styles.verdict}>{value.verdict.replace(/_/g, ' ')}</p><dl><dt>Tested signals</dt><dd>{value.tested.toLocaleString()}</dd><dt>95% sample interval</dt><dd>{percent(value.interval_95[0])}–{percent(value.interval_95[1])}</dd><dt>Demonstration key</dt><dd>{value.key ? `${value.key.bits} bits · ${value.key.alice_hex === value.key.bob_hex ? 'matching' : 'mismatched'}` : 'None released'}</dd></dl></> : <p className={styles.placeholder}>Run the comparison to measure this channel.</p>}</article>)}</div>
      <div className={styles.actions}><button className={styles.primary} disabled={!!busy} onClick={() => action('Measuring the clean channel, then Eve’s intercept-and-resend attack…', async () => { await compareChannels(); })}><Radio size={15} />{clean || eve ? 'Rerun channel comparison' : 'Run clean vs Eve comparison'}</button></div>
      {eve && <div className={`${styles.callout} ${interceptionPassed ? styles.success : styles.warning}`} role="status"><strong>{interceptionPassed ? 'Clean channel: matching demo key. Intercepted channel: rejected.' : 'Inspect the measured channel verdicts.'}</strong><p>{eve.explanation} The 11% rejection cutoff is an illustrative teaching policy. These seeded, displayed keys must not protect real secrets.</p></div>}
      <div className={styles.presenter}><span>SAY IT SIMPLY</span><p>“Eve’s measurements introduce errors. Alice and Bob compare a small sample, spot the disturbance, and stop. Today this is a classical simulation of quantum behaviour.”</p></div>
      <button className={styles.next} disabled={!!busy} onClick={() => setStep(2)}>Next: inspect the physical run <ArrowRight size={15} /></button>
    </section>}

    {step === 2 && <section className={styles.panel} aria-labelledby="hardware-heading">
      <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>03 / WHAT DID REAL QUBITS DO?</span><h2 id="hardware-heading">A completed physical experiment.</h2></div><span className={styles.hardwareBadge}>IBM hardware · saved result</span></div>
      <p className={styles.intro}>Four Bell-test circuits ran on IBM’s <strong>{hardware.backend}</strong>, with 1,024 shots per setting. Viewing this saved result does not submit a job or consume QPU quota.</p>
      <div className={styles.job}><div><span>ACTUAL IBM JOB ID</span><code>{hardware.job_id}</code></div><div><span>PROVIDER STATUS</span><strong>{hardware.status}</strong></div><div><span>MEASUREMENTS</span><strong>4 × 1,024 shots</strong></div></div>
      {!hardwareShown ? <button className={styles.primary} disabled={!!busy} onClick={() => setHardwareShown(true)}><Cpu size={15} />Show recorded hardware result</button> : <>
        <BellEvidence result={hardware.result!} />
        <div className={`${styles.callout} ${styles.warning}`}><strong>This run did not establish a confident Bell violation.</strong><p>The measured score is {hardware.result!.s.toFixed(3)}; the 95% interval includes 2. Physical device noise and sampling can affect results. This run alone does not identify the cause or establish a secure quantum channel.</p></div>
        <div className={styles.actions}><button className={styles.secondary} onClick={() => downloadFile(`ibm-bell-${hardware.job_id}.json`, JSON.stringify(hardware, null, 2))}><ArrowDownToLine size={15} />Download hardware counts & result</button><Link className={styles.textLink} href="/quantum-lab">Open the lab to submit a new owner-authorized job <ArrowRight size={14} /></Link></div>
        <details className={styles.details}><summary>Where this evidence comes from</summary><p>{hardware.provenance}</p><p>Retrieved: <time dateTime={hardware.retrieved_at}>{hardware.retrieved_at}</time></p><p>{hardware.scope}</p><p>The saved response is available for inspection in the project source. It is not an independent cryptographic attestation from IBM.</p></details>
      </>}
      <div className={styles.presenter}><span>SAY IT SIMPLY</span><p>“This job really ran on a quantum processor. The device returned these counts, and we calculated the score from them. Our hardware run didn’t clear the Bell threshold; that’s what the measurements say.”</p></div>
    </section>}

    <aside className={styles.pitch}><ShieldCheck size={20} /><div><h2>The honest answer to “why quantum?”</h2><p>Classical cryptography protects the payment. The quantum experiments explore measurement disturbance and entangled correlations, with one completed physical-processor run. Small simulations run on ordinary computers. We claim neither a quantum speed advantage nor production banking security.</p></div></aside>
  </div>;
}
