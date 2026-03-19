"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAgentSocket, type Agent } from "@/hooks/use-agent-socket";
import LayoutEditor from "@/components/pixel-office/layout-editor";
import ProjectSidebar from "@/components/pixel-office/project-sidebar";

// Canvas는 브라우저 전용 API → SSR 비활성 (bundle-dynamic-imports 규칙)
const OfficeCanvas = dynamic(
  () => import("@/components/pixel-office/office-canvas"),
  { ssr: false },
);

export default function PixelOfficePage() {
  const { status, agents } = useAgentSocket();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const filteredAgents = useMemo(() => {
    if (selectedProject === null) return agents;
    const filtered = new Map<string, Agent>();
    for (const [id, agent] of agents) {
      if (agent.project === selectedProject) filtered.set(id, agent);
    }
    return filtered;
  }, [agents, selectedProject]);

  const isConnected = status === "connected";

  return (
    <main className="flex flex-col h-screen bg-background">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <h1 className="text-sm font-semibold">Pixel Office</h1>

        <div className="flex items-center gap-3">
          {/* 연결 상태 배지 */}
          <Badge
            variant={isConnected ? "default" : "secondary"}
            className="flex items-center gap-1.5"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? "bg-green-400" : "bg-slate-400"
              }`}
            />
            {isConnected ? "연결됨" : "서버 연결 끊김"}
          </Badge>

          {/* 레이아웃 편집 버튼 */}
          {!isEditMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(true)}
            >
              레이아웃 편집
            </Button>
          )}
        </div>
      </header>

      {/* 레이아웃 에디터 (편집 모드) */}
      {isEditMode && (
        <div className="px-4 py-3 border-b border-border bg-card">
          <LayoutEditor onClose={() => setIsEditMode(false)} />
        </div>
      )}

      {/* 사이드바 + 오피스 캔버스 */}
      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar
          agents={agents}
          selectedProject={selectedProject}
          onSelect={setSelectedProject}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <OfficeCanvas agents={filteredAgents} status={status} />
        </div>
      </div>
    </main>
  );
}
