/**
 * Pixel Office WebSocket 서버 (포트 3001)
 * 실행: bun run server
 */
import path from "path";
import { WebSocketServer } from "ws";
import { AgentManager } from "./server/agentManager.js";
import { startWatching } from "./server/fileWatcher.js";

const PORT = 3001;
const JSONL_PATH =
  process.env.JSONL_PATH ??
  path.join(
    process.env.HOME ?? process.env.USERPROFILE ?? ".",
    ".claude",
    "projects",
  );

const wss = new WebSocketServer({ port: PORT });
const manager = new AgentManager(wss);

wss.on("connection", (ws) => {
  console.log("[Server] Client connected");
  manager.sendCurrentState(ws);

  ws.on("close", () => {
    console.log("[Server] Client disconnected");
  });

  ws.on("error", (err) => {
    console.error("[Server] Client error:", err.message);
  });
});

wss.on("error", (err) => {
  console.error("[Server] Server error:", err.message);
});

console.log(`[Server] WebSocket server listening on ws://localhost:${PORT}`);
console.log(`[Server] Watching JSONL path: ${JSONL_PATH}`);

const watcher = startWatching(JSONL_PATH, manager);

// Graceful shutdown
const shutdown = () => {
  console.log("[Server] Shutting down...");
  watcher.close();
  wss.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
