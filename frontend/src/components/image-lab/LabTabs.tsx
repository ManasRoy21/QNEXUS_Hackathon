import Link from 'next/link';
import { FileImage, FileText } from 'lucide-react';
import styles from './lab.module.css';

export default function LabTabs({ active }: { active: 'image' | 'text' }) {
  return <nav className={styles.labTabs} aria-label="Integrity lab mode">
    <Link href="/image-lab" aria-current={active === 'image' ? 'page' : undefined}><FileImage size={16} /> Image lab</Link>
    <Link href="/text-lab" aria-current={active === 'text' ? 'page' : undefined}><FileText size={16} /> Text lab</Link>
    <span>Two ways to test digital trust.</span>
  </nav>;
}
