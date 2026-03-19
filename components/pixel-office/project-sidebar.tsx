"use client";
import type { Agent } from "@/hooks/use-agent-socket";
import { Button } from "@/components/ui/button";
import { formatProjectLabel } from "@/lib/project-utils";
import { useMemo } from "react";

interface Props {
  agents: Map<string, Agent>;
  selectedProject: string | null;
  onSelect: (project: string | null) => void;
}

export default function ProjectSidebar({ agents, selectedProject, onSelect }: Props) {
  const projects = useMemo(() => {
    const set = new Set<string>();
    for (const agent of agents.values()) {
      if (agent.project) set.add(agent.project);
    }
    return [...set].sort();
  }, [agents]);

  return (
    <aside className="w-48 border-r border-border bg-card flex flex-col overflow-y-auto shrink-0">
      <div className="px-3 py-2 text-xs font-medium text-muted-foreground">프로젝트</div>
      <Button
        variant={selectedProject === null ? "secondary" : "ghost"}
        size="sm"
        className="justify-start mx-2 mb-1"
        onClick={() => onSelect(null)}
      >
        전체
      </Button>
      {projects.map((project) => (
        <Button
          key={project}
          variant={selectedProject === project ? "secondary" : "ghost"}
          size="sm"
          className="justify-start mx-2 mb-1 truncate"
          title={project}
          onClick={() => onSelect(project)}
        >
          {formatProjectLabel(project)}
        </Button>
      ))}
    </aside>
  );
}
