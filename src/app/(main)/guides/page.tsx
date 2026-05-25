import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Clock3 } from "lucide-react";
import { GUIDE_ARTICLES } from "@/data/guides";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "공모전 준비 가이드",
  description: "공모전, 대외활동, 인턴십을 준비할 때 필요한 글쓰기, 제출, 일정 관리 가이드입니다.",
  alternates: { canonical: canonicalUrl("/guides") },
};

export default function GuidesPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="section-title-accent" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            공모전 준비 가이드
          </h1>
        </div>
        <p className="text-sm text-gray-500 ml-4 leading-relaxed max-w-3xl">
          공고를 찾는 것에서 끝나지 않고 실제 지원서, 기획서, 포트폴리오, 제출 체크리스트까지
          준비할 수 있도록 공모전집이 정리한 정보성 글입니다.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GUIDE_ARTICLES.map((article) => (
          <Link
            key={article.slug}
            href={`/guides/${article.slug}`}
            className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-card-hover"
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BookOpen className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-gray-400">
                  <span>{article.category}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {article.readingMinutes}분
                  </span>
                </div>
                <h2 className="mt-1 text-base font-bold text-gray-900 group-hover:text-blue-700">
                  {article.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500">
                  {article.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
