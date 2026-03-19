/**
 * Spec Tests: PIXOFF-004, PIXOFF-005, PIXOFF-006, PIXOFF-007
 * spec.yaml 시나리오 기반 수용 기준 테스트
 * 이 파일은 생성 후 수정 금지 — 실패 시 구현을 수정한다
 */
import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Canvas API 모킹 (jsdom은 canvas를 지원하지 않음)
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    drawImageData: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray() }),
    getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray() }),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 0 }),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
});

import OfficeCanvas from "@/components/pixel-office/office-canvas";

type Agent = {
  id: string;
  status: "working" | "thinking" | "idle" | "done";
};

// ────────────────────────────────────────────────────────────────────
// PIXOFF-004: 에이전트 상태 변화 — working 애니메이션 전환
// ────────────────────────────────────────────────────────────────────
describe("PIXOFF-004: 에이전트 상태 변화 — working 애니메이션 전환", () => {
  it("agent-1 status='working' → data-state='working' 속성 설정", () => {
    const agents = new Map<string, Agent>([
      ["agent-1", { id: "agent-1", status: "working" }],
    ]);

    render(<OfficeCanvas agents={agents} status="connected" />);

    expect(document.querySelector('[data-agent-id="agent-1"]')).toHaveAttribute(
      "data-state",
      "working",
    );
  });
});

// ────────────────────────────────────────────────────────────────────
// PIXOFF-005: 에이전트 상태 변화 — thinking 애니메이션 전환
// ────────────────────────────────────────────────────────────────────
describe("PIXOFF-005: 에이전트 상태 변화 — thinking 애니메이션 전환", () => {
  it("agent-1 status='thinking' → data-state='thinking' 속성 설정", () => {
    const agents = new Map<string, Agent>([
      ["agent-1", { id: "agent-1", status: "thinking" }],
    ]);

    render(<OfficeCanvas agents={agents} status="connected" />);

    expect(document.querySelector('[data-agent-id="agent-1"]')).toHaveAttribute(
      "data-state",
      "thinking",
    );
  });
});

// ────────────────────────────────────────────────────────────────────
// PIXOFF-006: 에이전트 상태 변화 — idle 애니메이션 전환
// ────────────────────────────────────────────────────────────────────
describe("PIXOFF-006: 에이전트 상태 변화 — idle 애니메이션 전환", () => {
  it("agent-1 status='idle' → data-state='idle' 속성 설정", () => {
    const agents = new Map<string, Agent>([
      ["agent-1", { id: "agent-1", status: "idle" }],
    ]);

    render(<OfficeCanvas agents={agents} status="connected" />);

    expect(document.querySelector('[data-agent-id="agent-1"]')).toHaveAttribute(
      "data-state",
      "idle",
    );
  });
});

// ────────────────────────────────────────────────────────────────────
// PIXOFF-007: 에이전트 상태 변화 — done 페이드 아웃
// ────────────────────────────────────────────────────────────────────
describe("PIXOFF-007: 에이전트 상태 변화 — done 페이드 아웃", () => {
  it("agent-1 status='done' → 캐릭터가 DOM에서 제거됨", () => {
    const agents = new Map<string, Agent>([
      ["agent-1", { id: "agent-1", status: "done" }],
    ]);

    render(<OfficeCanvas agents={agents} status="connected" />);

    expect(document.querySelector('[data-agent-id="agent-1"]')).not.toBeInTheDocument();
    expect(document.querySelectorAll("[data-agent-id]")).toHaveLength(0);
  });
});
