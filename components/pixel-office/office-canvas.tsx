"use client";

import { Loader } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import type { Agent, ConnectionStatus } from "@/hooks/use-agent-socket";
import { CHAR_SPACING, FRAME_H, FRAME_W, SPRITE_SCALE } from "./engine/characters";
import { startGameLoop } from "./engine/game-loop";
import { OfficeState } from "./engine/office-state";
import { renderFrame } from "./engine/renderer";

const CHAR_COUNT = 6;
const CANVAS_COLS = 4;
const CANVAS_PAD = 24;
const INFO_BAR_H = 24;

interface Props {
  agents: Map<string, Agent>;
  status: ConnectionStatus;
}

export default function OfficeCanvas({ agents, status }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<HTMLImageElement[]>([]);
  const officeStateRef = useRef<OfficeState>(new OfficeState());
  // agentsRef로 게임 루프가 최신 에이전트 데이터를 참조
  // rerender-use-ref-transient-values 규칙: 게임 루프 안에서만 읽는 값은 ref로 관리
  const agentsRef = useRef(agents);

  useEffect(() => {
    agentsRef.current = agents;
    officeStateRef.current.syncAgents(agents);
  }, [agents]);

  // 스프라이트 이미지 로드 (마운트 시 1회)
  useEffect(() => {
    const imgs: HTMLImageElement[] = [];
    for (let i = 0; i < CHAR_COUNT; i++) {
      const img = new Image();
      img.src = `/assets/characters/char_${i}.png`;
      imgs.push(img);
    }
    spritesRef.current = imgs;
  }, []);

  // 게임 루프 (마운트 시 1회 시작)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stop = startGameLoop(canvas, {
      update: (dt) => {
        officeStateRef.current.update(dt, agentsRef.current);
      },
      render: (ctx) => {
        const activeAgents = [...agentsRef.current.values()].filter(
          (a) => a.status !== "done",
        );
        renderFrame(
          ctx,
          canvas.width,
          canvas.height,
          spritesRef.current,
          activeAgents,
          officeStateRef.current.charStates,
        );
      },
    });

    return stop;
  }, []);

  const activeAgents = useMemo(
    () => [...agents.values()].filter((a) => a.status !== "done"),
    [agents],
  );

  const workingCount = activeAgents.filter((a) => a.status === "working").length;
  const thinkingCount = activeAgents.filter((a) => a.status === "thinking").length;
  const idleCount = activeAgents.filter((a) => a.status === "idle").length;

  // 캔버스 크기 계산
  const maxCols = Math.min(activeAgents.length, CANVAS_COLS);
  const rows = Math.ceil(activeAgents.length / CANVAS_COLS) || 1;
  const canvasW = Math.max(
    320,
    CANVAS_PAD * 2 + maxCols * CHAR_SPACING + FRAME_W * SPRITE_SCALE,
  );
  const canvasH = Math.max(
    160,
    CANVAS_PAD * 2 + rows * CHAR_SPACING + FRAME_H * SPRITE_SCALE,
  );

  return (
    <div className="relative flex flex-col" style={{ background: "#1e1e2e" }}>
      {/* 픽셀 오피스 캔버스 */}
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        style={{ display: "block", imageRendering: "pixelated" }}
      />

      {/* 에이전트 카운트 정보바 */}
      <div
        className="px-3 flex items-center text-xs text-slate-400"
        style={{ height: INFO_BAR_H, background: "#1a1a2e" }}
      >
        에이전트 {activeAgents.length}명 활성 | working {workingCount} thinking{" "}
        {thinkingCount} idle {idleCount}
      </div>

      {/* 재연결 중 오버레이 */}
      {status === "reconnecting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex items-center gap-2 text-white text-sm">
            <Loader className="animate-spin" size={16} />
            <span>재연결 시도 중...</span>
          </div>
        </div>
      )}

      {/* 테스트/접근성용 에이전트 상태 요소 (시각적으로 숨김) */}
      <div aria-hidden="true" className="hidden">
        {activeAgents.map((agent) => (
          <div
            key={agent.id}
            data-agent-id={agent.id}
            data-state={agent.status}
          />
        ))}
      </div>
    </div>
  );
}
