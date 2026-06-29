import Link from "next/link";
import { BookOpenCheck, CheckCircle2, ChevronRight, Clock3, FileSearch } from "lucide-react";
import { StructuredData } from "@/components/seo/StructuredData";
import type { GuideArticle } from "@/data/guides";
import { canonicalUrl } from "@/lib/seo";

interface GuideArticleDetailProps {
  readonly article: GuideArticle;
  readonly canonicalPath: string;
}

export function GuideArticleDetail({ article, canonicalPath }: GuideArticleDetailProps) {
  const articleUrl = canonicalUrl(canonicalPath);

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.description,
          mainEntityOfPage: articleUrl,
          author: { "@type": "Organization", name: "공모전집" },
          publisher: { "@type": "Organization", name: "공모전집" },
        }}
      />

      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-zinc-400">
        <Link href="/" className="font-semibold transition-colors hover:text-zinc-700">
          홈
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/guides" className="font-semibold transition-colors hover:text-zinc-700">
          준비 가이드
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-bold text-zinc-700">{article.category}</span>
      </nav>

      <header className="mb-8 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="report-chip border-emerald-200 bg-emerald-50 text-emerald-800">
              <BookOpenCheck className="h-3.5 w-3.5" />
              {article.category}
            </span>
            <span className="report-chip">
              <Clock3 className="h-3.5 w-3.5" />
              읽는 시간 {article.readingMinutes}분
            </span>
          </div>
          <h1 className="max-w-3xl text-3xl font-black leading-tight text-zinc-950 sm:text-4xl">
            {article.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-600">{article.description}</p>
        </div>

        <aside className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-amber-900">
            <FileSearch className="h-4 w-4" />
            이 글을 읽고 확인할 것
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-amber-950">
            {article.checklist.slice(0, 3).map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-semibold">{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-card sm:p-8">
          <div className="space-y-5 text-[15px] leading-8 text-zinc-700">
            {article.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24">
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="mb-3 text-base font-black text-zinc-950">핵심 체크리스트</h2>
            <ul className="space-y-2 text-sm leading-relaxed text-zinc-700">
              {article.checklist.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <footer className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
            <Link href="/guides" className="text-sm font-black text-amber-800 hover:text-amber-900">
              준비 가이드 목록으로 돌아가기
            </Link>
          </footer>
        </aside>
      </div>
    </article>
  );
}
