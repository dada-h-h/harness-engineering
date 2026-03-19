# Pixel Office 구현 계획

## Architecture Decisions

| 결정 사항 | 선택 | 사유 |
|-----------|------|------|
| Canvas SSR | `dynamic(() => ..., { ssr: false })` | Canvas API는 브라우저 전용 |
| WebSocket 서버 | `ws` 라이브러리 + `server.ts` | pixel-agents 기존 의존성 재사용 |
| 파일 감시 | `chokidar` | VS Code FileSystemWatcher 대체 |
| JSONL 경로 설정 | `.env` JSONL_PATH 환경 변수 | UI 입력란 없이 고정 |
| 레이아웃 저장 | localStorage (`pixel-office-layout` 키) | 서버 불필요, 로컬 개발 전용 |
| 자동 재연결 | 수동 구현 (setTimeout 기반) | 외부 라이브러리 불필요 |
| Toast | `sonner` | shadcn 공식 권장, 경량 |

## Required Skills

| 스킬 | 용도 |
|------|------|
| `vercel-react-best-practices` | Canvas SSR 방지, 게임 루프 ref 최적화, localStorage 스키마, WebSocket 이벤트 리스너 |
| `web-design-guidelines` | Badge/Button/Toast 접근성 및 UX 준수 |
| `websocket-engineer` | WebSocket 서버 구조, 재연결 패턴 |

## UI Components

### 설치 필요

| 컴포넌트 | 설치 명령 |
|----------|-----------|
| Toast (sonner) | `bunx shadcn@latest add sonner` |
| Badge | `bunx shadcn@latest add badge` |
| Lucide React (아이콘) | `bun add lucide-react` |

### 커스텀 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| `OfficeCanvas` | Canvas 렌더러 + 게임 루프 (pixel-agents 포팅) |
| `useAgentSocket` | WebSocket 클라이언트 훅 (연결 상태 + 에이전트 맵 관리) |
| `LayoutEditor` | 가구 drag & drop 팔레트 + 캔버스 오버레이 |

## 실행 프로토콜

- 각 task 시작 전, **참조 규칙**에 나열된 파일을 반드시 읽고 규칙을 준수하며 구현한다

## Tasks

### Task 1: 에셋 복사 (선행 작업)

> **선행 이유**: Canvas 렌더러가 `public/assets/` 경로를 정적으로 참조하므로 이후 모든 구현/테스트에 필요.

