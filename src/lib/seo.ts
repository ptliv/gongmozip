const FALLBACK_SITE_URL = "https://gongmozip.com";

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE_URL).replace(/\/$/, "");
}

export function canonicalUrl(path: string): string {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${safePath}`;
}

export function buildDefaultDescription(input: {
  title?: string | null;
  organizer?: string | null;
  applyEndAt?: string | null;
}): string {
  const title = input.title?.trim() || "공모전";
  const organizer = input.organizer?.trim() || "주최 정보 없음";
  const deadline = input.applyEndAt?.trim() || "마감일 미정";
  return `${title} · ${organizer} · 마감 ${deadline}`;
}
