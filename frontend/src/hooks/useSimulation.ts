'use client';

import { useState, useCallback } from 'react';
import { qdsApi } from '@/services/api';
import {
  KeygenResponse,
  SignResponse,
  VerifyResponse,
  AttackInjectResponse,
  SymmetrizeResponse,
  MetricsResponse,
  AttackType,
} from '@/types';

export function useSimulation() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'keygen' | 'sign' | 'attack' | 'symmetrize' | 'verify'>('idle');

  const [keygenData, setKeygenData] = useState<KeygenResponse | null>(null);
  const [signData, setSignData] = useState<SignResponse | null>(null);
  const [verifyData, setVerifyData] = useState<VerifyResponse | null>(null);
  const [attackData, setAttackData] = useState<AttackInjectResponse | null>(null);
  const [symmetrizeData, setSymmetrizeData] = useState<SymmetrizeResponse | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsResponse | null>(null);

  // 1. Run Key Generation
  const runKeygen = useCallback(async (numBits: number = 16) => {
    setLoading(true);
    setError(null);
    setStep('keygen');
    try {
      const res = await qdsApi.keygen({ num_bits: numBits });
      setSessionId(res.session_id);
      setKeygenData(res);
      // Reset subsequent steps
      setSignData(null);
      setVerifyData(null);
      setAttackData(null);
      setSymmetrizeData(null);
      return res;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Keygen failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Run Signature Preparation
  const runSign = useCallback(
    async (message: string = 'QDS-TRANSACTION-001', digest?: string) => {
      if (!sessionId) {
        throw new Error('Active session required. Run keygen first.');
      }
      setLoading(true);
      setError(null);
      setStep('sign');
      try {
        const res = await qdsApi.sign({
          session_id: sessionId,
          message,
          message_digest: digest,
        });
        setSignData(res);
        return res;
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err.message || 'Signing failed';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  // 3. Run Verification & Hoeffding Threat Evaluation
  const runVerify = useCallback(
    async (verifierId: 'bob' | 'charlie' | 'both' = 'bob', applyPostselection: boolean = true) => {
      if (!sessionId) {
        throw new Error('Active session required. Run keygen and sign first.');
      }
      setLoading(true);
      setError(null);
      setStep('verify');
      try {
        const res = await qdsApi.verify({
          session_id: sessionId,
          verifier_id: verifierId,
          apply_postselection: applyPostselection,
        });
        setVerifyData(res);
        return res;
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err.message || 'Verification failed';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  // 4. Inject Attack Vector
  const runAttack = useCallback(
    async (
      attackType: AttackType | string,
      intensity: number = 0.45,
      options: {
        spoofed_public_key?: string;
        replay_age_seconds?: number;
        asymmetry_rate?: number;
        path_bias_intensity?: number;
        target_verifier?: 'bob' | 'charlie';
      } = {}
    ) => {
      if (!sessionId) {
        throw new Error('Active session required. Run keygen and sign first.');
      }
      setLoading(true);
      setError(null);
      setStep('attack');
      try {
        const res = await qdsApi.injectAttack({
          session_id: sessionId,
          attack_type: attackType,
          intensity,
          ...options,
        });
        setAttackData(res);
        return res;
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err.message || 'Attack injection failed';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  // 5. Run Symmetrization Guard (Module G)
  const runSymmetrize = useCallback(
    async (swapRatio: number = 0.5) => {
      if (!sessionId) {
        throw new Error('Active session required.');
      }
      setLoading(true);
      setError(null);
      setStep('symmetrize');
      try {
        const res = await qdsApi.symmetrize({
          session_id: sessionId,
          swap_ratio: swapRatio,
        });
        setSymmetrizeData(res);
        return res;
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err.message || 'Symmetrization failed';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  // 6. Full Clean Lifecycle (Keygen -> Sign -> Verify)
  const runFullLifecycle = useCallback(
    async (numBits: number = 16, verifierId: 'bob' | 'charlie' | 'both' = 'bob') => {
      setLoading(true);
      setError(null);
      try {
        // Step 1: Keygen
        setStep('keygen');
        const kRes = await qdsApi.keygen({ num_bits: numBits });
        setSessionId(kRes.session_id);
        setKeygenData(kRes);
        setAttackData(null);
        setSymmetrizeData(null);

        // Step 2: Sign
        setStep('sign');
        const sRes = await qdsApi.sign({ session_id: kRes.session_id });
        setSignData(sRes);

        // Step 3: Verify
        setStep('verify');
        const vRes = await qdsApi.verify({
          session_id: kRes.session_id,
          verifier_id: verifierId,
        });
        setVerifyData(vRes);

        return { keygen: kRes, sign: sRes, verify: vRes };
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err.message || 'Lifecycle execution failed';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 7. Fetch Metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await qdsApi.getMetrics();
      setMetricsData(res);
      return res;
    } catch (err: any) {
      console.warn('Could not fetch metrics:', err.message);
      return null;
    }
  }, []);

  // 8. Reset state
  const reset = useCallback(() => {
    setSessionId(null);
    setKeygenData(null);
    setSignData(null);
    setVerifyData(null);
    setAttackData(null);
    setSymmetrizeData(null);
    setError(null);
    setStep('idle');
  }, []);

  return {
    sessionId,
    step,
    loading,
    error,
    keygenData,
    signData,
    verifyData,
    attackData,
    symmetrizeData,
    metricsData,
    runKeygen,
    runSign,
    runVerify,
    runAttack,
    runSymmetrize,
    runFullLifecycle,
    fetchMetrics,
    reset,
  };
}
