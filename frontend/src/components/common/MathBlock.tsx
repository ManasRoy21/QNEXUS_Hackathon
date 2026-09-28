'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

export interface MathBlockProps {
  formula: string;
  className?: string;
  ariaLabel?: string;
  errorColor?: string;
}

export interface InlineMathProps {
  math: string;
  className?: string;
  ariaLabel?: string;
  errorColor?: string;
}

/**
 * Clean common LaTeX quirks and ensure consistent formatting
 */
export function sanitizeLatex(latex: string): string {
  if (!latex) return '';
  return latex
    .trim()
    .replace(/\\!/g, '') // remove redundant negative thin spaces if KaTeX has trouble
    .replace(/\\cdot/g, ' \\cdot ')
    .replace(/\s+/g, ' ');
}

/**
 * Format a number into standard mathematical LaTeX notation,
 * converting scientific '1.234e-05' notation into '1.234 \\times 10^{-5}'.
 */
export function formatScientific(
  value: number | string | null | undefined,
  precision: number = 4
): string {
  if (value === null || value === undefined) return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);

  // Check if string was already in exponential form or if number is very small/large
  const str = String(value);
  const isExpStr = /e[+-]?\d+/i.test(str);

  if (isExpStr || (Math.abs(num) > 0 && (Math.abs(num) < 0.001 || Math.abs(num) >= 10000))) {
    const expStr = num.toExponential(precision);
    const [mantissa, exp] = expStr.split('e');
    const expInt = parseInt(exp, 10);
    // Remove trailing zeros in mantissa if any
    const cleanMantissa = parseFloat(mantissa).toString();
    return `${cleanMantissa} \\times 10^{${expInt}}`;
  }

  // Normal decimal
  return num.toFixed(precision);
}

/**
 * Convert plain-text QDS variable notations into proper LaTeX syntax
 */
export function formatQdsVariable(text: string): string {
  if (!text) return '';
  return text
    .replace(/\bQBER_bob\b/g, '\\text{QBER}_B')
    .replace(/\bQBER_charlie\b/g, '\\text{QBER}_C')
    .replace(/\bQBER_base\b/g, '\\text{QBER}_{\\text{base}}')
    .replace(/\bQBER_obs\b/g, 'e_{\\text{obs}}')
    .replace(/\bQBER\b/g, '\\text{QBER}')
    .replace(/\bS_c\b/g, 'S_C')
    .replace(/\bT_v\b/g, 'T_V')
    .replace(/\bT_a\b/g, 'T_A')
    .replace(/\bP_C\^c\b/g, 'P_{C^c}')
    .replace(/\bP_C_c\b/g, 'P_{C^c}')
    .replace(/\bM_u\b/g, 'M_u')
    .replace(/\bn_test\b/g, 'n_{\\text{test}}')
    .replace(/\bbeta\b/g, '\\beta')
    .replace(/\bgamma\b/g, '\\gamma')
    .replace(/\bdelta\b/g, '\\Delta')
    .replace(/ε₁/g, '\\varepsilon_1')
    .replace(/ε₂/g, '\\varepsilon_2')
    .replace(/Δ/g, '\\Delta')
    .replace(/β/g, '\\beta')
    .replace(/γ/g, '\\gamma')
    .replace(/≤/g, '\\leq ')
    .replace(/≥/g, '\\geq ')
    .replace(/→/g, '\\implies ')
    .replace(/⇒/g, '\\implies ')
    .replace(/×/g, '\\times ')
    .replace(/·/g, '\\cdot ');
}

/**
 * Reusable Display / Block Mathematics component
 */
export const MathBlock: React.FC<MathBlockProps> = ({
  formula,
  className = '',
  ariaLabel,
  errorColor = '#f43f5e',
}) => {
  const html = useMemo(() => {
    if (!formula) return '';
    try {
      return katex.renderToString(formula, {
        displayMode: true,
        throwOnError: false,
        errorColor,
      });
    } catch {
      return `<span class="katex-error">${formula}</span>`;
    }
  }, [formula, errorColor]);

  if (!formula) return null;

  return (
    <div
      className={`math-block-container ${className}`}
      role="math"
      aria-label={ariaLabel || formula}
      tabIndex={0}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

/**
 * Reusable Inline Mathematics component
 */
export const InlineMath: React.FC<InlineMathProps> = ({
  math,
  className = '',
  ariaLabel,
  errorColor = '#f43f5e',
}) => {
  const html = useMemo(() => {
    if (!math) return '';
    try {
      return katex.renderToString(math, {
        displayMode: false,
        throwOnError: false,
        errorColor,
      });
    } catch {
      return `<span class="katex-error">${math}</span>`;
    }
  }, [math, errorColor]);

  if (!math) return null;

  return (
    <span
      className={`inline-math-container ${className}`}
      role="math"
      aria-label={ariaLabel || math}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MathBlock;
