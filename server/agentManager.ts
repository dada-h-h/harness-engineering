/**
 * 에이전트 상태 관리 + WebSocket broadcast
 */
import type { WebSocket, WebSocketServer } from "ws";
import {
  type AgentStatus,
  type ServerAgentState,
  createAgentState,
  processLine,
} from "./transcriptParser.js";

export interface Agent {
  id: string;
  status: AgentStatus;
}

export class AgentManager {
  private agents = new Map<string, ServerAgentState>();
  private wss: WebSocketServer;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
  }

  /** 에이전트 추가 또는 기존 에이전트 반환 */
  getOrCreate(id: string): ServerAgentState {
    if (!this.agents.has(id)) {
      const agent = createAgentState(id);
      this.agents.set(id, agent);
      this.broadcast({ type: "agents", data: this.getAgentList() });
    }
    return this.agents.get(id)!;
  }

  /** JSONL 한 줄 처리 */
  processLine(id: string, line: string): void {
    const agent = this.getOrCreate(id);
    processLine(agent, line, (agentId, status) => {
      this.broadcast({
        type: "agent-update",
        data: { id: agentId, status },
      });
    });
  }

  /** 에이전트 제거 (세션 종료) */
  remove(id: string): void {
    const agent = this.agents.get(id);
    if (!agent) return;
    if (agent.idleTimer !== null) {
      clearTimeout(agent.idleTimer);
    }
    this.agents.delete(id);
    this.broadcast({
      type: "agent-update",
      data: { id, status: "done" as AgentStatus },
    });
  }

  /** 현재 에이전트 목록 반환 */
  getAgentList(): Agent[] {
    return [...this.agents.values()].map((a) => ({
      id: a.id,
      status: a.status,
    }));
  }

  /** 신규 연결에 현재 상태 전송 */
  sendCurrentState(ws: WebSocket): void {
    ws.send(
      JSON.stringify({ type: "agents", data: this.getAgentList() }),
    );
  }

  /** 모든 연결된 클라이언트에 메시지 브로드캐스트 */
  broadcast(msg: unknown): void {
    const payload = JSON.stringify(msg);
    for (const client of this.wss.clients) {
      if (client.readyState === 1 /* OPEN */) {
        client.send(payload);
      }
    }
  }
}
