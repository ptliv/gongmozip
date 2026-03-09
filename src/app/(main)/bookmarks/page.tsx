import type { Metadata } from "next";
import { BookmarksPageClient } from "@/components/bookmark/BookmarksPageClient";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "북마크",
  description: "저장한 공모전/대외활동 북마크 목록입니다.",
  alternates: {
    canonical: canonicalUrl("/bookmarks"),
  },
};

export default function BookmarksPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="section-title-accent" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">북마크</h1>
        </div>
        <p className="text-sm text-gray-500 ml-4 leading-relaxed">
          카드와 상세 페이지에서 저장한 공고를 다시 확인할 수 있습니다.
        </p>
      </div>

      <BookmarksPageClient />
    </div>
  );
}
