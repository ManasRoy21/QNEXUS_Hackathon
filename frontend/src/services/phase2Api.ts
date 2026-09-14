import axios from 'axios';
import {
  ProtocolCatalogueResponse,
  ProtocolInfo,
  CreateSessionRequest,
  SessionState,
  BenchmarkSweepResponse,
} from '@/types/phase2';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const phase2Api = {
  // Protocol Catalogue
  async getProtocols(): Promise<ProtocolCatalogueResponse> {
    const res = await axios.get<ProtocolCatalogueResponse>(`${API_BASE_URL}/protocols`);
    return res.data;
  },

  async getProtocol(id: string): Promise<ProtocolInfo> {
    const res = await axios.get<ProtocolInfo>(`${API_BASE_URL}/protocols/${id}`);
    return res.data;
  },

  // Sessions
  async createSession(req: CreateSessionRequest): Promise<SessionState> {
    const res = await axios.post<SessionState>(`${API_BASE_URL}/sessions`, req);
    return res.data;
  },

  async getSession(sessionId: string): Promise<SessionState> {
    const res = await axios.get<SessionState>(`${API_BASE_URL}/sessions/${sessionId}`);
    return res.data;
  },

  async keygen(sessionId: string, numBits: number = 384): Promise<SessionState> {
    const res = await axios.post<SessionState>(`${API_BASE_URL}/sessions/${sessionId}/keygen`, {
      session_id: sessionId,
      num_bits: numBits,
    });
    return res.data;
  },

  async sign(sessionId: string, message: string, largeDocKb?: number): Promise<SessionState> {
    const res = await axios.post<SessionState>(`${API_BASE_URL}/sessions/${sessionId}/sign`, {
      session_id: sessionId,
      message,
      large_doc_simulated_kb: largeDocKb,
    });
    return res.data;
  },

  async verify(
    sessionId: string,
    verifierRole: 'Bob' | 'Charlie' = 'Bob',
    forceForgery: boolean = false,
    untrustedNodeCompromised?: boolean
  ): Promise<SessionState> {
    const res = await axios.post<SessionState>(`${API_BASE_URL}/sessions/${sessionId}/verify`, {
      session_id: sessionId,
      verifier_role: verifierRole,
      force_forgery: forceForgery,
      untrusted_node_compromised: untrustedNodeCompromised,
    });
    return res.data;
  },

  async transfer(sessionId: string): Promise<SessionState> {
    const res = await axios.post<SessionState>(`${API_BASE_URL}/sessions/${sessionId}/transfer`, {
      session_id: sessionId,
    });
    return res.data;
  },

  async simulateAttack(
    sessionId: string,
    attackType: string,
    intensity: number = 1.0,
    targetRole: string = 'Bob'
  ): Promise<SessionState> {
    const res = await axios.post<SessionState>(`${API_BASE_URL}/sessions/${sessionId}/attack`, {
      session_id: sessionId,
      attack_type: attackType,
      intensity,
      target_role: targetRole,
    });
    return res.data;
  },

  // Benchmarks
  async runSweep(
    protocolIds: string[] = ['practical_qds', 'mdi_qds', 'otuh_qds'],
    distancePoints: number[] = [10, 30, 60, 90, 120],
    messageSize: number = 1024
  ): Promise<BenchmarkSweepResponse> {
    const res = await axios.post<BenchmarkSweepResponse>(`${API_BASE_URL}/benchmarks/sweep`, {
      protocol_ids: protocolIds,
      distance_points_km: distancePoints,
      message_size_bytes: messageSize,
    });
    return res.data;
  },

  getExportCsvUrl(sessionId?: string): string {
    return `${API_BASE_URL}/benchmarks/export/csv${sessionId ? `?session_id=${sessionId}` : ''}`;
  },

  getExportReportUrl(sessionId: string): string {
    return `${API_BASE_URL}/benchmarks/export/report/${sessionId}`;
  },
};
