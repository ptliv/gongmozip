"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BOOKMARK_CHANGE_EVENT,
  isBookmarked,
  toggleBookmark,
} from "@/lib/bookmarks";
import type { BookmarkSource } from "@/types/bookmark";

interface BookmarkToggleButtonProps {
  item: BookmarkSource;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function BookmarkToggleButton({
  item,
  className,
  showLabel = false,
  size = "sm",
}: BookmarkToggleButtonProps) {
  const slug = item.slug ?? "";
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);

  const syncState = useCallback(() => {
    if (!slug) {
      setSaved(false);
      return;
    }
    setSaved(isBookmarked(slug));
  }, [slug]);

  useEffect(() => {
    setMounted(true);
    syncState();

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.includes("gongmozip:bookmarks")) {
        syncState();
      }
    };
    const onBookmarkChange = () => syncState();

    window.addEventListener("storage", onStorage);
    window.addEventListener(BOOKMARK_CHANGE_EVENT, onBookmarkChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(BOOKMARK_CHANGE_EVENT, onBookmarkChange);
    };
  }, [syncState]);

  const onToggle = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const result = toggleBookmark(item);
      setSaved(result.saved);
    },
    [item]
  );

  const iconSize = size === "md" ? "w-4.5 h-4.5" : "w-4 h-4";
  const buttonSize = size === "md" ? "h-10 px-3.5 text-sm" : "h-8 w-8";

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="북마크"
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm",
          buttonSize,
          className
        )}
      >
        <Bookmark className={iconSize} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={saved ? "북마크 해제" : "북마크 추가"}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border shadow-sm transition-colors",
        buttonSize,
        saved
          ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
          : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50",
        className
      )}
    >
      <Bookmark className={cn(iconSize, saved ? "fill-current" : "")} />
      {showLabel && (
        <span className="text-xs font-semibold">
          {saved ? "북마크됨" : "북마크"}
        </span>
      )}
    </button>
  );
}
