/**
 * Centralized API client for all QDS Simulation Endpoints.
 * Encapsulates communication with the FastAPI backend.
 */

import axios from 'axios';
import {
  ProtocolEntry,
  MaterialGenerationRequest,
  CanonicalSimulationState,
  AttackSimulationResponse,
  SweepResponse,
  StatisticalBoundResponse,
  StatisticalBoundRequest,
} from '@/types/unifiedSimulation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const qdsClient = {
  /** Fetch catalog of all supported and theoretical QDS protocols */
  async getProtocols(): Promise<{ protocols: ProtocolEntry[]; total_count: number }> {
    const res = await axios.get(`${API_BASE_URL}/protocols`);
    return res.data;
  },

  /** Generate deterministic quantum signature material */
  async generateMaterial(req: MaterialGenerationRequest): Promise<CanonicalSimulationState> {
    const res = await axios.post<CanonicalSimulationState>(
      `${API_BASE_URL}/simulation/generate-material`,
      req
    );
    return res.data;
  },

  /** Run protocol-aware attack simulation against an existing simulation state */
  async runAttack(
    simulationId: string,
    protocol: string,
    attack: string,
    intensity: number = 1.0,
    parameters: Record<string, any> = {}
  ): Promise<AttackSimulationResponse> {
    const res = await axios.post<AttackSimulationResponse>(`${API_BASE_URL}/simulation/attack`, {
      simulation_id: simulationId,
      protocol,
      attack,
      intensity,
      parameters,
    });
    return res.data;
  },

  /** Execute a multi-point parameter sweep across real simulations */
  async runSweep(
    protocol: string,
    parameter: string,
    values: number[],
    pulseCount: number = 2000,
    seed: number = 42,
    attack?: string,
    attackParameters: Record<string, any> = {}
  ): Promise<SweepResponse> {
    const res = await axios.post<SweepResponse>(`${API_BASE_URL}/simulation/sweep`, {
      protocol,
      parameter,
      values,
      pulse_count: pulseCount,
      seed,
      attack: attack || null,
      attack_parameters: attackParameters,
    });
    return res.data;
  },

  /** Compute rigorous mathematical statistical bounds (Phase 5) */
  async computeStatisticalBound(
    reqOrMethod: string | StatisticalBoundRequest,
    sampleSize?: number,
    delta?: number,
    observedRate?: number,
    populationSize?: number,
    parameters: Record<string, any> = {},
    simulationId?: string
  ): Promise<StatisticalBoundResponse> {
    let payload: any;
    if (typeof reqOrMethod === 'object') {
      payload = reqOrMethod;
    } else {
      payload = {
        method: reqOrMethod,
        sample_size: sampleSize,
        delta: delta !== undefined ? delta : null,
        observed_rate: observedRate !== undefined ? observedRate : null,
        population_size: populationSize !== undefined ? populationSize : null,
        parameters,
        simulation_id: simulationId || null,
      };
    }
    const res = await axios.post<StatisticalBoundResponse>(
      `${API_BASE_URL}/simulation/bounds`,
      payload
    );
    return res.data;
  },
};
