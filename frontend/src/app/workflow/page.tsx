import Link from 'next/link';
import { ArrowUpRight, FlaskConical, FileText, ChevronRight } from 'lucide-react';
import SimulationWorkflow from '@/components/workflow/SimulationWorkflow';
import styles from '@/components/workflow/workflow.module.css';

export default function WorkflowPage() {
  return <div className={styles.workspace}>
    <div className={styles.breadcrumb}><Link href="/">Workspace</Link><ChevronRight size={12} /><span>Research console</span></div>
    <header className={styles.pageHeader}>
      <div><div className={styles.eyebrow}><FlaskConical size={15} /> QUANTUM COMMUNICATION RESEARCH</div>
        <h1>From protocol to evidence.</h1>
        <p>A guided workspace to prepare quantum states, verify messages, and investigate channel disturbance.</p>
      </div>
      <Link href="/text-lab" className={styles.quickLink}><FileText size={17} /><span>Just testing a message?<strong>Open the text lab <ArrowUpRight size={13} /></strong></span></Link>
    </header>
    <SimulationWorkflow cloudDeployment={!!process.env.VERCEL} />
    <div className={styles.scopeNote}><FlaskConical size={15} /><p><strong>Understand the model.</strong> Channel experiments run locally in a simulator. Message receipts use classical cryptography. These results do not establish complete QDS security or non-repudiation.</p><Link href="/research">Research notes <ArrowUpRight size={13} /></Link></div>
  </div>;
}
