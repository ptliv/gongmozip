import type { BookmarkItem, BookmarkSource, StorageLike } from "@/types/bookmark";
import { getContestSlug } from "@/lib/slug";

export const BOOKMARK_STORAGE_KEY = "gongmozip:bookmarks";
export const BOOKMARK_CHANGE_EVENT = "gongmozip:bookmarks:changed";

function getStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function normalizeItem(source: BookmarkSource): BookmarkItem | null {
  const slug = getContestSlug({ slug: source.slug ?? null, title: source.title ?? null });
  if (!slug) return null;
  return {
    slug,
    title: source.title?.trim() || "제목 없음",
    organizer: source.organizer?.trim() || "주최 미정",
    apply_end_at: source.apply_end_at?.trim() || "",
    source_site: source.source_site?.trim() || "",
    saved_at: new Date().toISOString(),
  };
}

function dedupeBySlug(items: BookmarkItem[]): BookmarkItem[] {
  const bySlug = new Map<string, BookmarkItem>();
  for (const item of items) {
    if (!item.slug) continue;
    bySlug.set(item.slug, item);
  }
  return Array.from(bySlug.values()).sort((a, b) => b.saved_at.localeCompare(a.saved_at));
}

function emitChange(items: BookmarkItem[]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<BookmarkItem[]>(BOOKMARK_CHANGE_EVENT, {
      detail: items,
    })
  );
}

export function readBookmarks(storage?: StorageLike | null): BookmarkItem[] {
  const target = getStorage(storage);
  if (!target) return [];

  const raw = target.getItem(BOOKMARK_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed
      .map((item) =>
        normalizeItem({
          slug: item?.slug,
          title: item?.title,
          organizer: item?.organizer,
          apply_end_at: item?.apply_end_at,
          source_site: item?.source_site,
        })
      )
      .filter((item): item is BookmarkItem => Boolean(item))
      .map((item, index) => ({
        ...item,
        saved_at:
          typeof parsed[index]?.saved_at === "string" && parsed[index].saved_at
            ? parsed[index].saved_at
            : item.saved_at,
      }));

    return dedupeBySlug(normalized);
  } catch {
    return [];
  }
}

export function writeBookmarks(items: BookmarkItem[], storage?: StorageLike | null): BookmarkItem[] {
  const target = getStorage(storage);
  const normalized = dedupeBySlug(items);
  if (!target) return normalized;

  target.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(normalized));
  emitChange(normalized);
  return normalized;
}

export function isBookmarked(slug: string, storage?: StorageLike | null): boolean {
  if (!slug) return false;
  return readBookmarks(storage).some((item) => item.slug === slug);
}

export function toggleBookmark(
  source: BookmarkSource,
  storage?: StorageLike | null
): { saved: boolean; items: BookmarkItem[] } {
  const item = normalizeItem(source);
  if (!item) return { saved: false, items: readBookmarks(storage) };

  const current = readBookmarks(storage);
  const exists = current.some((bookmark) => bookmark.slug === item.slug);

  if (exists) {
    const next = current.filter((bookmark) => bookmark.slug !== item.slug);
    return { saved: false, items: writeBookmarks(next, storage) };
  }

  const next = [{ ...item, saved_at: new Date().toISOString() }, ...current];
  return { saved: true, items: writeBookmarks(next, storage) };
}

export function removeBookmark(slug: string, storage?: StorageLike | null): BookmarkItem[] {
  if (!slug) return readBookmarks(storage);
  const next = readBookmarks(storage).filter((item) => item.slug !== slug);
  return writeBookmarks(next, storage);
}
