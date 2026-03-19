/**
 * 캐릭터 애니메이션 상태 관리
 * pixel-agents webview-ui/src/office/engine/characters.ts 간소화 포팅
 */
import type { AgentStatus } from "@/hooks/use-agent-socket";

/** 스프라이트 시트 상수 (char_N.png 기준) */
export const FRAME_W = 16;
export const FRAME_H = 32;
export const FRAMES_PER_ROW = 7;
export const SPRITE_SCALE = 2;
export const CHAR_SPACING = 64;

/** 방향 행 (스프라이트 시트 기준) */
export const DIR = { DOWN: 0, UP: 1, RIGHT: 2 } as const;

/** 애니메이션 구간: [시작프레임, 프레임수] */
const ANIM: Record<AgentStatus, [number, number]> = {
  working: [0, 4], // 타이핑 애니메이션
  thinking: [4, 2], // 대기 모션
  idle: [0, 1], // 정지
  done: [0, 1],
};

export interface CharState {
  /** agents Map에서의 순서 인덱스 */
  index: number;
  palette: number;
  animFrame: number;
  animTimer: number;
  dirRow: number;
}

const ANIM_FPS = 5; // 초당 프레임
const ANIM_INTERVAL = 1 / ANIM_FPS;

export function createCharState(index: number): CharState {
  return {
    index,
    palette: index % 6,
    animFrame: 0,
    animTimer: 0,
    dirRow: DIR.DOWN,
  };
}

export function updateChar(
  state: CharState,
  dt: number,
  agentStatus: AgentStatus,
): CharState {
  const [start, count] = ANIM[agentStatus] ?? ANIM.idle;
  let { animTimer, animFrame } = state;

  animTimer += dt;
  if (animTimer >= ANIM_INTERVAL) {
    animTimer -= ANIM_INTERVAL;
    animFrame = start + ((animFrame - start + 1) % count);
  }

  return { ...state, animTimer, animFrame };
}

/** 에이전트의 캔버스 좌표 계산 (그리드 배치) */
export function agentPosition(
  index: number,
  cols = 4,
): { x: number; y: number } {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: 24 + col * CHAR_SPACING,
    y: 24 + row * CHAR_SPACING,
  };
}
