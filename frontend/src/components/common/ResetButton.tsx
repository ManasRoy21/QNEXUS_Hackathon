'use client';

import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

export interface ResetButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'outline' | 'dark' | 'teal' | 'ghost' | 'subtle';
  loading?: boolean;
  iconClassName?: string;
  showIcon?: boolean;
  onReset?: () => void | Promise<void>;
}

export default function ResetButton({
  label = 'Reset',
  size = 'md',
  variant = 'outline',
  loading = false,
  disabled = false,
  iconClassName = '',
  showIcon = true,
  className = '',
  onClick,
  onReset,
  title,
  type = 'button',
  ...rest
}: ResetButtonProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading || internalLoading) return;

    if (onReset) {
      const res = onReset();
      if (res && typeof res.then === 'function') {
        try {
          setInternalLoading(true);
          await res;
        } finally {
          setInternalLoading(false);
        }
      }
    }

    if (onClick) {
      onClick(e);
    }
  };

  const isBusy = loading || internalLoading;

  // Size styles
  const sizeStyles = {
    xs: 'px-2 py-0.5 text-[10px] space-x-1 rounded',
    sm: 'px-2.5 py-1.5 text-xs space-x-1.5 rounded-md',
    md: 'px-3.5 py-2 text-xs space-x-1.5 rounded-lg',
    lg: 'px-5 py-2.5 text-sm space-x-2 rounded-xl font-semibold',
  }[size];

  // Variant styles adhering to the Quvora design system
  const variantStyles = {
    outline:
      'border border-[#CBD5E1] bg-white text-[#475569] hover:text-[#071842] hover:bg-[#F8FAF9] hover:border-[#071842]/60 shadow-2xs',
    subtle:
      'border border-[#CBD5E1] bg-[#F1F5F9] text-[#071842] hover:bg-[#E2E8F0] hover:border-[#94A3B8] shadow-2xs',
    dark:
      'bg-[#071842] text-white border border-[#071842] hover:bg-[#0c2464] hover:border-[#0c2464] shadow-xs',
    teal:
      'bg-[#20C8A7] text-[#071842] font-bold border border-[#20C8A7] hover:bg-[#1bb395] hover:border-[#1bb395] shadow-xs',
    ghost:
      'border border-transparent bg-transparent text-[#64748B] hover:text-[#071842] hover:bg-slate-100',
  }[variant];

  // Icon color per variant
  const defaultIconColor = {
    outline: 'text-[#20C8A7]',
    subtle: 'text-[#20C8A7]',
    dark: 'text-[#20C8A7]',
    teal: 'text-[#071842]',
    ghost: 'text-[#64748B]',
  }[variant];

  const iconColor = iconClassName || defaultIconColor;

  return (
    <button
      type={type}
      disabled={disabled || isBusy}
      onClick={handleClick}
      title={title || label}
      className={`group font-mono inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${sizeStyles} ${variantStyles} ${className}`}
      {...rest}
    >
      {showIcon && (
        <RotateCcw
          className={`w-3.5 h-3.5 shrink-0 ${iconColor} ${
            isBusy
              ? 'animate-spin'
              : 'transition-transform duration-300 ease-out group-hover:-rotate-90'
          }`}
        />
      )}
      {label && <span>{isBusy ? 'Resetting...' : label}</span>}
    </button>
  );
}
