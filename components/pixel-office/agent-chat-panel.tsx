"use client";

import type { ConversationMessage } from "@/hooks/use-agent-socket";

interface Props {
  agentId: string;
  messages: ConversationMessage[];
  onClose: () => void;
}

export default function AgentChatPanel({ agentId, messages, onClose }: Props) {
  return (
    <aside
      className="flex flex-col w-80 border-l border-border bg-card"
      style={{ height: "100%" }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium truncate">{agentId}</span>
        <button
          type="button"
          aria-label="닫기"
          className="text-muted-foreground hover:text-foreground text-lg leading-none"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center mt-4">
            대화 내역이 없습니다
          </p>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded px-2 py-1 text-xs whitespace-pre-wrap break-words ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
