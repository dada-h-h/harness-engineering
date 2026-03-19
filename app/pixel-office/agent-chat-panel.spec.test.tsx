/**
 * PIXOFF-012 / PIXOFF-013 / PIXOFF-014 수용 기준 테스트
 * spec.yaml에서 파생 — 생성 후 수정 금지
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AgentChatPanel from "@/components/pixel-office/agent-chat-panel";
import type { ConversationMessage } from "@/hooks/use-agent-socket";

// PIXOFF-012: 에이전트 캐릭터 클릭 → 채팅 패널 표시
describe("PIXOFF-012: 에이전트 캐릭터 클릭 — 채팅 패널 표시", () => {
  it("패널이 렌더링되고 헤더에 에이전트 ID가 표시된다", () => {
    render(
      <AgentChatPanel
        agentId="agent-1"
        messages={[]}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("complementary")).toBeInTheDocument();
    expect(screen.getByText("agent-1")).toBeInTheDocument();
  });
});

// PIXOFF-013: 채팅 패널 — user/assistant 대화 내용 렌더링
describe("PIXOFF-013: 채팅 패널 — user/assistant 대화 내용 렌더링", () => {
  it("user 메시지와 assistant 메시지가 패널에 렌더링된다", () => {
    const messages: ConversationMessage[] = [
      { role: "user", content: "안녕" },
      { role: "assistant", content: "반갑습니다" },
    ];

    render(
      <AgentChatPanel
        agentId="agent-1"
        messages={messages}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("안녕")).toBeInTheDocument();
    expect(screen.getByText("반갑습니다")).toBeInTheDocument();
  });

  it("메시지가 없을 때 빈 상태 메시지를 표시한다", () => {
    render(
      <AgentChatPanel
        agentId="agent-1"
        messages={[]}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("대화 내역이 없습니다")).toBeInTheDocument();
  });
});

// PIXOFF-014: 채팅 패널 닫기 버튼 클릭 → 패널 사라짐
describe("PIXOFF-014: 채팅 패널 닫기 버튼 클릭 — 패널 사라짐", () => {
  it("닫기 버튼 클릭 시 onClose 콜백이 호출된다", () => {
    const onClose = vi.fn();
    render(
      <AgentChatPanel
        agentId="agent-1"
        messages={[]}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /닫기/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
