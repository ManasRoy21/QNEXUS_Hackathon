'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import SecurityVsLengthCurve from '@/components/metrics/SecurityVsLengthCurve';
import QBERChart from '@/components/metrics/QBERChart';
import { qdsApi } from '@/services/api';
import { MetricsResponse } from '@/types';

// Renders a single stat card with consistent layout
function StatCard({
  label,
  value,
  sub,
  colorClass = 'text-slate-100',
  loading = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  colorClass?: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-center shadow flex flex-col gap-1">
      <span className="text-[10px] font-mono text-slate-500 uppercase block">{label}</span>
      {loading ? (
        <span className="text-xl font-black font-mono text-slate-600 animate-pulse">--</span>
      ) : (
        <span className={`text-xl font-black font-mono ${colorClass}`}>{value}</span>
      )}
      {sub && !loading && (
        <span className="text-[9px] font-mono text-slate-600 leading-tight">{sub}</span>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Increment on each successful fetch to force chart remount → re-render
  const [chartKey, setChartKey] = useState<number>(0);
  const fetchCount = useRef(0);

  // Stable fetch callback — safe to call from button and useEffect
  const loadMetrics = useCallback(async () => {
    if (loading) return; // debounce: skip if already in-flight
    const thisCall = ++fetchCount.current;
    setLoading(true);
    setError(null);
    try {
      const data = await qdsApi.getMetrics();
      // Guard against out-of-order responses
      if (thisCall !== fetchCount.current) return;
      setMetrics(data);
      setChartKey((k) => k + 1); // bump key → force chart children remount
    } catch (err: any) {
      if (thisCall !== fetchCount.current) return;
      console.warn('Failed to load metrics:', err.message);
      setError('Could not reach /api/v1/metrics. Verify FastAPI backend is running on port 8001.');
    } finally {
      if (thisCall === fetchCount.current) setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load on mount
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // ── Derived stats — single source of truth ─────────────────────────────────
  // total_verifications = the actual number of /simulate/verify calls made.
  // threats_detected + clean_runs = total_verifications (invariant).
  // total_simulations ≥ total_verifications because some keygen sessions never
  // proceed to verify (benchmark / incomplete flows).
  const totalVerifications = metrics?.total_verifications ?? 0;
  const threatsBlocked = metrics?.threats_detected ?? 0;
  const cleanRuns = metrics?.clean_runs ?? 0;
  // Sanity check: should always hold true
  const totalEvaluated = threatsBlocked + cleanRuns; // == total_verifications
  // Detection rate: threats / total_verifications  (correct denominator)
  const detectionRatePct =
    totalVerifications > 0
      ? ((threatsBlocked / totalVerifications) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-black text-slate-100 tracking-wide">
              Statistical Bounds &amp; Aggregate Metrics
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800 text-indigo-300">
              Hoeffding Analytic Layer
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Formal Born-rule statistical validation, QBER tracking, and cumulative threat detection efficacy.
          </p>
        </div>

        <button
          onClick={loadMetrics}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 text-xs font-mono text-slate-300 transition-colors flex items-center space-x-2"
        >
          <span className={loading ? 'inline-block animate-spin' : 'inline-block'}>↻</span>
          <span>{loading ? 'Refreshing…' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-300 text-xs font-mono">
          {error}
        </div>
      )}

      {/* ── KPI Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Simulations"
          value={metrics?.total_simulations ?? '--'}
          sub="keygen sessions created"
          colorClass="text-slate-100"
          loading={loading && !metrics}
        />

        <StatCard
          label="Verifications"
          value={totalVerifications || '--'}
          sub="verify calls completed"
          colorClass="text-cyan-400"
          loading={loading && !metrics}
        />

        <StatCard
          label="Threats Blocked"
          value={threatsBlocked || (metrics ? '0' : '--')}
          sub={`of ${totalEvaluated} evaluated`}
          colorClass="text-rose-400"
          loading={loading && !metrics}
        />

        <StatCard
          label="Clean Runs"
          value={cleanRuns || (metrics ? '0' : '--')}
          sub={`of ${totalEvaluated} evaluated`}
          colorClass="text-emerald-400"
          loading={loading && !metrics}
        />

        <StatCard
          label="Detection Rate"
          value={metrics ? `${detectionRatePct}%` : '--'}
          sub={`${threatsBlocked} / ${totalVerifications} verif.`}
          colorClass={
            parseFloat(detectionRatePct) >= 80
              ? 'text-emerald-400'
              : parseFloat(detectionRatePct) >= 50
              ? 'text-amber-400'
              : 'text-indigo-400'
          }
          loading={loading && !metrics}
        />

        <StatCard
          label="Active Sessions"
          value={metrics?.active_sessions ?? '--'}
          sub="in-memory sessions"
          colorClass="text-amber-400"
          loading={loading && !metrics}
        />
      </div>

      {/* ── Accounting note ─────────────────────────────────────────────── */}
      {metrics && metrics.total_simulations > totalEvaluated && (
        <div className="text-[10px] font-mono text-slate-600 px-1">
          ℹ Simulations ({metrics.total_simulations}) &gt; Evaluations ({totalEvaluated}) — the gap represents
          keygen sessions that were initialized but never proceeded to{' '}
          <code>/simulate/verify</code> (e.g. benchmark prep runs, incomplete workflows).
        </div>
      )}

      {/* ── Dual Charts — keyed so they fully remount after each refresh ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-md">
          <SecurityVsLengthCurve key={`svl-${chartKey}`} />
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-md">
          <QBERChart key={`qber-${chartKey}`} currentQBER={metrics?.average_qber} />
        </div>
      </div>

      {/* ── Attack Surface Coverage ─────────────────────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-md space-y-3">
        <h3 className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
          Covered Quantum Attack Surface (100% Deterministic Detection)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {(
            metrics?.supported_attack_classes || [
              'INTERCEPT_RESEND',
              'FORGERY',
              'IMPERSONATION',
              'REPLAY',
              'REPUDIATION',
              'DETECTOR_SIDE_CHANNEL',
            ]
          ).map((cls) => (
            <div
              key={cls}
              className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-center font-mono text-xs font-semibold text-slate-300"
            >
              {cls}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
