import { differenceInDays, format, parseISO, isAfter, isBefore, isEqual } from "date-fns";
import { ko } from "date-fns/locale";
import { ContestStatus } from "@/types/contest";

// ----------------------------------------------------------
// 기본 포맷
// ----------------------------------------------------------

/** "2026.03.15" 형식 */
export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "yyyy.MM.dd", { locale: ko });
}

/** "2026년 3월 15일" 형식 */
export function formatDateKo(dateStr: string): string {
  return format(parseISO(dateStr), "yyyy년 M월 d일", { locale: ko });
}

/** "2026.03.01 ~ 2026.04.30" 형식 */
export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
}

// ----------------------------------------------------------
// D-Day 계산
// ----------------------------------------------------------

/** 오늘 기준 마감까지 남은 일수 (음수이면 마감) */
export function getDaysUntilDeadline(endDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = parseISO(endDateStr);
  return differenceInDays(end, today);
}

/** 마감일 기준 D-Day 텍스트 반환 */
export function getDDayLabel(endDateStr: string): string {
  const days = getDaysUntilDeadline(endDateStr);
  if (days < 0) return "마감";
  if (days === 0) return "D-Day";
  return `D-${days}`;
}

// ----------------------------------------------------------
// 상태 계산
// ----------------------------------------------------------

export type DeadlineStatus = "urgent" | "soon" | "normal" | "closed";

/**
 * 뱃지 표시용 시각적 상태
 * urgent: D-3 이하, soon: D-7 이하, normal: 그 이상, closed: 마감
 */
export function getDeadlineStatus(endDateStr: string): DeadlineStatus {
  const days = getDaysUntilDeadline(endDateStr);
  if (days < 0) return "closed";
  if (days <= 3) return "urgent";
  if (days <= 7) return "soon";
  return "normal";
}

/**
 * 날짜 기반으로 ContestStatus 자동 계산
 * (더미 데이터 생성 또는 실시간 상태 계산에 활용)
 */
export function deriveContestStatus(
  applyStartAt: string,
  applyEndAt: string
): ContestStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseISO(applyStartAt);
  const end = parseISO(applyEndAt);

  if (isBefore(end, today)) return "closed";
  if (isAfter(start, today)) return "upcoming";
  return "ongoing";
}

// ----------------------------------------------------------
// 기간 체크
// ----------------------------------------------------------

/** 마감임박 여부 (N일 이내) */
export function isDeadlineSoon(endDateStr: string, withinDays = 7): boolean {
  const days = getDaysUntilDeadline(endDateStr);
  return days >= 0 && days <= withinDays;
}

/** 모집 중 여부 */
export function isOngoing(applyStartAt: string, applyEndAt: string): boolean {
  return deriveContestStatus(applyStartAt, applyEndAt) === "ongoing";
}
