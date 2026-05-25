import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { GUIDE_ARTICLES, getGuideArticle } from "@/data/guides";
import { canonicalUrl } from "@/lib/seo";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return GUIDE_ARTICLES.map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const article = getGuideArticle(params.slug);
  if (!article) {
    return {
      title: "가이드를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: canonicalUrl(`/guides/${article.slug}`) },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      url: canonicalUrl(`/guides/${article.slug}`),
    },
  };
}

export default function GuideDetailPage({ params }: Props) {
  const article = getGuideArticle(params.slug);
  if (!article) notFound();

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/" className="hover:text-gray-600 transition-colors">
          홈
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/guides" className="hover:text-gray-600 transition-colors">
          준비 가이드
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-gray-700">{article.category}</span>
      </nav>

      <header className="border-b border-gray-100 pb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-700">
          <span className="rounded-full bg-blue-50 px-2.5 py-1">{article.category}</span>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-500">
            읽는 시간 {article.readingMinutes}분
          </span>
        </div>
        <h1 className="text-3xl font-bold leading-tight text-gray-900">{article.title}</h1>
        <p className="mt-3 text-base leading-relaxed text-gray-500">{article.description}</p>
      </header>

      <div className="py-7 space-y-5 text-[15px] leading-8 text-gray-700">
        {article.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
        <h2 className="mb-3 text-base font-bold text-gray-900">핵심 체크리스트</h2>
        <ul className="space-y-2 text-sm leading-relaxed text-gray-700">
          {article.checklist.map((item) => (
            <li key={item} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-8 border-t border-gray-100 pt-5">
        <Link href="/guides" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          준비 가이드 목록으로 돌아가기
        </Link>
      </footer>
    </article>
  );
}
