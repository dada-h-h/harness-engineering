"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AgentStatus = "working" | "thinking" | "idle" | "done";

export interface Agent {
  id: string;
  status: AgentStatus;
}

export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

const WS_URL = "ws://localhost:3001";
const RECONNECT_DELAY_MS = 3_000;

export function useAgentSocket(): {
  status: ConnectionStatus;
  agents: Map<string, Agent>;
} {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [agents, setAgents] = useState<Map<string, Agent>>(new Map());

  // refs — 재연결 루프 안에서 최신값 참조, 불필요한 effect 재실행 방지
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      clearReconnectTimer();
      setStatus("connected");
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      let msg: { type: string; data: unknown };
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      if (msg.type === "agents") {
        const list = msg.data as Agent[];
        setAgents(
          new Map(list.filter((a) => a.status !== "done").map((a) => [a.id, a])),
        );
      } else if (msg.type === "agent-update") {
        const update = msg.data as { id: string; status: AgentStatus };
        setAgents((prev) => {
          const next = new Map(prev);
          if (update.status === "done") {
            next.delete(update.id);
          } else {
            next.set(update.id, { id: update.id, status: update.status });
          }
          return next;
        });
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      wsRef.current = null;
      setStatus("reconnecting");
      setAgents(new Map());

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        if (mountedRef.current) {
          connect();
        }
      }, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => {
      // onerror는 항상 onclose보다 먼저 발생하므로 여기서는 상태 처리 생략
      // onclose에서 disconnected/reconnecting 처리
    };
  }, [clearReconnectTimer]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      if (wsRef.current) {
        // onclose가 다시 connect()를 호출하지 않도록 핸들러를 제거
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus("disconnected");
    };
  }, [connect, clearReconnectTimer]);

  return { status, agents };
}
