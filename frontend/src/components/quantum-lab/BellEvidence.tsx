import { ShieldCheck } from 'lucide-react';
import { BellResult } from '@/services/quantumLab';
import styles from './quantum.module.css';

export default function BellEvidence({ result }: { result: BellResult }) {
  return <div className={styles.bellEvidence}>
    <div className={styles.witness}><div><span>MEASURED CHSH WITNESS</span><strong>{result.s.toFixed(3)}</strong><p>95% bound: {result.interval_95[0].toFixed(3)}–{result.interval_95[1].toFixed(3)}</p></div><div><span>LOCAL HIDDEN-VARIABLE BOUND</span><strong>2.000</strong><p>Ideal quantum maximum: {result.quantum_max.toFixed(3)}</p></div></div>
    <div className={`${styles.result} ${result.violation_supported ? styles.pass : styles.neutral}`}><ShieldCheck size={20} /><div><strong>{result.violation_supported ? 'Witness above the local bound' : 'No confident violation in this run'}</strong><p>{result.violation_supported ? 'The lower confidence bound exceeds 2 under the stated model assumptions.' : 'Noise, interception, a product state or finite sampling can prevent a clear violation. This does not prove that a state is unentangled.'}</p></div></div>
    <div className={styles.correlators}>{result.settings.map(row => <div key={row.setting}><span>{row.setting}</span><strong>{row.correlation.toFixed(3)}</strong><small>{row.shots.toLocaleString()} shots</small><div className={styles.counts}>{Object.entries(row.counts).sort().map(([bits, count]) => <span key={bits}>{bits}: {count}</span>)}</div></div>)}</div>
    <p className={styles.note}>{result.confidence_note} {result.scope}</p>
  </div>;
}
