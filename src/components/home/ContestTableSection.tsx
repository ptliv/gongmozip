import Link from "next/link";
import { Star } from "lucide-react";
import type { Contest } from "@/types/contest";
import { DdayBadge } from "@/components/ui/DdayBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, getDaysUntilDeadline } from "@/lib/date";
import { getContestHref } from "@/lib/slug";

interface ContestTableSectionProps {
  readonly contests: readonly Contest[];
}

export function ContestTableSection({ contests }: ContestTableSectionProps) {
  const rows = contests.slice(0, 10);
  const educationRows = contests.filter((contest) => contest.type === "교육").slice(0, 6);

  if (rows.length === 0) return null;

  return (
    <section className="py-10">
      <ContestTable title="최신 공모전·대외활동 정보" contests={rows} />
      {educationRows.length > 0 && (
        <div className="mt-10">
          <ContestTable title="최신 교육·행사 정보" contests={educationRows} compact />
        </div>
      )}
    </section>
  );
}

function ContestTable({
  title,
  contests,
  compact = false,
}: {
  readonly title: string;
  readonly contests: readonly Contest[];
  readonly compact?: boolean;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="border-l-4 border-amber-500 pl-3 text-xl font-black text-zinc-950">{title}</h2>
        <Link href="/latest" className="text-sm font-bold text-amber-800 hover:text-amber-900">
          더보기
        </Link>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-stone-200 bg-white md:block">
        <table className="w-full table-fixed text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs font-black text-zinc-500">
            <tr>
              <th className="w-[42%] px-4 py-3 text-left">공모전/대외활동명</th>
              <th className="w-[21%] px-4 py-3 text-left">접수기간</th>
              <th className="w-[18%] px-4 py-3 text-left">주최</th>
              <th className="w-[11%] px-4 py-3 text-left">진행상황</th>
              <th className="w-[8%] px-4 py-3 text-left">D-day</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {contests.map((contest, index) => (
              <tr key={contest.id} className="hover:bg-amber-50/40">
                <td className="px-4 py-3">
                  <ContestTitle contest={contest} important={index < 3 && !compact} />
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-zinc-600">
                  {formatPeriod(contest)}
                </td>
                <td className="truncate px-4 py-3 text-xs font-semibold text-zinc-600">
                  {contest.organizer || "주최 확인 필요"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge label={statusLabel(contest)} tone={statusTone(contest)} />
                </td>
                <td className="px-4 py-3">
                  <DdayBadge applyEndAt={contest.apply_end_at} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {contests.map((contest, index) => (
          <article key={contest.id} className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-card">
            <ContestTitle contest={contest} important={index < 3 && !compact} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge label={statusLabel(contest)} tone={statusTone(contest)} />
              <DdayBadge applyEndAt={contest.apply_end_at} />
            </div>
            <p className="mt-3 break-words text-xs font-semibold text-zinc-500">{formatPeriod(contest)} · {contest.organizer}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ContestTitle({ contest, important }: { readonly contest: Contest; readonly important: boolean }) {
  return (
    <Link href={getContestHref(contest)} className="group flex min-w-0 items-center gap-1.5">
      {important && <Star className="h-3.5 w-3.5 flex-shrink-0 fill-amber-400 text-amber-400" aria-hidden="true" />}
      <span className="truncate font-black text-zinc-900 group-hover:text-amber-800">{contest.title}</span>
      {isNewContest(contest) && <span className="flex-shrink-0 text-[11px] font-black text-red-500">N</span>}
    </Link>
  );
}

function formatPeriod(contest: Contest): string {
  return `${formatDate(contest.apply_start_at)}~${formatDate(contest.apply_end_at)}`;
}

function isNewContest(contest: Contest): boolean {
  const createdAt = new Date(contest.created_at).getTime();
  if (!Number.isFinite(createdAt)) return false;
  return Date.now() - createdAt <= 1000 * 60 * 60 * 24 * 7;
}

function statusLabel(contest: Contest): string {
  const days = getDaysUntilDeadline(contest.apply_end_at);
  if (Number.isFinite(days) && days === 0) return "오늘마감";
  if (contest.status === "upcoming") return "접수예정";
  if (contest.status === "closed") return "마감";
  return "접수중";
}

function statusTone(contest: Contest): "ongoing" | "upcoming" | "today" | "closed" {
  const days = getDaysUntilDeadline(contest.apply_end_at);
  if (Number.isFinite(days) && days === 0) return "today";
  if (contest.status === "upcoming") return "upcoming";
  if (contest.status === "closed") return "closed";
  return "ongoing";
}
