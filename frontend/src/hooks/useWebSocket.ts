'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { LiveTelemetryMessage } from '@/types';

interface UseWebSocketOptions {
  sessionId?: string | null;
  autoConnect?: boolean;
}

export function useWebSocket(urlOverride?: string, options: UseWebSocketOptions = {}) {
  const [data, setData] = useState<LiveTelemetryMessage | null>(null);
  const [telemetryLog, setTelemetryLog] = useState<LiveTelemetryMessage[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getBaseWsUrl = useCallback(() => {
    if (urlOverride) return urlOverride;
    const envUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (envUrl) return envUrl;

    if (typeof window !== 'undefined') {
      const host = window.location.hostname || 'localhost';
      return `ws://${host}:8000/ws/stream`;
    }
    return 'ws://localhost:8000/ws/stream';
  }, [urlOverride]);

  const connect = useCallback(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      let targetUrl = getBaseWsUrl();
      if (options.sessionId) {
        const delimiter = targetUrl.includes('?') ? '&' : '?';
        targetUrl = `${targetUrl}${delimiter}session_id=${encodeURIComponent(options.sessionId)}`;
      }

      const ws = new WebSocket(targetUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
      };

      ws.onclose = () => {
        setConnected(false);
      };

      ws.onerror = (e) => {
        console.warn('WebSocket telemetry stream warning / error:', e);
        setError('WebSocket disconnected or backend offline');
        setConnected(false);
      };

      ws.onmessage = (event) => {
        try {
          const parsed: LiveTelemetryMessage = JSON.parse(event.data);
          setData(parsed);
          setTelemetryLog((prev) => {
            const next = [...prev, parsed];
            return next.length > 60 ? next.slice(-60) : next;
          });
        } catch (err) {
          console.debug('Raw non-JSON telemetry frame received:', event.data);
        }
      };
    } catch (err: any) {
      setError(err.message || 'Failed to establish WebSocket connection');
      setConnected(false);
    }
  }, [getBaseWsUrl, options.sessionId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setConnected(false);
  }, []);

  const clearLog = useCallback(() => {
    setTelemetryLog([]);
    setData(null);
  }, []);

  useEffect(() => {
    if (options.autoConnect !== false) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [connect, disconnect, options.autoConnect]);

  return {
    data,
    latestTelemetry: data,
    telemetryLog,
    connected,
    error,
    connect,
    disconnect,
    clearLog,
  };
}
