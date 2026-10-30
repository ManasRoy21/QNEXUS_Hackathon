'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, ArrowRight } from 'lucide-react';
import { downloadFile } from '@/services/imageLab';
import hardware from '@/data/hardware-bell-evidence.json';
import styles from './payments.module.css';

export default function IBMQubits() {
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

