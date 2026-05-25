const FALLBACK_SITE_URL = "https://www.gongmozip.com";
const FALLBACK_ALTERNATE_SITE_URLS = ["https://gongmozip.com"];

function normalizeSiteUrl(value?: string | null): string | null {
  const url = value?.trim().replace(/\/$/, "");
  return url || null;
}

export function getSiteUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? FALLBACK_SITE_URL;
}

export function getAlternateSiteUrls(): string[] {
  const primary = getSiteUrl();
  const configured = process.env.NEXT_PUBLIC_ALTERNATE_SITE_URLS
    ?.split(",")
    .map((item) => normalizeSiteUrl(item))
    .filter((item): item is string => Boolean(item));

  return Array.from(new Set(configured?.length ? configured : FALLBACK_ALTERNATE_SITE_URLS))
    .filter((url) => url !== primary);
}

export function getAllSiteUrls(): string[] {
  return [getSiteUrl(), ...getAlternateSiteUrls()];
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
