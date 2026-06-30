import type { Contest } from "@/types/contest";
import { getOfficialContestUrl } from "@/lib/indexing";
import { slugifyContestTitle } from "@/lib/slug";

function getTimestamp(value?: string | null): number {
  const time = Date.parse(value ?? "");
  return Number.isNaN(time) ? 0 : time;
}

function getSourceScore(contest: Contest): number {
  if (getOfficialContestUrl(contest)) return 4;
  if (contest.official_source_url?.trim()) return 3;
  if (contest.aggregator_source_url?.trim() || contest.source_url?.trim()) return 2;
  return 1;
}

function getDedupePart(value?: string | null): string {
  const key = slugifyContestTitle(value ?? "").replace(/^contest$/, "");
  return key;
}

function compareContestQuality(left: Contest, right: Contest): number {
  return (
    right.verified_level - left.verified_level ||
    (right.review_score ?? -1) - (left.review_score ?? -1) ||
    getSourceScore(right) - getSourceScore(left) ||
    getTimestamp(right.updated_at) - getTimestamp(left.updated_at) ||
    getTimestamp(right.created_at) - getTimestamp(left.created_at)
  );
}

export function getContestDedupeKey(contest: Contest): string {
  const titleKey = getDedupePart(contest.title);
  const organizerKey = getDedupePart(contest.organizer);
  const deadlineKey = contest.apply_end_at?.slice(0, 10) || "";
  if (!titleKey || !organizerKey || !deadlineKey) return "";
  return `${titleKey}|${organizerKey}|${deadlineKey}`;
}

export function dedupePublicContests<T extends Contest>(contests: readonly T[]): T[] {
  const order: string[] = [];
  const selected = new Map<string, T>();

  for (const contest of contests) {
    const key = getContestDedupeKey(contest);
    if (!key) {
      order.push(`id:${contest.id}`);
      selected.set(`id:${contest.id}`, contest);
      continue;
    }

    const current = selected.get(key);
    if (!current) {
      order.push(key);
      selected.set(key, contest);
      continue;
    }

    if (compareContestQuality(current, contest) > 0) {
      selected.set(key, contest);
    }
  }

  return order.map((key) => selected.get(key)).filter((contest): contest is T => Boolean(contest));
}
