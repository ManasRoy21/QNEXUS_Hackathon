'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, ArrowRight, ArrowRightLeft, Check, CheckCircle2, Cpu, Fingerprint, Landmark, Loader2, LockKeyhole, Play, RefreshCw, ShieldCheck, ShieldX, Timer } from 'lucide-react';
import { payments, Sandbox, Draft, Trial, Benchmark, Attack, exportPaymentEvidence } from '@/services/payments';
import { downloadFile } from '@/services/imageLab';
import hardware from '@/data/hardware-bell-evidence.json';
import styles from './payments.module.css';

const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(paise / 100);
const ms = (value: number) => `${value.toFixed(3)} ms`;
const ATTACKS: { kind: Attack; label: string; expected: string }[] = [
  { kind: 'amount', label: 'Change amount', expected: 'SIGNATURE_REJECTED' },
  { kind: 'beneficiary', label: 'Swap beneficiary', expected: 'SIGNATURE_REJECTED' },
  { kind: 'expired', label: 'Expired instruction', expected: 'EXPIRED_OR_INVALID_TIME' },
  { kind: 'ciphertext', label: 'Corrupt ciphertext', expected: 'ENVELOPE_REJECTED' },
];

function IBMQubits() {
  const [setting, setSetting] = useState(0);
  const row = hardware.result.settings[setting];
  return <section className={styles.panel} id="ibm-qubits" aria-labelledby="ibm-heading">
    <div className={styles.heading}><div><span className={styles.eyebrow}>PHYSICAL QUANTUM EXPERIMENT</span><h2 id="ibm-heading">Two real qubits. Actual IBM counts.</h2></div><span className={styles.hardwareBadge}>Recorded hardware result</span></div>
    <p className={styles.description}>This Bell experiment ran on <strong>{hardware.backend}</strong>. It is separate from payment security: ML-KEM and ML-DSA run on the server’s ordinary CPU. Viewing these measurements uses no QPU quota.</p>
    <div className={styles.quantumGrid}>
      <div><div className={styles.circuitTitle}>LOGICAL CIRCUIT / TWO QUBITS ON ONE PROCESSOR</div><svg className={styles.circuit} viewBox="0 0 520 170" role="img" aria-label="Logical Bell circuit: Hadamard on q0, controlled NOT to q1, basis rotations and measurement of both qubits.">
        <path d="M55 52H495 M55 125H495" stroke="#b7ccd9" strokeWidth="2" /><g fill="#7693a6" fontSize="13" fontFamily="monospace"><text x="15" y="57">q₀</text><text x="15" y="130">q₁</text></g>
        <rect x="85" y="32" width="43" height="40" rx="5" fill="#edf4f7" stroke="#98b8c8" /><text x="99" y="58" fill="#426e85" fontSize="18">H</text>
        <path d="M185 52V125" stroke="#4b879a" strokeWidth="2" /><circle cx="185" cy="52" r="6" fill="#4b879a" /><circle cx="185" cy="125" r="15" fill="#fff" stroke="#4b879a" strokeWidth="2" /><path d="M175 125H195 M185 115V135" stroke="#4b879a" strokeWidth="2" />
        {[32,105].map((y, i) => <g key={y}><rect x="265" y={y} width="87" height="40" rx="5" fill="#edf4f7" stroke="#98b8c8" /><text x="280" y={y+25} fill="#426e85" fontSize="13">Rᵧ({i === 0 ? '−a' : '−b'})</text><rect x="405" y={y} width="43" height="40" rx="5" fill="#20364b" /><text x="418" y={y+25} fill="#e4f2f5" fontSize="14">M</text></g>)}
      </svg><p className={styles.small}>q₀ and q₁ label logical qubits, not physical device addresses. H + CNOT prepare a Bell pair; four measurement settings produce the CHSH score.</p>
      <div className={styles.settingTabs} aria-label="IBM measurement setting">{hardware.result.settings.map((r, i) => <button key={r.setting} aria-pressed={setting === i} onClick={() => setSetting(i)}>{r.setting}</button>)}</div>
      <div className={styles.bars}>{(['00','01','10','11'] as const).map(bits => { const count = row.counts[bits] || 0; return <div key={bits}><code>{bits}</code><div><span style={{ width: `${count / row.shots * 100}%` }} /></div><strong>{count}</strong><small>{(count / row.shots * 100).toFixed(1)}%</small></div>; })}</div>
      <p className={styles.small}>{row.shots.toLocaleString()} actual shots · E({row.setting}) = {row.correlation.toFixed(3)}</p></div>
      <div className={styles.quantumFacts}><span>COMPLETED IBM JOB</span><code>{hardware.job_id}</code><dl><dt>Processor</dt><dd>{hardware.backend}</dd><dt>Provider status</dt><dd>{hardware.status}</dd><dt>Settings × shots</dt><dd>4 × 1,024</dd></dl><div className={styles.bellScore}><span>MEASURED CHSH SCORE</span><strong>{hardware.result.s.toFixed(3)}</strong><p>Local bound: 2 · 95% interval: 1.545–2.342</p></div><p className={styles.quantumNote}>No confident Bell violation in this run. These measurements do not certify the payment gateway or demonstrate a quantum speed advantage.</p><button className={styles.textButton} onClick={() => downloadFile('qnexus-ibm-qubit-counts.json', JSON.stringify(hardware, null, 2))}><ArrowDownToLine size={14} />Download raw counts</button><Link href="/quantum-lab" className={styles.textButton}>Open owner-controlled hardware lab <ArrowRight size={14} /></Link></div>
    </div>
  </section>;
}

