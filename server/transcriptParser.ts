/**
 * JSONL transcript → agent status 파서
 * pixel-agents src/transcriptParser.ts 에서 VS Code 의존성 제거 후 포팅
 */

export type AgentStatus = "working" | "thinking" | "idle" | "done";

export interface ServerAgentState {
  id: string;
  status: AgentStatus;
  /** 마지막 JSONL 수신 offset */
  fileOffset: number;
  lineBuffer: string;
  activeToolIds: Set<string>;
  /** 현재 턴에 tool_use가 있었는지 */
  hadToolsInTurn: boolean;
  /** idle 판정용 타이머 */
  idleTimer: ReturnType<typeof setTimeout> | null;
}

/** 에이전트가 텍스트만 응답할 때 idle 전환 대기 시간 (ms) */
const TEXT_IDLE_DELAY_MS = 15_000;

export function createAgentState(id: string): ServerAgentState {
  return {
    id,
    status: "idle",
    fileOffset: 0,
    lineBuffer: "",
    activeToolIds: new Set(),
    hadToolsInTurn: false,
    idleTimer: null,
  };
}

function cancelIdleTimer(agent: ServerAgentState): void {
  if (agent.idleTimer !== null) {
    clearTimeout(agent.idleTimer);
    agent.idleTimer = null;
  }
}

function startIdleTimer(
  agent: ServerAgentState,
  onIdle: (id: string) => void,
): void {
  cancelIdleTimer(agent);
  agent.idleTimer = setTimeout(() => {
    agent.idleTimer = null;
    agent.status = "idle";
    onIdle(agent.id);
  }, TEXT_IDLE_DELAY_MS);
}

/**
 * JSONL 한 줄을 파싱해서 에이전트 상태를 업데이트한다.
 * @param agent 수정할 에이전트 상태 (in-place)
 * @param line JSONL 한 줄
 * @param onStatusChange 상태 변경 콜백
 */
export function processLine(
  agent: ServerAgentState,
  line: string,
  onStatusChange: (id: string, status: AgentStatus) => void,
): void {
  let record: Record<string, unknown>;
  try {
    record = JSON.parse(line);
  } catch {
    return;
  }

  const setStatus = (s: AgentStatus) => {
    if (agent.status !== s) {
      agent.status = s;
      onStatusChange(agent.id, s);
    }
  };

  if (record.type === "assistant") {
    const content = (record.message as Record<string, unknown>)?.content;
    if (!Array.isArray(content)) return;

    const blocks = content as Array<{ type: string; id?: string }>;
    const hasToolUse = blocks.some((b) => b.type === "tool_use");

    if (hasToolUse) {
      cancelIdleTimer(agent);
      agent.hadToolsInTurn = true;
      for (const block of blocks) {
        if (block.type === "tool_use" && block.id) {
          agent.activeToolIds.add(block.id);
        }
      }
      setStatus("working");
    } else if (blocks.some((b) => b.type === "text") && !agent.hadToolsInTurn) {
      // 텍스트만 있는 응답 → thinking, 이후 일정 시간 뒤 idle로 전환
      setStatus("thinking");
      startIdleTimer(agent, (id) => onStatusChange(id, "idle"));
    }
  } else if (record.type === "user") {
    const content = (record.message as Record<string, unknown>)?.content;
    if (!Array.isArray(content)) return;

    const blocks = content as Array<{ type: string; tool_use_id?: string }>;
    const hasToolResult = blocks.some((b) => b.type === "tool_result");

    if (hasToolResult) {
      for (const block of blocks) {
        if (block.type === "tool_result" && block.tool_use_id) {
          agent.activeToolIds.delete(block.tool_use_id);
        }
      }
      if (agent.activeToolIds.size === 0) {
        agent.hadToolsInTurn = false;
      }
    } else {
      // 새 사용자 메시지 = 새 턴 시작
      cancelIdleTimer(agent);
      agent.hadToolsInTurn = false;
    }
  } else if (record.type === "system") {
    const subtype = record.subtype as string | undefined;
    if (subtype === "turn_duration") {
      cancelIdleTimer(agent);
      agent.activeToolIds.clear();
      agent.hadToolsInTurn = false;
      setStatus("idle");
    }
  }
}