- **시나리오**: 없음 (인프라 설정)
- **참조 규칙**: 없음
- **구현 대상**:
  - `E:\dhkim_p\Project\claude-code\pixel-agents\webview-ui\public\assets\` → `public/assets/` 복사
  - 캐릭터 6종, 가구 35+종, 바닥 9종 포함
- **수용 기준**:
  - [ ] `public/assets/characters/` 디렉토리에 캐릭터 스프라이트 파일이 존재한다
  - [ ] `public/assets/furniture/` 디렉토리에 가구 스프라이트 파일이 존재한다
- **커밋**: `chore: pixel-agents 에셋 복사`

---

### Task 2: spec 테스트 생성

- **시나리오**: PIXOFF-001, PIXOFF-002, PIXOFF-003, PIXOFF-004, PIXOFF-005, PIXOFF-006, PIXOFF-007, PIXOFF-008, PIXOFF-009
- **참조 규칙**: `.claude/skills/writing-plan/references/plan-template.md`
- **구현 대상**:
  - `app/pixel-office/page.spec.test.tsx` — 페이지 수준 수용 기준 테스트 (PIXOFF-001~003)
  - `components/pixel-office/office-canvas.spec.test.tsx` — 캐릭터 상태 테스트 (PIXOFF-004~007)
  - `components/pixel-office/layout-editor.spec.test.tsx` — 에디터 저장/복원 테스트 (PIXOFF-008~009)
- **수용 기준**:
  - [ ] `bun run test` 실행 시 모든 spec 테스트가 Red(실패) 상태로 존재한다
  - [ ] PIXOFF-001: 연결 성공 시 `statusBadge` = "연결됨", `characterCount` = 3
  - [ ] PIXOFF-002: 서버 미실행 시 `statusBadge` = "서버 연결 끊김", `characterCount` = 0, `canvasVisible` = true
  - [ ] PIXOFF-004: agent-1 status="working" → `data-state="working"` 속성 확인
  - [ ] PIXOFF-008: 저장 버튼 클릭 → "저장됨" 텍스트 표시
- **커밋**: `test: PIXOFF spec 테스트 생성`

---

### Task 3: WebSocket 서버 구현

- **시나리오**: PIXOFF-001, PIXOFF-002, PIXOFF-003
- **참조 규칙**:
  - `.claude/skills/websocket-engineer/` (WebSocket 서버 구조, 재연결 패턴)
- **구현 대상**:
  - `server.ts` — WebSocket 서버 (포트 3001)
  - `server/transcriptParser.ts` — pixel-agents `src/transcriptParser.ts` 무수정 포팅
  - `server/fileWatcher.ts` — chokidar로 `JSONL_PATH` 감시
  - `server/agentManager.ts` — 에이전트 상태 관리 + WebSocket broadcast
  - 메시지 포맷: `{ type: "agents", data: Agent[] }` / `{ type: "agent-update", data: { id, status } }`
- **수용 기준**:
  - [ ] `bun run server` 실행 후 `ws://localhost:3001` 연결 시 현재 에이전트 목록을 즉시 전송한다
  - [ ] JSONL 파일에 새 이벤트 추가 시 3초 이내에 WebSocket 클라이언트에 상태 업데이트 브로드캐스트된다
  - [ ] 클라이언트 연결/해제가 반복되어도 서버가 정상 동작한다
- **커밋**: `feat: WebSocket 서버 + JSONL 감시 구현`

---

### Task 4: useAgentSocket 훅 구현

- **시나리오**: PIXOFF-001, PIXOFF-002, PIXOFF-003
- **참조 규칙**:
  - `.claude/skills/vercel-react-best-practices/rules/client-event-listeners.md`
  - `.claude/skills/vercel-react-best-practices/rules/rerender-dependencies.md`
  - `.claude/skills/vercel-react-best-practices/rules/advanced-event-handler-refs.md`
- **구현 대상**:
  - `hooks/use-agent-socket.ts`
  - 반환값: `{ status: 'connected' | 'disconnected' | 'reconnecting', agents: Map<string, Agent> }`
  - 자동 재연결: 연결 끊김 후 3초 간격 setTimeout 재시도. 재시도 중 `status` = "reconnecting"
- **수용 기준**:
  - [ ] 서버 실행 중: `status` = "connected", `agents` 맵이 서버 데이터와 일치한다
  - [ ] 서버 미실행: `status` = "disconnected", `agents` 맵이 비어 있다
  - [ ] 서버 재시작 후: `status` → "connected"로 자동 전환된다
  - [ ] 컴포넌트 언마운트 시 WebSocket이 닫히고 재연결 타이머가 정리된다
- **커밋**: `feat: useAgentSocket WebSocket 클라이언트 훅`

---

### Task 5: OfficeCanvas 컴포넌트 구현

- **시나리오**: PIXOFF-001, PIXOFF-004, PIXOFF-005, PIXOFF-006, PIXOFF-007
- **참조 규칙**:
  - `.claude/skills/vercel-react-best-practices/rules/bundle-dynamic-imports.md`
  - `.claude/skills/vercel-react-best-practices/rules/rerender-use-ref-transient-values.md`
  - `.claude/skills/vercel-react-best-practices/rules/rendering-hydration-no-flicker.md`
