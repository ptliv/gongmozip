export interface BookmarkItem {
  slug: string;
  title: string;
  organizer: string;
  apply_end_at: string;
  source_site: string;
  saved_at: string;
}

export interface BookmarkSource {
  slug?: string | null;
  title?: string | null;
  organizer?: string | null;
  apply_end_at?: string | null;
  source_site?: string | null;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
