/**
 * 캔버스 렌더러
 * pixel-agents webview-ui/src/office/engine/renderer.ts 간소화 포팅
 */
import type { AgentStatus } from "@/hooks/use-agent-socket";
import type { CharState } from "./characters";
import {
  DIR,
  FRAME_H,
  FRAME_W,
  SPRITE_SCALE,
  agentPosition,
} from "./characters";

const BG_COLOR = "#1e1e2e";

/** 에이전트 상태별 이름표 색상 */
const STATUS_COLOR: Record<AgentStatus, string> = {
  working: "#4ade80",
  thinking: "#facc15",
  idle: "#94a3b8",
  done: "#475569",
};

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sprites: HTMLImageElement[],
  agents: Array<{ id: string; status: AgentStatus }>,
  charStates: Map<string, CharState>,
): void {
  // 배경
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  agents.forEach((agent, idx) => {
    if (agent.status === "done") return;

    const state = charStates.get(agent.id);
    if (!state) return;

    const sprite = sprites[state.palette];
    if (!sprite || !sprite.complete || sprite.naturalWidth === 0) return;

    const { x, y } = agentPosition(idx);
    const srcX = state.animFrame * FRAME_W;
    const srcY = state.dirRow * FRAME_H;

    ctx.drawImage(
      sprite,
      srcX,
      srcY,
      FRAME_W,
      FRAME_H,
      x,
      y,
      FRAME_W * SPRITE_SCALE,
      FRAME_H * SPRITE_SCALE,
    );

    // 이름표
    const color = STATUS_COLOR[agent.status];
    ctx.fillStyle = color;
    ctx.font = "8px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      agent.id,
      x + (FRAME_W * SPRITE_SCALE) / 2,
      y + FRAME_H * SPRITE_SCALE + 10,
    );
    ctx.textAlign = "start";
  });
}
