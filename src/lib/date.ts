import { differenceInDays, format, parseISO, isAfter, isBefore, isEqual } from "date-fns";
import { ko } from "date-fns/locale";
import { ContestStatus } from "@/types/contest";

function todayStartInKorea(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "1970");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "1");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "1");
  return new Date(year, month - 1, day);
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "yyyy.MM.dd", { locale: ko });
}

export function formatDateKo(dateStr: string): string {
  return format(parseISO(dateStr), "yyyy년 M월 d일", { locale: ko });
}

export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
}

export function getDaysUntilDeadline(endDateStr: string): number {
  const end = parseISO(endDateStr);
  return differenceInDays(end, todayStartInKorea());
}

export function getDDayLabel(endDateStr: string): string {
  const days = getDaysUntilDeadline(endDateStr);
  if (days <= 0) return "마감";
  return `D-${days}`;
}

export type DeadlineStatus = "urgent" | "soon" | "normal" | "closed";

export function getDeadlineStatus(endDateStr: string): DeadlineStatus {
  const days = getDaysUntilDeadline(endDateStr);
  if (days <= 0) return "closed";
  if (days <= 3) return "urgent";
  if (days <= 7) return "soon";
  return "normal";
}

export function deriveContestStatus(
  applyStartAt: string,
  applyEndAt: string
): ContestStatus {
  const today = todayStartInKorea();
  const start = parseISO(applyStartAt);
  const end = parseISO(applyEndAt);

  if (isBefore(end, today) || isEqual(end, today)) return "closed";
  if (isAfter(start, today)) return "upcoming";
  return "ongoing";
}

export function isDeadlineSoon(endDateStr: string, withinDays = 7): boolean {
  const days = getDaysUntilDeadline(endDateStr);
  return days > 0 && days <= withinDays;
}

export function isOngoing(applyStartAt: string, applyEndAt: string): boolean {
  return deriveContestStatus(applyStartAt, applyEndAt) === "ongoing";
}
