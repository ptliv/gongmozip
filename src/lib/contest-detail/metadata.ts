import type { ContestDetailPayload } from "@/lib/supabase/public-contest-queries";

const METADATA_KEY_WHITELIST = [
  "접수방법",
  "신청방법",
  "지원자격",
  "참가자격",
  "응모자격",
  "시상내역",
  "문의처",
  "주제",
  "참가비",
  "유의사항",
  "참고사항",
  "method",
  "eligibility",
  "qualification",
  "prize",
  "contact",
  "fee",
] as const;

function isAllowedMetadataKey(key: string): boolean {
  const normalized = key
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return METADATA_KEY_WHITELIST.some((allowed) =>
    normalized.includes(allowed.normalize("NFKC").toLowerCase().replace(/[\s_-]+/g, ""))
  );
}

export function toMetadataPairs(metadata: Record<string, unknown>): Array<{ key: string; value: string }> {
  return Object.entries(metadata)
    .filter(([key]) => isAllowedMetadataKey(key))
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => {
      if (Array.isArray(value)) return { key, value: value.map((v) => String(v)).join(", ") };
      if (typeof value === "object") return { key, value: JSON.stringify(value) };
      return { key, value: String(value) };
    })
    .filter((item) => item.value.trim().length > 0)
    .slice(0, 12);
}

export function getOfficialEnrichment(contest: ContestDetailPayload): {
  readonly title?: string;
  readonly url?: string;
  readonly chars?: number;
  readonly lines: string[];
} {
  const enrichment =
    contest.metadata_json?.enrichment && typeof contest.metadata_json.enrichment === "object"
      ? (contest.metadata_json.enrichment as Record<string, unknown>)
      : {};
  const lines = Array.isArray(enrichment.official_relevant_lines)
    ? enrichment.official_relevant_lines.map((line) => String(line)).filter(Boolean).slice(0, 4)
    : [];

  return {
    title: typeof enrichment.official_title === "string" ? enrichment.official_title : undefined,
    url: typeof enrichment.official_fetch_url === "string" ? enrichment.official_fetch_url : undefined,
    chars: typeof enrichment.official_text_chars === "number" ? enrichment.official_text_chars : undefined,
    lines,
  };
}

function normalizeExternalUrl(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function getApplyUrl(contest: ContestDetailPayload, enrichedUrl?: string): string {
  const candidates = [
    contest.official_url,
    contest.official_source_url,
    enrichedUrl,
    contest.source_url,
    contest.aggregator_source_url,
  ];

  for (const candidate of candidates) {
    const url = normalizeExternalUrl(candidate);
    if (url) return url;
  }

  return "";
}
