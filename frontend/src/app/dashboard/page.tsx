'use client';

import React, { useState, useEffect } from 'react';
import SimulatedBadge from '@/components/common/SimulatedBadge';
import ProtocolCatalogueModal from '@/components/protocols/ProtocolCatalogueModal';
import RoleConsoles from '@/components/dashboard/RoleConsoles';
import ProtocolSequenceTrace from '@/components/dashboard/ProtocolSequenceTrace';
import GuidedTour from '@/components/dashboard/GuidedTour';
import ResetButton from '@/components/common/ResetButton';
import { phase2Api } from '@/services/phase2Api';
import { ProtocolInfo, SessionState, CreateSessionRequest } from '@/types/phase2';
import {
  Sparkles,
  RotateCcw,
  Download,
  FileText,
  FileSpreadsheet,
  Sliders,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const [protocols, setProtocols] = useState<ProtocolInfo[]>([]);
  const [session, setSession] = useState<SessionState | null>(null);
  const [catalogueOpen, setCatalogueOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [tourStep, setTourStep] = useState<number>(1);
  const [showTour, setShowTour] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const init = async () => {
    try {
      setInitError(null);
      setLoading(true);
      const cat = await phase2Api.getProtocols();
      setProtocols(cat.protocols);
      // Create initial session with Practical QDS
      const initSess = await phase2Api.createSession({
        protocol_id: 'practical_qds',
        distance_km: 25.0,
        message_size_bytes: 512,
      });
      setSession(initSess);
    } catch (err: any) {
      console.error('Failed to initialize session:', err);
      setInitError(err?.message || 'Backend unreachable on http://localhost:8000');
    } finally {
      setLoading(false);
    }
  };

  // Load protocols and initialize default session
  useEffect(() => {
    init();
  }, []);

  const handleSelectProtocol = async (req: CreateSessionRequest) => {
    try {
      setLoading(true);
      const newSess = await phase2Api.createSession(req);
      setSession(newSess);
      setTourStep(2);
      setNotification(`Loaded protocol: ${newSess.protocol_name}`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Failed to select protocol:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = async () => {
    try {
      setLoading(true);
      const newSess = await phase2Api.createSession({
        protocol_id: session?.protocol_id || 'practical_qds',
        distance_km: session?.distance_km || 25.0,
        message_size_bytes: 512,
      });
      setSession(newSess);
      setTourStep(1);
      setNotification(`Session reset: Restored clean initial state for ${newSess.protocol_name}`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Failed to reset session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeygen = async () => {
    if (!session) return;
    try {
      setLoading(true);
      const updated = await phase2Api.keygen(session.session_id);
      setSession(updated);
      setTourStep(3);
    } catch (err) {
      console.error('Keygen failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (message: string, largeDocKb?: number) => {
    if (!session) return;
    try {
      setLoading(true);
      const updated = await phase2Api.sign(session.session_id, message, largeDocKb);
      setSession(updated);
      setTourStep(4);
    } catch (err) {
      console.error('Sign failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBob = async () => {
    if (!session) return;
    try {
      setLoading(true);
      const updated = await phase2Api.verify(session.session_id, 'Bob');
      setSession(updated);
    } catch (err) {
      console.error('Bob verification failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferCharlie = async () => {
    if (!session) return;
    try {
      setLoading(true);
      const updated = await phase2Api.transfer(session.session_id);
      setSession(updated);
    } catch (err) {
      console.error('Transfer failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCharlie = async () => {
    if (!session) return;
    try {
      setLoading(true);
      const updated = await phase2Api.verify(session.session_id, 'Charlie');
      setSession(updated);
    } catch (err) {
      console.error('Charlie verification failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Offline Alert Banner ── */}
      {initError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3 text-sm text-red-800">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <span className="font-semibold">Backend Unreachable:</span> {initError}. Make sure the FastAPI service is running on port 8000 (`uvicorn main:app --port 8000`).
            </div>
          </div>
          <button
            onClick={init}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ── Active Session Bar ── */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
              ACTIVE PROTOCOL SIMULATION
            </span>
            <SimulatedBadge size="sm" />
          </div>
          <div className="flex items-center space-x-3">
            <h1 className="font-serif text-2xl sm:text-3xl text-[#071842] font-bold">
              {session?.protocol_name || (initError ? 'Backend Disconnected' : 'Loading Protocol...')}
            </h1>
            {session && (
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#F1F5F9] border border-[#CBD5E1] text-[#071842] font-semibold">
                {session.distance_km} km ({session.channel_loss_db} dB Loss)
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <ResetButton
            label="Reset Session"
            size="md"
            variant="outline"
            disabled={loading || !session}
            onReset={handleResetSession}
            title="Reset current session to clean state"
          />

          <button
            onClick={() => setCatalogueOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#071842] hover:bg-[#0c2464] text-white font-semibold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-[#20C8A7]" />
            <span>Change Protocol / Parameters</span>
          </button>

          {session && (
            <>
              <a
                href={phase2Api.getExportCsvUrl(session.session_id)}
                download
                className="px-3.5 py-2 rounded-lg border border-[#CBD5E1] bg-[#F8FAF9] hover:bg-slate-100 text-[#071842] font-semibold transition-colors flex items-center space-x-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>CSV</span>
              </a>
              <a
                href={phase2Api.getExportReportUrl(session.session_id)}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-lg border border-[#CBD5E1] bg-[#F8FAF9] hover:bg-slate-100 text-[#071842] font-semibold transition-colors flex items-center space-x-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>PDF Report</span>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 bg-[#E6FBF7] border border-[#20C8A7] rounded-xl text-xs font-mono text-[#071842] flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-[#20C8A7]" />
          <span>{notification}</span>
        </div>
      )}

      {/* In-Dashboard Guided Walkthrough (NFR-6) */}
      {showTour && (
        <GuidedTour
          currentStep={tourStep}
          onOpenCatalogue={() => setCatalogueOpen(true)}
          onDismiss={() => setShowTour(false)}
        />
      )}

      {/* Three-Pane Multi-Party Role Consoles (FR-G1) */}
      <RoleConsoles
        session={session}
        loading={loading}
        onKeygen={handleKeygen}
        onSign={handleSign}
        onVerifyBob={handleVerifyBob}
        onTransferCharlie={handleTransferCharlie}
        onVerifyCharlie={handleVerifyCharlie}
      />

      {/* Protocol Sequence Trace (FR-G2 / SRS Figure 2) */}
      <ProtocolSequenceTrace
        trace={session?.protocol_trace || []}
        activeStep={session?.status}
      />

      {/* Protocol Selection Modal */}
      <ProtocolCatalogueModal
        isOpen={catalogueOpen}
        onClose={() => setCatalogueOpen(false)}
        protocols={protocols}
        currentProtocolId={session?.protocol_id || 'practical_qds'}
        onSelectProtocol={handleSelectProtocol}
      />
    </div>
  );
}