- **구현 대상**:
  - `components/pixel-office/office-canvas.tsx` (`"use client"`, `dynamic` SSR 비활성)
  - `components/pixel-office/engine/renderer.ts` — pixel-agents `renderer.ts` 포팅
  - `components/pixel-office/engine/game-loop.ts` — pixel-agents `gameLoop.ts` 포팅
  - `components/pixel-office/engine/characters.ts` — pixel-agents `characters.ts` 포팅
  - `components/pixel-office/engine/office-state.ts` — pixel-agents `officeState.ts` 포팅
  - `data-state` 속성으로 캐릭터 상태 노출 (테스트 셀렉터 기준)
  - 에이전트 카운트 정보바: 캔버스 하단에 "에이전트 N명 활성 | working N thinking N idle N" 요약
  - 재연결 중(`reconnecting`) 캔버스 하단 오버레이: Lucide `loader` 아이콘 + "재연결 시도 중..." 텍스트
- **수용 기준**:
  - [ ] Canvas 요소가 브라우저에서 렌더링된다 (SSR 에러 없음)
  - [ ] `agents` prop에 에이전트 1개 전달 시 캐릭터 1개 표시, 3개 전달 시 3개 표시
  - [ ] `status="working"` → 해당 캐릭터 요소에 `data-state="working"` 설정
  - [ ] `status="done"` → 해당 캐릭터 요소가 DOM에서 제거됨
- **커밋**: `feat: OfficeCanvas 컴포넌트 + 엔진 포팅`

---

### Task 6: 레이아웃 에디터 구현

- **시나리오**: PIXOFF-008, PIXOFF-009
- **참조 규칙**:
  - `.claude/skills/vercel-react-best-practices/rules/client-localstorage-schema.md`
  - `.claude/skills/vercel-react-best-practices/rules/js-cache-storage.md`
  - `.claude/skills/web-design-guidelines/SKILL.md` → `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
- **구현 대상**:
  - `components/pixel-office/layout-editor.tsx` — 가구 팔레트 + drag & drop
  - `components/pixel-office/engine/` 내 editor 모듈 포팅 (pixel-agents `editor/`)
  - localStorage 스키마: `{ version: 1, furniture: FurnitureItem[] }`
  - 편집 모드 진입 시 헤더에 "편집 모드" 상태 배지 + "취소" 버튼 + "레이아웃 저장" 버튼
  - 저장 성공 시 `sonner` toast: Lucide `check` 아이콘 + "저장됨"
- **수용 기준**:
  - [ ] '레이아웃 저장' 버튼 클릭 → "저장됨" toast 표시
  - [ ] 저장 후 `localStorage.getItem('pixel-office-layout')` 값이 존재한다
  - [ ] 가구 2개 배치·저장 → 페이지 재로드 → 동일 위치에 가구 2개 렌더링
  - [ ] localStorage 없이 재로드 → 기본 레이아웃 표시 (에러 없음)
- **커밋**: `feat: 레이아웃 에디터 + localStorage 저장/복원`

---

### Task 7: 페이지 통합

- **시나리오**: PIXOFF-001, PIXOFF-002, PIXOFF-003
- **참조 규칙**:
  - `.claude/skills/vercel-react-best-practices/rules/bundle-dynamic-imports.md`
  - `.claude/skills/web-design-guidelines/SKILL.md` → `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
- **구현 대상**:
  - `app/pixel-office/page.tsx` — OfficeCanvas + useAgentSocket + 상태 배지 + 레이아웃 편집 버튼
  - `app/layout.tsx`에 `<Toaster />` (sonner) 추가
  - 상태 배지: Badge 컴포넌트, dot indicator(online/offline) + "연결됨" / "서버 연결 끊김" 텍스트
- **수용 기준**:
  - [ ] `bun dev` + `bun run server` 동시 실행 후 `/pixel-office` 접속 시 에러 없이 로드됨
  - [ ] 서버 실행 중: 배지 = "연결됨"
  - [ ] 서버 미실행: 배지 = "서버 연결 끊김", 캔버스 표시
  - [ ] `bun run test` 전체 통과
- **커밋**: `feat: pixel-office 페이지 통합`

---

## 미결정 사항

- (없음)
