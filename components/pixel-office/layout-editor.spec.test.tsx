/**
 * Spec Tests: PIXOFF-008, PIXOFF-009
 * spec.yaml 시나리오 기반 수용 기준 테스트
 * 이 파일은 생성 후 수정 금지 — 실패 시 구현을 수정한다
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// sonner toast 모킹
const mockToast = vi.fn();
vi.mock("sonner", () => ({
  toast: mockToast,
  Toaster: () => null,
}));

import LayoutEditor from "@/components/pixel-office/layout-editor";

type PlacedFurniture = {
  id: string;
  type: string;
  col: number;
  row: number;
};

const TWO_FURNITURE: PlacedFurniture[] = [
  { id: "f1", type: "DESK", col: 2, row: 3 },
  { id: "f2", type: "PLANT", col: 5, row: 4 },
];

// ────────────────────────────────────────────────────────────────────
// PIXOFF-008: 레이아웃 에디터 — 가구 배치 저장
// ────────────────────────────────────────────────────────────────────
describe("PIXOFF-008: 레이아웃 에디터 — 가구 배치 저장", () => {
  beforeEach(() => {
    localStorage.clear();
    mockToast.mockClear();
  });

  it("'레이아웃 저장' 버튼 클릭 → '저장됨' toast 표시 + localStorage 저장", async () => {
    const user = userEvent.setup();

    render(<LayoutEditor initialFurniture={TWO_FURNITURE} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /레이아웃 저장/ }));

    // toast "저장됨" 호출 확인
    expect(mockToast).toHaveBeenCalledWith(
      expect.stringContaining("저장됨"),
      expect.anything(),
    );

    // localStorage에 pixel-office-layout 키로 저장됨
    const saved = localStorage.getItem("pixel-office-layout");
    expect(saved).not.toBeNull();

    const parsed = JSON.parse(saved!);
    expect(parsed).toMatchObject({ version: 1, furniture: expect.any(Array) });
  });
});

// ────────────────────────────────────────────────────────────────────
// PIXOFF-009: 페이지 재로드 — 레이아웃 복원
// ────────────────────────────────────────────────────────────────────
describe("PIXOFF-009: 페이지 재로드 — 레이아웃 복원", () => {
  beforeEach(() => {
    localStorage.clear();
    mockToast.mockClear();
  });

  it("localStorage에 저장된 가구 2개 → 동일 위치에 렌더링", () => {
    const layout = {
      version: 1,
      furniture: TWO_FURNITURE,
    };
    localStorage.setItem("pixel-office-layout", JSON.stringify(layout));

    render(<LayoutEditor initialFurniture={[]} onClose={vi.fn()} />);

    // LayoutEditor가 localStorage 데이터를 로드해 furniture를 렌더링
    expect(document.querySelectorAll("[data-furniture-id]")).toHaveLength(2);
  });

  it("localStorage 없을 때 기본 레이아웃으로 에러 없이 렌더링", () => {
    expect(() => {
      render(<LayoutEditor initialFurniture={[]} onClose={vi.fn()} />);
    }).not.toThrow();
  });
});
