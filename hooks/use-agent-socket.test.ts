import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAgentSocket } from "./use-agent-socket";

// WebSocket 모킹
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  readyState: number = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(_data: string) {}
  close() {
    this.readyState = 3; // CLOSED
    this.onclose?.();
  }

  // 테스트 헬퍼
  simulateOpen() {
    this.readyState = 1; // OPEN
    this.onopen?.();
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateClose() {
    this.readyState = 3;
    this.onclose?.();
  }
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal("WebSocket", MockWebSocket);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useAgentSocket", () => {
  it("초기 상태: disconnected, agents 빈 맵", () => {
    const { result } = renderHook(() => useAgentSocket());
    expect(result.current.status).toBe("disconnected");
    expect(result.current.agents.size).toBe(0);
  });

  it("서버 연결 성공: status=connected", () => {
    const { result } = renderHook(() => useAgentSocket());

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
    });

    expect(result.current.status).toBe("connected");
  });

  it("agents 메시지 수신: Map에 에이전트 저장", () => {
    const { result } = renderHook(() => useAgentSocket());

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
      MockWebSocket.instances[0].simulateMessage({
        type: "agents",
        data: [
          { id: "agent-1", status: "idle" },
          { id: "agent-2", status: "working" },
        ],
      });
    });

    expect(result.current.agents.size).toBe(2);
    expect(result.current.agents.get("agent-1")?.status).toBe("idle");
  });

  it("agent-update 수신: 특정 에이전트 상태 업데이트", () => {
    const { result } = renderHook(() => useAgentSocket());

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
      MockWebSocket.instances[0].simulateMessage({
        type: "agents",
        data: [{ id: "agent-1", status: "idle" }],
      });
      MockWebSocket.instances[0].simulateMessage({
        type: "agent-update",
        data: { id: "agent-1", status: "working" },
      });
    });

    expect(result.current.agents.get("agent-1")?.status).toBe("working");
  });

  it("status=done인 에이전트는 Map에서 제거", () => {
    const { result } = renderHook(() => useAgentSocket());

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
      MockWebSocket.instances[0].simulateMessage({
        type: "agents",
        data: [{ id: "agent-1", status: "idle" }],
      });
      MockWebSocket.instances[0].simulateMessage({
        type: "agent-update",
        data: { id: "agent-1", status: "done" },
      });
    });

    expect(result.current.agents.has("agent-1")).toBe(false);
  });

  it("연결 끊김: status=reconnecting, 3초 뒤 재연결 시도", () => {
    const { result } = renderHook(() => useAgentSocket());

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
      MockWebSocket.instances[0].simulateClose();
    });

    expect(result.current.status).toBe("reconnecting");
    expect(result.current.agents.size).toBe(0);

    // 3초 경과 → 새 WebSocket 생성
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it("재연결 성공: status=connected로 전환", () => {
    const { result } = renderHook(() => useAgentSocket());

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
      MockWebSocket.instances[0].simulateClose();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    act(() => {
      MockWebSocket.instances[1].simulateOpen();
    });

    expect(result.current.status).toBe("connected");
  });

  it("언마운트: WebSocket 닫히고 재연결 타이머 정리", () => {
    const { result, unmount } = renderHook(() => useAgentSocket());

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
    });

    unmount();

    // 재연결 타이머 없음 — 타이머 경과해도 새 인스턴스 생성 안 됨
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(MockWebSocket.instances).toHaveLength(1);
  });
});
