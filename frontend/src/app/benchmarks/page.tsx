'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Download,
  FileSpreadsheet,
  FileText,
  Play,
  RotateCcw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import SimulatedBadge from '@/components/common/SimulatedBadge';
import { phase2Api } from '@/services/phase2Api';
import { BenchmarkSweepResponse } from '@/types/phase2';

export default function BenchmarksPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [sweepData, setSweepData] = useState<BenchmarkSweepResponse | null>(null);
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([
    'practical_qds',
    'mdi_qds',
    'otuh_qds',
    'tf_qds',
  ]);
  const [messageSize, setMessageSize] = useState<number>(1024);

  const handleRunSweep = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await phase2Api.runSweep(
        selectedProtocols,
        [10, 30, 60, 90, 120, 150],
        messageSize
      );
      setSweepData(res);
    } catch (err) {
      console.error('Sweep execution failed:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProtocols, messageSize]);

  // Run initial benchmark sweep on load
  useEffect(() => {
    handleRunSweep();
  }, [handleRunSweep]);

  const handleToggleProtocol = (pid: string) => {
    setSelectedProtocols((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
    );
  };

  // Transform sweep series into Recharts-friendly array
  const chartDataDistance = [10, 30, 60, 90, 120, 150].map((dist) => {
    const entry: any = { distance_km: dist };
    sweepData?.series.forEach((s) => {
      const pt = s.points.find((p) => p.distance_km === dist);
      if (pt) {
        entry[s.protocol_id] = pt.effective_key_rate_bps;
        entry[`${s.protocol_id}_qber`] = pt.simulated_qber * 100;
      }
    });
    return entry;
  });

  const protocolColors: Record<string, string> = {
    practical_qds: '#071842',
    mdi_qds: '#263EDC',
    otuh_qds: '#20C8A7',
    tf_qds: '#9333EA',
    decoy_qds: '#EA580C',
  };

  return (
    <div className="space-y-8">
      {/* ── Banner Header ── */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
                MODULE F: BENCHMARKING & COMPARATIVE ENGINE
              </span>
              <SimulatedBadge size="sm" />
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#071842] tracking-tight">
              Cross-Protocol Benchmark Sweeps
            </h1>
            <p className="text-xs sm:text-sm text-[#475569] font-sans max-w-2xl">
              Configurable parameter sweeps across experimentally proven QDS protocols comparing
              signing rates, effective key consumption, tolerated channel loss, and maximum distance (FR-F2).
            </p>
          </div>

          {/* Export Actions (FR-F3) */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <a
              href={phase2Api.getExportCsvUrl()}
              download
              className="px-4 py-2.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAF9] hover:bg-slate-100 text-[#071842] font-semibold transition-colors flex items-center space-x-1.5 shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV (FR-F3)</span>
            </a>
          </div>
        </div>

        {/* Sweep Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {/* Protocol Checkboxes */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-[#64748B] font-bold uppercase mr-1">Protocols:</span>
            {[
              { id: 'practical_qds', label: 'Practical QDS' },
              { id: 'mdi_qds', label: 'MDI-QDS' },
              { id: 'otuh_qds', label: 'OTUH-QDS' },
              { id: 'tf_qds', label: 'Twin-Field QDS' },
            ].map((p) => {
              const isChecked = selectedProtocols.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => handleToggleProtocol(p.id)}
                  className={`px-3 py-1.5 rounded-lg border transition-all flex items-center space-x-1.5 ${
                    isChecked
                      ? 'bg-[#071842] text-white border-[#071842] font-bold'
                      : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: protocolColors[p.id] }}
                  />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sweep Execution Button */}
          <button
            onClick={handleRunSweep}
            disabled={loading || selectedProtocols.length === 0}
            className="px-5 py-2.5 rounded-lg bg-[#20C8A7] hover:bg-[#1bb395] text-[#071842] font-mono text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{loading ? 'Running Sweep...' : 'Execute Sweep'}</span>
          </button>
        </div>
      </div>

      {/* ── Charts Grid (FR-F2) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Effective Key Rate vs Distance */}
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="border-b border-[#E2E8F0] pb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-[#64748B] uppercase">
                SCALING LAW COMPARISON
              </span>
              <h3 className="font-serif text-lg text-[#071842] font-bold">
                Key Generation Rate vs. Simulated Distance (km)
              </h3>
            </div>
            <SimulatedBadge size="sm" />
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartDataDistance} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="distance_km"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'Distance (km)', position: 'insideBottomRight', offset: -5, fontSize: 11 }}
                />
                <YAxis
                  scale="log"
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'Rate (bps)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#071842',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                {selectedProtocols.map((pid) => (
                  <Line
                    key={pid}
                    type="monotone"
                    dataKey={pid}
                    stroke={protocolColors[pid]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={pid.replace('_', ' ').toUpperCase()}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] font-mono text-[#64748B]">
            Notice TF-QDS rate degrades more gracefully at &gt;100 km due to O(sqrt(eta)) single-photon interference.
          </p>
        </div>

        {/* Chart 2: Simulated QBER vs Distance */}
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="border-b border-[#E2E8F0] pb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-[#64748B] uppercase">
                CHANNEL PHYSICS
              </span>
              <h3 className="font-serif text-lg text-[#071842] font-bold">
                Quantum Bit Error Rate (QBER %) vs. Distance
              </h3>
            </div>
            <SimulatedBadge size="sm" />
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartDataDistance} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="distance_km"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'Distance (km)', position: 'insideBottomRight', offset: -5, fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 10]}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'QBER (%)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#071842',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                {selectedProtocols.map((pid) => (
                  <Line
                    key={pid}
                    type="monotone"
                    dataKey={`${pid}_qber`}
                    stroke={protocolColors[pid]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={`${pid.replace('_', ' ').toUpperCase()} QBER`}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] font-mono text-[#64748B]">
            Error rate elevates over distance as dark count fraction increases relative to attenuated signal.
          </p>
        </div>
      </div>

      {/* ── Table Summary Sourced from Appendix A Comparison ── */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="border-b border-[#E2E8F0] pb-3">
          <span className="text-xs font-mono font-bold text-[#64748B] uppercase">
            TRACEABILITY (SRS APPENDIX A)
          </span>
          <h3 className="font-serif text-xl text-[#071842] font-bold">
            Phase-1 to Phase-2 Protocol Comparison Matrix
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[#CBD5E1] bg-[#F8FAF9] text-[#64748B] text-left">
                <th className="p-3">PROTOCOL</th>
                <th className="p-3">STATUS</th>
                <th className="p-3">KEY STRENGTH</th>
                <th className="p-3">RECORD EXPERIMENT</th>
                <th className="p-3">ADAPTER STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[#071842]">
              <tr>
                <td className="p-3 font-bold">Practical QDS (Yin, Fu, Chen)</td>
                <td className="p-3 text-emerald-700">Experimentally proven</td>
                <td className="p-3">Standard QKD hardware</td>
                <td className="p-3">102 km fibre</td>
                <td className="p-3 text-[#20C8A7] font-bold">ACTIVE ADAPTER (M1)</td>
              </tr>
              <tr>
                <td className="p-3 font-bold">MDI-QDS (Roberts et al.)</td>
                <td className="p-3 text-emerald-700">Experimentally proven</td>
                <td className="p-3">Immune to detector attacks</td>
                <td className="p-3">200 sq. km metro network</td>
                <td className="p-3 text-[#20C8A7] font-bold">ACTIVE ADAPTER (M2)</td>
              </tr>
              <tr>
                <td className="p-3 font-bold">OTUH-QDS (2023)</td>
                <td className="p-3 text-emerald-700">Experimentally proven</td>
                <td className="p-3">10^8x efficiency gain</td>
                <td className="p-3">384-bit key signs huge files</td>
                <td className="p-3 text-[#20C8A7] font-bold">ACTIVE ADAPTER (M2)</td>
              </tr>
              <tr>
                <td className="p-3 font-bold">Twin-Field QDS (TF-QDS)</td>
                <td className="p-3 text-emerald-700">Experimentally proven</td>
                <td className="p-3">O(sqrt(eta)) long distance</td>
                <td className="p-3">504 km fibre (2025)</td>
                <td className="p-3 text-[#20C8A7] font-bold">ACTIVE ADAPTER</td>
              </tr>
              <tr>
                <td className="p-3 font-bold">Decoy-State QDS (2020)</td>
                <td className="p-3 text-emerald-700">Experimentally proven</td>
                <td className="p-3">PNS attack detection</td>
                <td className="p-3">280 km fibre</td>
                <td className="p-3 text-[#20C8A7] font-bold">ACTIVE ADAPTER</td>
              </tr>
              <tr className="bg-slate-50 text-[#64748B]">
                <td className="p-3 font-bold">Gottesman-Chuang (2001)</td>
                <td className="p-3">Theoretical</td>
                <td className="p-3">First proof QDS is possible</td>
                <td className="p-3">Proof of concept only</td>
                <td className="p-3">Theoretical Reference (FR-A3)</td>
              </tr>
              <tr className="bg-slate-50 text-[#64748B]">
                <td className="p-3 font-bold">ACJ Coherent-State (2006)</td>
                <td className="p-3">Theoretical</td>
                <td className="p-3">Simplified states to laser light</td>
                <td className="p-3">Enabled later lab tests</td>
                <td className="p-3">Theoretical Reference (FR-A3)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
