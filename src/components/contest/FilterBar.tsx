"use client";

import { useState } from "react";
import {
  SlidersHorizontal,
  ChevronDown,
  X,
  RotateCcw,
  ChevronUp,
} from "lucide-react";
import { ContestFilter, SortBy } from "@/types/contest";
import { cn } from "@/lib/utils";
import {
  TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  FIELD_OPTIONS,
  TARGET_OPTIONS,
  STATUS_OPTIONS,
  ONLINE_OFFLINE_FILTER_OPTIONS,
  SORT_OPTIONS,
  countActiveFilters,
  hasActiveFilters,
  FilterOption,
} from "@/lib/filters";

// ----------------------------------------------------------
// 외부 인터페이스
// ----------------------------------------------------------

interface FilterBarProps {
  filter: ContestFilter;
  onChange: (partial: Partial<ContestFilter>) => void;
  onReset: () => void;
  totalCount: number;
}

const FILTER_GROUPS = [
  { key: "type" as const, label: "유형", options: TYPE_OPTIONS },
  { key: "field" as const, label: "분야", options: FIELD_OPTIONS },
  { key: "category" as const, label: "카테고리", options: CATEGORY_OPTIONS },
  { key: "target" as const, label: "대상", options: TARGET_OPTIONS },
  { key: "status" as const, label: "상태", options: STATUS_OPTIONS },
  { key: "online_offline" as const, label: "방식", options: ONLINE_OFFLINE_FILTER_OPTIONS },
] as const;

// ----------------------------------------------------------
// 메인 컴포넌트
// ----------------------------------------------------------

export function FilterBar({ filter, onChange, onReset, totalCount }: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeCount = countActiveFilters(filter);
  const isActive = hasActiveFilters(filter);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      {/* ── 상단 요약 바 ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {/* 모바일 토글 */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className={cn(
              "md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95",
              mobileOpen || isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            필터
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-blue-600 text-[10px] font-bold">
                {activeCount}
              </span>
            )}
            {mobileOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* 데스크톱 레이블 */}
          <span className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
            필터
            {activeCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
                {activeCount}개 적용
              </span>
            )}
          </span>

          {/* 초기화 버튼 */}
          {isActive && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 active:scale-95 transition-all duration-150"
            >
              <RotateCcw className="w-3 h-3" />
              초기화
            </button>
          )}
        </div>

        {/* 결과 수 + 정렬 */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            총{" "}
            <strong className="text-gray-900 font-bold">{totalCount}</strong>개
          </span>
          <SortSelector value={filter.sort_by} onChange={(v) => onChange({ sort_by: v })} />
        </div>
      </div>

      {/* ── 필터 패널 ── */}
      <div className={cn("md:block", mobileOpen ? "block" : "hidden")}>
        <div className="px-4 py-3 space-y-2.5">
          {FILTER_GROUPS.map((group) => (
            <FilterGroupRow
              key={group.key}
              label={group.label}
              options={group.options as FilterOption<string>[]}
              activeValue={filter[group.key]}
              onSelect={(v) => onChange({ [group.key]: v } as Partial<ContestFilter>)}
            />
          ))}
        </div>

        {/* 모바일 하단 버튼 */}
        {mobileOpen && (
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={onReset}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors font-medium"
            >
              전체 초기화
            </button>
            <button
              onClick={() => setMobileOpen(false)}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
            >
              {totalCount}개 보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------
// 서브 컴포넌트: 필터 그룹 한 행
// ----------------------------------------------------------

interface FilterGroupRowProps {
  label: string;
  options: FilterOption<string>[];
  activeValue: string;
  onSelect: (value: string) => void;
}

function FilterGroupRow({ label, options, activeValue, onSelect }: FilterGroupRowProps) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <span className="flex-shrink-0 w-12 pt-0.5 text-[11px] font-semibold text-gray-400 text-right leading-5">
        {label}
      </span>

      <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
        {options.map((opt) => {
          const isFilterActive = activeValue === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={cn(
                "flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 active:scale-95",
                isFilterActive
                  ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20 ring-offset-1"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
              )}
            >
              {opt.emoji && <span className="text-[10px]">{opt.emoji}</span>}
              {opt.label}
              {isFilterActive && <X className="w-2.5 h-2.5 ml-0.5 opacity-80" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------
// 서브 컴포넌트: 정렬 드롭다운
// ----------------------------------------------------------

function SortSelector({ value, onChange }: { value: SortBy; onChange: (v: SortBy) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortBy)}
        className={cn(
          "appearance-none pl-3 pr-7 py-1.5 rounded-xl border border-gray-200",
          "text-sm text-gray-700 bg-white cursor-pointer font-medium",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "hover:border-gray-300 transition-colors"
        )}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
    </div>
  );
}
