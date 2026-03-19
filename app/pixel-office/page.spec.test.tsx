/**
 * Spec Tests: PIXOFF-001, PIXOFF-002, PIXOFF-003
 * spec.yaml 시나리오 기반 수용 기준 테스트
 * 이 파일은 생성 후 수정 금지 — 실패 시 구현을 수정한다
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// next/dynamic → React.lazy + Suspense 로 대체 (SSR 비활성 옵션 무시)
vi.mock("next/dynamic", () => ({
  default: (
    importFn: () => Promise<{ default: React.ComponentType<any> }>,
    _options?: Record<string, unknown>,
  ) => {
    const Lazy = React.lazy(importFn);
    return function LazyWrapper(props: Record<string, unknown>) {
      return (
        <React.Suspense fallback={null}>
          <Lazy {...props} />
        </React.Suspense>
      );
    };
  },
}));

// useAgentSocket 훅 모킹
vi.mock("@/hooks/use-agent-socket", () => ({
  useAgentSocket: vi.fn(),
}));

// OfficeCanvas 모킹 — canvas API 없이 에이전트 DOM 노출
vi.mock("@/components/pixel-office/office-canvas", () => ({
  default: ({
    agents,
  }: {
    agents: Map<string, { id: string; status: string }>;
    status: string;
  }) => (
    <div data-testid="office-canvas">
      {[...agents.values()]
        .filter((a) => a.status !== "done")
        .map((a) => (
          <div key={a.id} data-agent-id={a.id} data-state={a.status} />
        ))}
    </div>
  ),
}));

import { useAgentSocket } from "@/hooks/use-agent-socket";
import PixelOfficePage from "@/app/pixel-office/page";

// ────────────────────────────────────────────────────────────────────
// PIXOFF-001: WebSocket 연결 성공 — 에이전트 캐릭터 등장
// ────────────────────────────────────────────────────────────────────
describe("PIXOFF-001: WebSocket 연결 성공 — 에이전트 캐릭터 등장", () => {
  it("agentCount=1: 상태 배지 '연결됨', 캐릭터 1개", async () => {
    vi.mocked(useAgentSocket).mockReturnValue({
      status: "connected",
      agents: new Map([["agent-1", { id: "agent-1", status: "idle" }]]),
    });

    render(<PixelOfficePage />);

    expect(screen.getByText("연결됨")).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelectorAll("[data-agent-id]")).toHaveLength(1);
    });
  });

  it("agentCount=3: 상태 배지 '연결됨', 캐릭터 3개", async () => {
    vi.mocked(useAgentSocket).mockReturnValue({
      status: "connected",
      agents: new Map([
        ["agent-1", { id: "agent-1", status: "idle" }],
        ["agent-2", { id: "agent-2", status: "idle" }],
        ["agent-3", { id: "agent-3", status: "idle" }],
      ]),
    });

    render(<PixelOfficePage />);

    expect(screen.getByText("연결됨")).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelectorAll("[data-agent-id]")).toHaveLength(3);
    });
  });
});

// ────────────────────────────────────────────────────────────────────
// PIXOFF-002: WebSocket 서버 미실행 — 상태 배지 오프라인 표시
// ────────────────────────────────────────────────────────────────────
describe("PIXOFF-002: WebSocket 서버 미실행 — 상태 배지 오프라인 표시", () => {
  beforeEach(() => {
    vi.mocked(useAgentSocket).mockReturnValue({
      status: "disconnected",
      agents: new Map(),
    });
  });

  it("캔버스 표시, 배지 '서버 연결 끊김', 캐릭터 0개", async () => {
    render(<PixelOfficePage />);

    expect(screen.getByText("서버 연결 끊김")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("office-canvas")).toBeInTheDocument();
    });
    expect(document.querySelectorAll("[data-agent-id]")).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────
// PIXOFF-003: WebSocket 재연결 — 상태 배지 업데이트
// ────────────────────────────────────────────────────────────────────
describe("PIXOFF-003: WebSocket 재연결 — 상태 배지 업데이트", () => {
  it("재연결 성공 후 배지 '연결됨', 캐릭터 1개", async () => {
    vi.mocked(useAgentSocket).mockReturnValue({
      status: "connected",
      agents: new Map([["agent-1", { id: "agent-1", status: "idle" }]]),
    });

    render(<PixelOfficePage />);

    expect(screen.getByText("연결됨")).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelectorAll("[data-agent-id]")).toHaveLength(1);
    });
  });
});
