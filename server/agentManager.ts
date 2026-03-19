/**
 * 에이전트 상태 관리 + WebSocket broadcast
 */
import fs from "fs";
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
  project: string;
}

export class AgentManager {
  private agents = new Map<string, ServerAgentState>();
  private projectMap = new Map<string, string>();
  private filePathMap = new Map<string, string>();
  private wss: WebSocketServer;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
  }

  /** 에이전트 추가 또는 기존 에이전트 반환 */
  getOrCreate(id: string, project = "", filePath?: string): ServerAgentState {
    if (!this.agents.has(id)) {
      this.projectMap.set(id, project);
      if (filePath) this.filePathMap.set(id, filePath);
      const agent = createAgentState(id);
      this.agents.set(id, agent);
      this.broadcast({ type: "agents", data: this.getAgentList() });
    } else if (filePath) {
      this.filePathMap.set(id, filePath);
    }
    return this.agents.get(id)!;
  }

  /** JSONL 한 줄 처리 */
  processLine(id: string, line: string): void {
    const agent = this.getOrCreate(id);
    processLine(agent, line, (agentId, status) => {
      this.broadcast({
        type: "agent-update",
        data: { id: agentId, status, project: this.projectMap.get(agentId) ?? "" },
      });
    });
  }

  /** 대화 내역 읽어 ws로 전송 */
  sendConversationHistory(ws: WebSocket, agentId: string): void {
    const filePath = this.filePathMap.get(agentId);
    if (!filePath) {
      ws.send(JSON.stringify({ type: "conversation-history", agentId, messages: [] }));
      return;
    }

    let text: string;
    try {
      text = fs.readFileSync(filePath, "utf-8");
    } catch {
      ws.send(JSON.stringify({ type: "conversation-history", agentId, messages: [] }));
      return;
    }

    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      let record: Record<string, unknown>;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }

      if (record.type === "assistant") {
        const content = (record.message as Record<string, unknown>)?.content;
        if (!Array.isArray(content)) continue;
        const textBlocks = (content as Array<{ type: string; text?: string }>)
          .filter((b) => b.type === "text" && b.text)
          .map((b) => b.text!)
          .join("");
        if (textBlocks) messages.push({ role: "assistant", content: textBlocks });
      } else if (record.type === "user") {
        const content = (record.message as Record<string, unknown>)?.content;
        if (!Array.isArray(content)) continue;
        const blocks = content as Array<{ type: string; text?: string }>;
        const hasToolResult = blocks.some((b) => b.type === "tool_result");
        if (hasToolResult) continue;
        const textBlocks = blocks
          .filter((b) => b.type === "text" && b.text)
          .map((b) => b.text!)
          .join("");
        if (textBlocks) messages.push({ role: "user", content: textBlocks });
      }
    }

    ws.send(JSON.stringify({ type: "conversation-history", agentId, messages }));
  }

  /** 에이전트 제거 (세션 종료) */
  remove(id: string): void {
    const agent = this.agents.get(id);
    if (!agent) return;
    if (agent.idleTimer !== null) {
      clearTimeout(agent.idleTimer);
    }
    this.agents.delete(id);
    this.projectMap.delete(id);
    this.filePathMap.delete(id);
    this.broadcast({
      type: "agent-update",
      data: { id, status: "done" as AgentStatus, project: "" },
    });
  }

  /** 현재 에이전트 목록 반환 */
  getAgentList(): Agent[] {
    return [...this.agents.values()].map((a) => ({
      id: a.id,
      status: a.status,
      project: this.projectMap.get(a.id) ?? "",
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
