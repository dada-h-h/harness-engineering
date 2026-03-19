/**
 * 오피스 상태 관리
 * pixel-agents webview-ui/src/office/engine/officeState.ts 간소화 포팅
 */
import type { AgentStatus } from "@/hooks/use-agent-socket";
import type { CharState } from "./characters";
import { createCharState, updateChar } from "./characters";

export class OfficeState {
  charStates = new Map<string, CharState>();
  private indexMap = new Map<string, number>();
  private nextIndex = 0;

  /** 에이전트 맵이 변경될 때 호출해서 상태를 동기화 */
  syncAgents(agents: Map<string, { id: string; status: AgentStatus }>): void {
    // 새 에이전트 추가
    for (const [id] of agents) {
      if (!this.charStates.has(id)) {
        const index = this.nextIndex++;
        this.indexMap.set(id, index);
        this.charStates.set(id, createCharState(index));
      }
    }

    // 제거된 에이전트 정리
    for (const id of this.charStates.keys()) {
      if (!agents.has(id)) {
        this.charStates.delete(id);
        this.indexMap.delete(id);
      }
    }
  }

  /** 게임 루프 업데이트 */
  update(
    dt: number,
    agents: Map<string, { id: string; status: AgentStatus }>,
  ): void {
    for (const [id, state] of this.charStates) {
      const agent = agents.get(id);
      if (!agent) continue;
      this.charStates.set(id, updateChar(state, dt, agent.status));
    }
  }
}
