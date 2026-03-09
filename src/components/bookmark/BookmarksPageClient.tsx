"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookmarkX } from "lucide-react";
import type { BookmarkItem } from "@/types/bookmark";
import {
  BOOKMARK_CHANGE_EVENT,
  readBookmarks,
} from "@/lib/bookmarks";
import { getContestHref } from "@/lib/slug";
import { formatDateKo } from "@/lib/date";
import { DeadlineBadge } from "@/components/ui/DeadlineBadge";
import { BookmarkToggleButton } from "@/components/bookmark/BookmarkToggleButton";

function safeDate(date: string): string {
  if (!date) return "마감일 미정";
  try {
    return formatDateKo(date);
  } catch {
    return "마감일 미정";
  }
}

export function BookmarksPageClient() {
  const [items, setItems] = useState<BookmarkItem[] | null>(null);

  useEffect(() => {
    const sync = () => setItems(readBookmarks());
    sync();

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.includes("gongmozip:bookmarks")) {
        sync();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(BOOKMARK_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(BOOKMARK_CHANGE_EVENT, sync);
    };
  }, []);

  const bookmarks = useMemo(() => items ?? [], [items]);

  if (items === null) {
    return <p className="text-sm text-gray-500">북마크를 불러오는 중...</p>;
  }

  if (bookmarks.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white py-16 px-6 text-center">
        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <BookmarkX className="w-5 h-5 text-gray-400" />
        </div>
        <h2 className="text-base font-bold text-gray-800 mb-1">저장된 북마크가 없습니다</h2>
        <p className="text-sm text-gray-500 mb-5">공고 카드에서 북마크 버튼을 눌러 저장하세요.</p>
        <Link
          href="/contests"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          공고 보러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {bookmarks.map((item) => {
        const href = getContestHref({ slug: item.slug, title: item.title });
        return (
          <div
            key={item.slug}
            className="relative rounded-2xl border border-gray-100 bg-white p-5 shadow-card"
          >
            <div className="absolute right-4 top-4">
              <BookmarkToggleButton item={item} />
            </div>

            <Link href={href} className="block pr-12">
              <h3 className="text-[0.95rem] font-bold text-gray-900 leading-snug mb-2 line-clamp-2 hover:text-blue-700 transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-gray-500 mb-2">{item.organizer || "주최 미정"}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{safeDate(item.apply_end_at)}</span>
                <DeadlineBadge applyEndAt={item.apply_end_at} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                <span>{item.source_site || "source 미정"}</span>
                <span>저장 {safeDate(item.saved_at.slice(0, 10))}</span>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
