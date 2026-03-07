"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Pencil, ChevronDown } from "lucide-react";
import { Contest, ContestStatus, VerifiedLevel, CONTEST_TYPES, CONTEST_STATUSES } from "@/types/contest";
import { formatDate, formatDateRange } from "@/lib/date";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------
// 배지 헬퍼
// ----------------------------------------------------------

const STATUS_CONFIG: Record<
  ContestStatus,
  { label: string; className: string }
> = {
  ongoing: { label: "모집 중", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  upcoming: { label: "모집 예정", className: "bg-blue-50 text-blue-700 border-blue-200" },
  closed: { label: "마감", className: "bg-gray-100 text-gray-500 border-gray-200" },
  canceled: { label: "취소됨", className: "bg-red-50 text-red-600 border-red-200" },
};

const VERIFIED_CONFIG: Record<
  VerifiedLevel,
  { label: string; className: string }
> = {
  0: { label: "미검증", className: "bg-red-50 text-red-600 border-red-200" },
  1: { label: "기본 확인", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  2: { label: "공식 확인", className: "bg-blue-50 text-blue-700 border-blue-200" },
  3: { label: "공식 제휴", className: "bg-violet-50 text-violet-700 border-violet-200" },
};

function StatusBadge({ status }: { status: ContestStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border", c.className)}>
      {c.label}
    </span>
  );
}

function VerifiedBadge({ level }: { level: VerifiedLevel }) {
  const c = VERIFIED_CONFIG[level];
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border", c.className)}>
      {c.label}
    </span>
  );
}

// ----------------------------------------------------------
// 메인 컴포넌트
// ----------------------------------------------------------

interface ContestTableProps {
  contests: Contest[];
}

export function ContestTable({ contests }: ContestTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("전체");
  const [statusFilter, setStatusFilter] = useState<string>("전체");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("전체");

  const filtered = useMemo(() => {
    return contests.filter((c) => {
      const matchSearch =
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.organizer.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "전체" || c.type === typeFilter;
      const matchStatus = statusFilter === "전체" || c.status === statusFilter;
      const matchVerified =
        verifiedFilter === "전체" || String(c.verified_level) === verifiedFilter;
      return matchSearch && matchType && matchStatus && matchVerified;
    });
  }, [contests, search, typeFilter, statusFilter, verifiedFilter]);

  const hasFilter = typeFilter !== "전체" || statusFilter !== "전체" || verifiedFilter !== "전체" || search;

  return (
    <div className="space-y-4">
      {/* 검색 + 필터 바 */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* 검색 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목, 주최기관 검색"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 유형 필터 */}
        <FilterSelect
          value={typeFilter}
          onChange={setTypeFilter}
          options={["전체", ...CONTEST_TYPES]}
          label="유형"
        />

        {/* 상태 필터 */}
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={["전체", ...CONTEST_STATUSES]}
          optionLabels={{
            전체: "전체 상태",
            ongoing: "모집 중",
            upcoming: "모집 예정",
            closed: "마감",
            canceled: "취소됨",
          }}
          label="상태"
        />

        {/* 검수 필터 */}
        <FilterSelect
          value={verifiedFilter}
          onChange={setVerifiedFilter}
          options={["전체", "0", "1", "2", "3"]}
          optionLabels={{
            전체: "전체 검수",
            "0": "미검증",
            "1": "기본 확인",
            "2": "공식 확인",
            "3": "공식 제휴",
          }}
          label="검수"
        />

        {/* 초기화 */}
        {hasFilter && (
          <button
            onClick={() => {
              setSearch("");
              setTypeFilter("전체");
              setStatusFilter("전체");
              setVerifiedFilter("전체");
            }}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            초기화
          </button>
        )}

        {/* 결과 수 */}
        <span className="text-sm text-gray-500 ml-auto">
          총 <strong className="text-gray-900">{filtered.length}</strong>개
        </span>
      </div>

      {/* 테이블 */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        {/* 헤더 */}
        <div className="grid grid-cols-[2fr_1fr_1.4fr_90px_100px_64px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <span>공고명 / 주최기관</span>
          <span className="hidden sm:block">유형</span>
          <span className="hidden md:block">모집 기간</span>
          <span>상태</span>
          <span className="hidden sm:block">검수</span>
          <span className="text-right">수정</span>
        </div>

        {/* 행 */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            조건에 맞는 공고가 없습니다.
          </div>
        ) : (
          filtered.map((contest) => (
            <TableRow key={contest.id} contest={contest} />
          ))
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------
// 테이블 행
// ----------------------------------------------------------

function TableRow({ contest }: { contest: Contest }) {
  return (
    <div className="grid grid-cols-[2fr_1fr_1.4fr_90px_100px_64px] gap-4 items-center px-5 py-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
      {/* 제목 + 주최기관 */}
      <div className="min-w-0">
        <Link
          href={`/admin/contests/${contest.id}`}
          className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
        >
          {contest.title}
        </Link>
        <div className="text-xs text-gray-400 mt-0.5">{contest.organizer}</div>
      </div>

      {/* 유형 */}
      <div className="hidden sm:block">
        <span className="inline-flex px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
          {contest.type}
        </span>
      </div>

      {/* 모집 기간 */}
      <div className="hidden md:block text-xs text-gray-500">
        {formatDateRange(contest.apply_start_at, contest.apply_end_at)}
      </div>

      {/* 상태 */}
      <div>
        <StatusBadge status={contest.status} />
      </div>

      {/* 검수 */}
      <div className="hidden sm:block">
        <VerifiedBadge level={contest.verified_level} />
      </div>

      {/* 수정 버튼 */}
      <div className="flex justify-end">
        <Link
          href={`/admin/contests/${contest.id}`}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
        >
          <Pencil className="w-3 h-3" />
          수정
        </Link>
      </div>
    </div>
  );
}

// ----------------------------------------------------------
// 필터 셀렉트
// ----------------------------------------------------------

function FilterSelect({
  value,
  onChange,
  options,
  optionLabels,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  optionLabels?: Record<string, string>;
  label: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 text-sm cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "hover:border-gray-300 transition-colors bg-white",
          value !== "전체" ? "text-blue-700 font-medium border-blue-300 bg-blue-50" : "text-gray-700"
        )}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {optionLabels?.[opt] ?? opt}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
    </div>
  );
}
