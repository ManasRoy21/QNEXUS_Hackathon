import React from 'react';
import { Cpu, Info } from 'lucide-react';

interface SimulatedBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export default function SimulatedBadge({
  className = '',
  size = 'md',
  showTooltip = false,
}: SimulatedBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 space-x-1',
    md: 'text-xs px-2.5 py-1 space-x-1.5',
    lg: 'text-sm px-3.5 py-1.5 space-x-2',
  }[size];

  return (
    <div
      className={`inline-flex items-center font-mono font-bold rounded-md bg-[#E6FBF7] text-[#071842] border border-[#20C8A7] shadow-xs tracking-wider uppercase ${sizeClasses} ${className}`}
      title="Phase 2 SRS Requirement: All quantum optical behaviors are simulated via CSPRNG and statistical models."
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#20C8A7] animate-pulse" />
      <Cpu className="w-3.5 h-3.5 text-[#071842]" />
      <span>SIMULATED</span>
      {showTooltip && (
        <span className="text-[10px] text-[#475569] font-normal normal-case ml-1">
          (Statistically faithful CSPRNG model)
        </span>
      )}
    </div>
  );
}
