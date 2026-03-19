"use client";

import { Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface PlacedFurniture {
  id: string;
  type: string;
  col: number;
  row: number;
}

interface LayoutData {
  version: 1;
  furniture: PlacedFurniture[];
}

const STORAGE_KEY = "pixel-office-layout";

function loadFromStorage(): PlacedFurniture[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as LayoutData;
    if (data.version !== 1 || !Array.isArray(data.furniture)) return null;
    return data.furniture;
  } catch {
    return null;
  }
}

function saveToStorage(furniture: PlacedFurniture[]): void {
  try {
    const data: LayoutData = { version: 1, furniture };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // incognito / 용량 초과 대비
  }
}

interface Props {
  /** 초기 가구 목록 (localStorage 없을 때 기본값) */
  initialFurniture?: PlacedFurniture[];
  onClose: () => void;
}

export default function LayoutEditor({
  initialFurniture = [],
  onClose,
}: Props) {
  const [furniture, setFurniture] = useState<PlacedFurniture[]>(() => {
    // localStorage 우선 복원
    const saved = loadFromStorage();
    return saved ?? initialFurniture;
  });

  // 페이지 재로드 시뮬레이션: 마운트 시 localStorage 재확인
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setFurniture(saved);
    }
  }, []);

  const handleSave = useCallback(() => {
    saveToStorage(furniture);
    toast("저장됨", {
      icon: <Check size={14} />,
      duration: 2000,
    });
  }, [furniture]);

  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-background">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">편집 모드</Badge>
          <span className="text-sm font-medium">레이아웃 에디터</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={14} className="mr-1" />
            취소
          </Button>
          <Button size="sm" onClick={handleSave}>
            레이아웃 저장
          </Button>
        </div>
      </div>

      {/* 가구 목록 — 테스트용 data-furniture-id 속성 노출 */}
      <div className="relative min-h-24 rounded border border-dashed border-border bg-muted/30">
        {furniture.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">
            배치된 가구가 없습니다.
          </p>
        ) : (
          <div className="p-2 flex flex-wrap gap-2">
            {furniture.map((item) => (
              <div
                key={item.id}
                data-furniture-id={item.id}
                data-col={item.col}
                data-row={item.row}
                className="px-2 py-1 rounded text-xs bg-muted border border-border"
              >
                {item.type} ({item.col},{item.row})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
