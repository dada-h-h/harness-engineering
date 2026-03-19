/**
 * chokidar로 JSONL_PATH 디렉토리 감시
 * 새 .jsonl 파일 추가/변경 시 AgentManager에 라인 전달
 */
import fs from "fs";
import path from "path";
import chokidar from "chokidar";
import type { AgentManager } from "./agentManager.js";

/** 파일 경로 → 마지막으로 읽은 offset */
const fileOffsets = new Map<string, number>();

/** 파일에서 새로운 줄을 읽어 AgentManager로 전달 */
function readNewLines(filePath: string, manager: AgentManager): void {
  const agentId = path.basename(filePath, ".jsonl");
  const project = path.basename(path.dirname(filePath));
  const agent = manager.getOrCreate(agentId, project, filePath);

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return;
  }

  const offset = fileOffsets.get(filePath) ?? agent.fileOffset;
  if (stat.size <= offset) return;

  const buf = Buffer.alloc(stat.size - offset);
  let fd: number;
  try {
    fd = fs.openSync(filePath, "r");
  } catch {
    return;
  }

  try {
    fs.readSync(fd, buf, 0, buf.length, offset);
  } finally {
    fs.closeSync(fd);
  }

  fileOffsets.set(filePath, stat.size);
  agent.fileOffset = stat.size;

  const text = agent.lineBuffer + buf.toString("utf-8");
  const lines = text.split("\n");
  agent.lineBuffer = lines.pop() ?? "";

  for (const line of lines) {
    if (line.trim()) {
      manager.processLine(agentId, line);
    }
  }
}

/**
 * JSONL_PATH 디렉토리를 감시하기 시작한다.
 * @param watchPath 감시할 디렉토리 경로
 * @param manager AgentManager 인스턴스
 * @returns chokidar watcher (cleanup용)
 */
export function startWatching(
  watchPath: string,
  manager: AgentManager,
): ReturnType<typeof chokidar.watch> {
  // Windows 백슬래시 → 슬래시로 정규화 (chokidar glob 호환)
  const normalizedPath = watchPath.replace(/\\/g, "/");

  const watcher = chokidar.watch(normalizedPath, {
    persistent: true,
    ignoreInitial: false,
    // .jsonl 파일만 처리, 나머지는 무시
    ignored: (filePath: string) => {
      const normalized = filePath.replace(/\\/g, "/");
      // 디렉토리는 감시 대상 유지
      try {
        if (fs.statSync(filePath).isDirectory()) return false;
      } catch {
        return false;
      }
      return !normalized.endsWith(".jsonl");
    },
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
    depth: 99,
  });

  watcher.on("add", (filePath) => {
    console.log(`[FileWatcher] New JSONL: ${path.basename(filePath)}`);
    readNewLines(filePath, manager);
  });

  watcher.on("change", (filePath) => {
    readNewLines(filePath, manager);
  });

  watcher.on("unlink", (filePath) => {
    const agentId = path.basename(filePath, ".jsonl");
    console.log(`[FileWatcher] Removed JSONL: ${agentId}`);
    fileOffsets.delete(filePath);
    manager.remove(agentId);
  });

  watcher.on("error", (err) => {
    console.error("[FileWatcher] Error:", err);
  });

  return watcher;
}
