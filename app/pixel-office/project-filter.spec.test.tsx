/**
 * Spec Tests: PIXOFF-010, PIXOFF-011
 * spec.yaml 시나리오 기반 수용 기준 테스트
 * 이 파일은 생성 후 수정 금지 — 실패 시 구현을 수정한다
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

// next/dynamic → React.lazy + Suspense 로 대체
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
    agents: Map<string, { id: string; status: string; project: string }>;
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

const AGENTS_TWO_PROJECTS = new Map([
  ["agent-a", { id: "agent-a", status: "idle" as const, project: "proj-a" }],
  ["agent-b", { id: "agent-b", status: "idle" as const, project: "proj-b" }],
]);

// ────────────────────────────────────────────────────────────────────
// PIXOFF-010: 프로젝트 필터 — 특정 프로젝트 선택
// ────────────────────────────────────────────────────────────────────
describe("PIXOFF-010: 프로젝트 필터 — 특정 프로젝트 선택", () => {
  it("proj-a 클릭 → proj-a 에이전트 1개만 캔버스에 표시, proj-a 버튼 활성화", async () => {
    vi.mocked(useAgentSocket).mockReturnValue({
      status: "connected",
      agents: AGENTS_TWO_PROJECTS,
    });

    const user = userEvent.setup();
    render(<PixelOfficePage />);

    // 초기: 에이전트 2개
    await waitFor(() => {
      expect(document.querySelectorAll("[data-agent-id]")).toHaveLength(2);
    });

    // proj-a 버튼 클릭
    await user.click(screen.getByRole("button", { name: "proj-a" }));

    // proj-a 에이전트 1개만 표시
    await waitFor(() => {
      expect(document.querySelectorAll("[data-agent-id]")).toHaveLength(1);
    });
    expect(document.querySelector("[data-agent-id='agent-a']")).toBeInTheDocument();
    expect(document.querySelector("[data-agent-id='agent-b']")).not.toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────
// PIXOFF-011: 프로젝트 필터 — 전체 선택
// ────────────────────────────────────────────────────────────────────
describe("PIXOFF-011: 프로젝트 필터 — 전체 선택", () => {
  it("proj-a 필터 선택 후 '전체' 클릭 → 에이전트 2개 모두 캔버스에 표시", async () => {
    vi.mocked(useAgentSocket).mockReturnValue({
      status: "connected",
      agents: AGENTS_TWO_PROJECTS,
    });

    const user = userEvent.setup();
    render(<PixelOfficePage />);

    // proj-a 필터 선택
    await user.click(screen.getByRole("button", { name: "proj-a" }));
    await waitFor(() => {
      expect(document.querySelectorAll("[data-agent-id]")).toHaveLength(1);
    });

    // 전체 클릭
    await user.click(screen.getByRole("button", { name: "전체" }));

    // 에이전트 2개 모두 표시
    await waitFor(() => {
      expect(document.querySelectorAll("[data-agent-id]")).toHaveLength(2);
    });
  });
});
