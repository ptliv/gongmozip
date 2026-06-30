"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import type { ContestFilter, SortBy } from "@/types/contest";
import { cn } from "@/lib/utils";
import {
  ANALYSIS_FILTER_OPTIONS,
  CATEGORY_OPTIONS,
  FIELD_OPTIONS,
  FilterOption,
  ONLINE_OFFLINE_FILTER_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  TARGET_OPTIONS,
  TYPE_OPTIONS,
  countActiveFilters,
  hasActiveFilters,
} from "@/lib/filters";

interface FilterBarProps {
  readonly filter: ContestFilter;
  readonly onChange: (partial: Partial<ContestFilter>) => void;
  readonly onReset: () => void;
  readonly totalCount: number;
}

const FILTER_GROUPS = [
  { key: "type" as const, label: "유형", options: TYPE_OPTIONS },
  { key: "field" as const, label: "분야", options: FIELD_OPTIONS },
  { key: "category" as const, label: "카테고리", options: CATEGORY_OPTIONS },
  { key: "target" as const, label: "대상", options: TARGET_OPTIONS },
  { key: "status" as const, label: "상태", options: STATUS_OPTIONS },
  { key: "online_offline" as const, label: "방식", options: ONLINE_OFFLINE_FILTER_OPTIONS },
  { key: "analysis" as const, label: "판단", options: ANALYSIS_FILTER_OPTIONS },
] as const;

export function FilterBar({ filter, onChange, onReset, totalCount }: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeCount = countActiveFilters(filter);
  const isActive = hasActiveFilters(filter);

  return (
    <section className="report-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-stone-200 bg-[#fffdf8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-black transition-colors md:hidden",
              mobileOpen || isActive ? "bg-zinc-900 text-white" : "bg-stone-100 text-zinc-700"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            필터
            {activeCount > 0 && (
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-black text-zinc-900">
                {activeCount}
              </span>
            )}
            {mobileOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <span className="hidden items-center gap-2 text-sm font-black text-zinc-800 md:inline-flex">
            <SlidersHorizontal className="h-4 w-4 text-amber-700" />
            공고 판단 필터
            {activeCount > 0 && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900">
                {activeCount}개 적용
              </span>
            )}
          </span>

          {isActive && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold text-zinc-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <RotateCcw className="h-3 w-3" />
              초기화
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-sm font-semibold text-zinc-500">
            총 <strong className="font-black text-zinc-950">{totalCount}</strong>개
          </span>
          <SortSelector value={filter.sort_by} onChange={(value) => onChange({ sort_by: value })} />
        </div>
      </div>

      <div className={cn("md:block", mobileOpen ? "block" : "hidden")}>
        <div className="grid gap-2.5 px-4 py-4">
          {FILTER_GROUPS.map((group) => (
            <FilterGroupRow
              key={group.key}
              label={group.label}
              options={group.options as FilterOption<string>[]}
              activeValue={filter[group.key]}
              onSelect={(value) => onChange({ [group.key]: value } as Partial<ContestFilter>)}
            />
          ))}
        </div>

        {mobileOpen && (
          <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-4 py-3 md:hidden">
            <button type="button" onClick={onReset} className="text-sm font-bold text-zinc-500">
              전체 초기화
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-black text-white"
            >
              {totalCount}개 보기
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

interface FilterGroupRowProps {
  readonly label: string;
  readonly options: FilterOption<string>[];
  readonly activeValue: string;
  readonly onSelect: (value: string) => void;
}

function FilterGroupRow({ label, options, activeValue, onSelect }: FilterGroupRowProps) {
  return (
    <div className="grid gap-2 md:grid-cols-[4.25rem_1fr] md:items-start">
      <span className="pt-1 text-[11px] font-black uppercase tracking-widest text-zinc-400 md:text-right">
        {label}
      </span>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 md:flex-wrap md:overflow-visible">
        {options.map((option) => {
          const active = activeValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cn(
                "inline-flex flex-shrink-0 items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-bold transition-colors",
                active
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-stone-200 bg-stone-50 text-zinc-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900"
              )}
            >
              {option.label}
              {active && <X className="h-3 w-3 opacity-80" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SortSelector({
  value,
  onChange,
}: {
  readonly value: SortBy;
  readonly onChange: (value: SortBy) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortBy)}
        className="appearance-none rounded-lg border border-stone-200 bg-white py-2 pl-3 pr-8 text-sm font-bold text-zinc-700 transition-colors hover:border-amber-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
    </div>
  );
}
