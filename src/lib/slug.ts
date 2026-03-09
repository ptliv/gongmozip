export interface SlugSource {
  title?: string | null;
  slug?: string | null;
  source_site?: string | null;
  external_id?: string | null;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodeRepeated(value: string, maxPass = 2): string {
  let current = value;
  for (let i = 0; i < maxPass; i += 1) {
    const decoded = safeDecodeURIComponent(current);
    if (decoded === current) break;
    current = decoded;
  }
  return current;
}

export function slugifyContestTitle(title: string): string {
  if (!title) return "contest";
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "") || "contest";
}

export function normalizeIncomingSlug(slug: string): string {
  if (!slug) return "";
  const decoded = decodeRepeated(slug.trim(), 2);
  return slugifyContestTitle(decoded).replace(/^contest$/, "");
}

export function getSlugCandidates(slug: string): string[] {
  const raw = slug?.trim() ?? "";
  const decoded = decodeRepeated(raw, 3);
  const normalizedRaw = normalizeIncomingSlug(raw);
  const normalizedDecoded = normalizeIncomingSlug(decoded);
  // DB에 URL-encoded 형태로 저장된 slug 대응 (예: "%EA%B3%B5%EB%AA%A8%EC%A0%84")
  const encodedNormalized = normalizedDecoded ? encodeURIComponent(normalizedDecoded) : "";
  // raw가 이미 percent-encoded인 경우 그 형태도 포함
  const encodedRaw = raw !== encodedNormalized ? encodeURIComponent(raw) : "";
  return Array.from(
    new Set(
      [raw, decoded, normalizedRaw, normalizedDecoded, encodedNormalized, encodedRaw].filter(Boolean)
    )
  );
}

export function buildContestSlug(
  title: string,
  options?: {
    sourceSite?: string | null;
    externalId?: string | null;
    withSuffix?: boolean;
  }
): string {
  const base = slugifyContestTitle(title);
  if (!options?.withSuffix) return base;

  const site = slugifyContestTitle(options.sourceSite ?? "");
  const externalId = slugifyContestTitle(options.externalId ?? "");
  const suffix = [site, externalId].filter(Boolean).join("-");
  return suffix ? `${base}-${suffix}` : base;
}

export function getContestSlug(source: SlugSource): string {
  const normalizedSlug = normalizeIncomingSlug(source.slug ?? "");
  if (normalizedSlug) return normalizedSlug;
  return buildContestSlug(source.title ?? "", {
    sourceSite: source.source_site,
    externalId: source.external_id,
    withSuffix: Boolean(source.source_site && source.external_id),
  });
}

export function getContestHref(source: SlugSource): string {
  return `/contests/${getContestSlug(source)}`;
}

export function parseContestSlugSuffix(slug: string): {
  sourceSite: string | null;
  externalId: string | null;
} {
  const normalized = normalizeIncomingSlug(slug);
  const parts = normalized.split("-").filter(Boolean);
  if (parts.length < 3) {
    return { sourceSite: null, externalId: null };
  }
  const externalId = parts[parts.length - 1] ?? null;
  const sourceSite = parts[parts.length - 2] ?? null;
  if (!externalId || !sourceSite) {
    return { sourceSite: null, externalId: null };
  }
  return { sourceSite, externalId };
}
