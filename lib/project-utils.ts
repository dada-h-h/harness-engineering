/**
 * "E--dhkim-p-Project-claude-code-harness-engineering"
 * → "claude-code-harness-engineering"
 *
 * 규칙: "--" 로 split → 마지막 세그먼트 → "Project" 이후 부분
 * "Project" 없으면 마지막 세그먼트 전체 반환
 */
export function formatProjectLabel(folderName: string): string {
  const segments = folderName.split("--");
  const lastSegment = segments[segments.length - 1];
  const parts = lastSegment.split("-");
  const projectIdx = parts.findIndex((p) => p.toLowerCase() === "project");
  if (projectIdx !== -1 && projectIdx < parts.length - 1) {
    return parts.slice(projectIdx + 1).join("-");
  }
  return lastSegment;
}