export default function PaymentGateway() {
  const [session, setSession] = useState<Sandbox | null>(null);
  const [balances, setBalances] = useState<Record<string, number>>({ 'alice@demo':1000000, 'rahul@demo':200000, 'mallory@demo':0 });
  const [amount, setAmount] = useState('1000');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'gateway' | 'qubits'>('gateway');
  const disabled = !!busy;
  const lastReceipt = [...trials].reverse().find(t => t.decision.receipt)?.decision.receipt;

  async function action(label: string, work: () => Promise<void>) {
    setBusy(label); setError('');
    try { await work(); } catch (err) { setError(err instanceof Error ? err.message : 'Gateway request failed.'); }
    finally { setBusy(''); }
  }
  async function start() {
    const fresh = await payments.create();
    setSession(fresh); setBalances(fresh.balances); setDraft(null); setTrials([]); setBenchmark(null); setVerified(null);
    return fresh;
  }
  function record(trial: Trial) { setTrials(old => [...old, trial]); setBalances(trial.decision.balances); }
  function parsedAmount() {
    if (!/^\d{1,5}(\.\d{1,2})?$/.test(amount)) throw new Error('Enter a demo amount from ₹0.01 to ₹10,000, with at most two decimal places.');
    const value = Math.round(Number(amount)*100);
    if (value < 1 || value > 1000000) throw new Error('Use an amount from ₹0.01 to ₹10,000.');
    return value;
  }
  async function fullDemo() {
    await action('Creating isolated mock banks and post-quantum keys…', async () => {
      setTab('gateway'); const s = await start();
      setAmount('1000'); setBusy('Bank A: signing and encrypting a ₹1,000 instruction…');
      const prepared = await payments.draft(s, 100000); setDraft(prepared);
      for (const attack of ATTACKS) {
        setBusy(`Bank B: testing “${attack.label}”…`);
        const injected = await payments.attack(s, prepared.envelope, attack.kind);
        const result = await payments.receive(s, injected.envelope);
        record({ name: attack.label, decision: result, injection: injected.model });
        if (result.accepted || result.verdict !== attack.expected || result.balances['alice@demo'] !== 1000000)
          throw new Error('An attack did not produce the expected rejection. Inspect the actual decision before continuing.');
      }
      setBusy('Bank B: verifying and settling the intact instruction…');
      const valid = await payments.receive(s, prepared.envelope); record({ name:'Valid transfer', decision:valid });
      if (!valid.accepted || valid.balances['alice@demo'] !== 900000 || valid.balances['rahul@demo'] !== 300000)
        throw new Error('The valid transfer did not settle as expected. Inspect the ledger decision.');
      const replay = await payments.receive(s, prepared.envelope); record({ name:'Replay settled instruction', decision:replay });
      if (replay.accepted || replay.verdict !== 'REPLAY_REJECTED' || replay.balances['alice@demo'] !== valid.balances['alice@demo'])
        throw new Error('Replay protection did not produce the expected result.');
      const checked = await payments.verifyReceipt(s, valid.receipt!); setVerified(checked.valid);
      if (!checked.valid) throw new Error('Bank B’s receipt did not verify.');
      setBusy('Measuring classical and post-quantum primitives on this server…');
      setBenchmark(await payments.benchmark(s));
    });
  }
  async function attack(kind: Attack) {
    if (!session || !draft) return;
    await action('Injecting a controlled test fault and checking Bank B’s response…', async () => {
      const injected = await payments.attack(session, draft.envelope, kind);
      record({ name: ATTACKS.find(a => a.kind === kind)!.label, decision: await payments.receive(session, injected.envelope), injection:injected.model });
    });
  }

  return <div className={styles.page}>
    <header className={styles.hero}><div className={styles.eyebrow}><ShieldCheck size={15} /> QNEXUS / QUANTUM-SAFE PAYMENT GATEWAY</div><h1>Protect the payment.<br /><span>Prepare for quantum.</span></h1><p>Send a payment between two mock banks using real post-quantum cryptography. Inspect every rejection, the atomic ledger, and the cost of the security upgrade.</p><div className={styles.heroActions}><button className={styles.primary} disabled={disabled} onClick={fullDemo}><Play size={15} />Run payment & attack demo<ArrowRight size={15} /></button><button className={styles.textButton} disabled={disabled} onClick={() => setTab('qubits')}><Cpu size={15} />See real IBM qubits</button></div><div className={styles.scope}>Fake funds · No UPI connection · Temporary instance-local ledger · IBM experiment shown separately</div></header>
    <nav className={styles.tabs} aria-label="Gateway views"><button aria-pressed={tab === 'gateway'} disabled={disabled} onClick={() => setTab('gateway')}><ArrowRightLeft size={16} />Payment gateway</button><button aria-pressed={tab === 'qubits'} disabled={disabled} onClick={() => setTab('qubits')}><Cpu size={16} />IBM hardware evidence</button></nav>
    {busy && <div className={styles.loading} role="status"><Loader2 size={16} className={styles.spinner} />{busy}</div>}
    {error && <p className={styles.error} role="alert">{error}</p>}

    {tab === 'gateway' ? <>
      <div className={styles.bankGrid}>{[{ bank:'BANK A / SENDER', person:'Alice', account:'alice@demo' },{ bank:'BANK B / RECEIVER', person:'Rahul', account:'rahul@demo' }].map((b, i) => <div className={styles.bank} key={b.account}><div><Landmark size={21} /><span>{b.bank}</span><small>{session ? 'Sandbox active' : 'Preview · create a sandbox to begin'}</small></div><h2>{b.person}<span>{b.account}</span></h2><strong>{money(balances[b.account])}</strong><p>Demo balance {i === 0 ? '· debited only after verification' : '· credited in the same ledger transaction'}</p></div>)}</div>
      <section className={styles.panel}><div className={styles.heading}><div><span className={styles.eyebrow}>01 / PREPARE A BANK INSTRUCTION</span><h2>Sign it. Encrypt it. Keep its identity.</h2></div><button className={styles.textButton} disabled={disabled} onClick={() => action('Creating a new sandbox…', async () => { await start(); })}><RefreshCw size={14} />{session ? 'New sandbox' : 'Create sandbox'}</button></div>
        <p className={styles.description}>Bank A signs the exact amount, beneficiary, transaction ID, nonce and expiry. ML-KEM establishes an encryption key; AES-GCM protects the signed instruction. Bank B trusts its sandbox key directory.</p>
        <div className={styles.form}><label>Amount in INR<input aria-label="Payment amount in INR" inputMode="decimal" value={amount} disabled={disabled} onChange={e => { setAmount(e.target.value); setDraft(null); }} /></label><label>Beneficiary<input disabled value="Rahul · rahul@demo" /></label><button className={styles.primary} disabled={disabled || !session} onClick={() => action('Bank A is signing and encrypting the payment…', async () => { const value=parsedAmount(); setDraft(await payments.draft(session!, value)); })}><LockKeyhole size={15} />Prepare secure instruction</button></div>
        <div className={styles.pipeline}>{[{Icon:Fingerprint,title:'ML-DSA-65',detail:'Authenticates the instruction'},{Icon:LockKeyhole,title:'ML-KEM-768',detail:'Establishes a shared secret'},{Icon:ShieldCheck,title:'AES-256-GCM',detail:'Encrypts and authenticates'},{Icon:CheckCircle2,title:'Atomic ledger',detail:'Checks ID, nonce, time & funds'}].map(({Icon,title,detail}) => <div key={title}><Icon size={17} /><strong>{title}</strong><span>{detail}</span></div>)}</div>
        {draft && <><div className={styles.instruction}><div><span>SEALED PAYMENT</span><strong>{money(draft.instruction.amount_paise)} → {draft.instruction.payee}</strong></div><div><span>TRANSACTION ID</span><code>{draft.instruction.transaction_id}</code></div><div><span>VALID FOR</span><strong>120 seconds from creation</strong></div></div><div className={styles.metrics}>{[['Sign', ms(draft.metrics.sign_ms)],['Encapsulate',ms(draft.metrics.encapsulate_ms)],['Encrypt + derive',ms(draft.metrics.encrypt_ms)],['Encrypted wire envelope',`${draft.metrics.wire_bytes.toLocaleString()} B`]].map(([k,v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div><details className={styles.details}><summary>Inspect the encrypted wire packet</summary><p>The network packet contains the encrypted signed instruction, an encapsulated key, public routing identifiers and a nonce. Shared secrets and private keys are excluded.</p><pre>{JSON.stringify(draft.envelope, null, 2)}</pre></details></>}
      </section>
      <section className={styles.panel}><div className={styles.heading}><div><span className={styles.eyebrow}>02 / VERIFY BEFORE SETTLEMENT</span><h2>Try to change it. Try to send it twice.</h2></div><span className={styles.badge}>Real verification · mock money</span></div><p className={styles.description}>A valid instruction moves funds once. Controlled tests change the signed data, use an expired signature, or corrupt an encrypted byte. Replay sends the exact same envelope again.</p><div className={styles.actions}><button className={styles.primary} disabled={disabled || !draft} onClick={() => action('Bank B is verifying the payment…', async () => record({ name:'Submit original instruction', decision:await payments.receive(session!, draft!.envelope) }))}><Check size={15} />Submit original / replay</button>{ATTACKS.map(a => <button key={a.kind} className={styles.secondary} disabled={disabled || !draft} onClick={() => attack(a.kind)}><ShieldX size={13} />{a.label}</button>)}</div>
        {trials.length > 0 ? <div className={styles.trials} aria-live="polite">{trials.map((t,i) => <article key={i} className={t.decision.accepted ? styles.accepted : styles.rejected}><div><span className={styles.trialNumber}>{String(i+1).padStart(2,'0')}</span><strong>{t.name}</strong><code>{t.decision.verdict}</code></div><p>{t.decision.explanation}</p><small>Alice {money(t.decision.balances['alice@demo'])} · Rahul {money(t.decision.balances['rahul@demo'])} · Mallory {money(t.decision.balances['mallory@demo'])}</small>{t.injection && <details><summary>Test injection model</summary><p>{t.injection}</p></details>}</article>)}</div> : <div className={styles.empty}><ShieldCheck size={24} /><p>Run the complete demo, or create a sandbox and prepare an instruction to test each decision.</p></div>}
        {lastReceipt && <div className={styles.receipt}><div><ShieldCheck size={20} /><strong>Bank B’s ML-DSA signed receipt</strong><span>{verified === true ? 'Signature verified' : verified === false ? 'Verification failed' : 'Ready to verify'}</span></div><p>The receipt binds the transaction ID, instruction fingerprint, amount, beneficiary and resulting demo balances.</p><div className={styles.actions}><button className={styles.secondary} disabled={disabled} onClick={() => action('Checking Bank B’s receipt signature…', async () => setVerified((await payments.verifyReceipt(session!, lastReceipt)).valid))}>Verify receipt signature</button><button className={styles.textButton} onClick={() => downloadFile('qnexus-bank-receipt.json', JSON.stringify({ ...lastReceipt, bank_b_public_key:session!.public_keys.bank_b_receipts }, null, 2))}><ArrowDownToLine size={14} />Download receipt</button></div></div>}
      </section>
      <section className={styles.panel}><div className={styles.heading}><div><span className={styles.eyebrow}>03 / MEASURE THE MIGRATION COST</span><h2>Quantum resistance has a measurable cost.</h2></div><button className={styles.textButton} disabled={disabled || !session} onClick={() => action('Benchmarking nine warmed samples per algorithm…', async () => setBenchmark(await payments.benchmark(session!)))}><Timer size={14} />{benchmark ? 'Remeasure' : 'Run benchmark'}</button></div><p className={styles.description}>Compare classical Ed25519 / X25519 with ML-DSA-65 / ML-KEM-768 on this server. Tamper and replay protection are possible classically too; post-quantum algorithms address the future quantum threat.</p>{benchmark ? <><div className={styles.tableWrap}><table><thead><tr><th>Measured primitive / payload</th><th>Classical</th><th>Post-quantum</th></tr></thead><tbody>{[['Sign · median',ms(benchmark.classical.sign.median_ms),ms(benchmark.post_quantum.sign.median_ms)],['Verify · median',ms(benchmark.classical.verify.median_ms),ms(benchmark.post_quantum.verify.median_ms)],['Key establishment · median',ms(benchmark.classical.key_establishment.median_ms),ms(benchmark.post_quantum.key_establishment.median_ms)],['Signature',`${benchmark.classical.signature_bytes} B`,`${benchmark.post_quantum.signature_bytes.toLocaleString()} B`],['Signing public key',`${benchmark.classical.signing_public_key_bytes} B`,`${benchmark.post_quantum.signing_public_key_bytes.toLocaleString()} B`],['One key-exchange wire value',`${benchmark.classical.key_exchange_wire_bytes} B`,`${benchmark.post_quantum.key_exchange_wire_bytes.toLocaleString()} B`]].map(([k,a,b]) => <tr key={k}><th>{k}</th><td>{a}</td><td>{b}</td></tr>)}</tbody></table></div><p className={styles.small}>{benchmark.note} Library: cryptography {benchmark.cryptography_version}.</p></> : <p className={styles.emptyText}>Measured timings will appear here after the complete demo or a manual benchmark.</p>}</section>
      <div className={styles.exportRow}><button className={styles.secondary} disabled={disabled || !session} onClick={() => exportPaymentEvidence(session!, draft, trials, benchmark)}><ArrowDownToLine size={15} />Export gateway evidence</button><button className={styles.textButton} disabled={disabled} onClick={() => setTab('qubits')}>Inspect the separate IBM qubit experiment <ArrowRight size={15} /></button></div>
      <aside className={styles.productNote}><strong>Who is this for?</strong><p>A prototype for bank and payment-platform engineers evaluating a post-quantum migration. It demonstrates real cryptographic operations and mock settlement through an API. Both banks run on this server; sessions expire in 30 minutes. A missing instance-local session fails closed and requires a new sandbox. Production needs durable shared storage, independent bank authentication, key custody, and protocol review.</p><p>Built on the standardized ML-KEM and ML-DSA algorithms; this custom demonstration protocol is not a certified banking integration. Existing UPI fraud, social engineering, and compromised devices are separate problems.</p><div><a href="https://www.bis.org/project/leap" target="_blank" rel="noreferrer">Banking precedent: BIS Project Leap ↗</a><a href="https://csrc.nist.gov/pubs/fips/203/final" target="_blank" rel="noreferrer">ML-KEM standard ↗</a><a href="https://csrc.nist.gov/pubs/fips/204/final" target="_blank" rel="noreferrer">ML-DSA standard ↗</a></div></aside>
    </> : <IBMQubits />}
  </div>;
}
