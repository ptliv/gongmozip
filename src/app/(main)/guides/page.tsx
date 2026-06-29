import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, Clock3, FileSearch, ListChecks } from "lucide-react";
import { GUIDE_ARTICLES } from "@/data/guides";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "공모전 준비 가이드",
  description: "공모전, 대외활동, 인턴십을 준비할 때 필요한 글쓰기, 제출, 일정 관리 가이드입니다.",
  alternates: { canonical: canonicalUrl("/guides") },
};

const FEATURED_ARTICLE = GUIDE_ARTICLES[0];

export default function GuidesPage() {
  const categories = Array.from(new Set(GUIDE_ARTICLES.map((article) => article.category)));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800">
            <BookOpenCheck className="h-3.5 w-3.5" />
            제출 전 준비 매거진
          </div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
            공고를 찾은 다음 필요한 준비를 이어서 확인하세요
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
            지원서 작성, 기획서 구조, 포트폴리오 정리, 마감 전 제출 점검까지 실제 지원 과정에서 반복되는 질문을 글로 정리했습니다.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Metric label="가이드" value={`${GUIDE_ARTICLES.length}개`} />
          <Metric label="주제" value={`${categories.length}개`} />
          <Metric label="체크" value="제출 전" />
        </div>
      </header>

      {FEATURED_ARTICLE && (
        <Link
          href={`/guide/${FEATURED_ARTICLE.slug}`}
          className="group mb-8 grid overflow-hidden rounded-lg border border-stone-200 bg-[#fffdf8] shadow-card transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-card-hover lg:grid-cols-[0.8fr_1.2fr]"
        >
          <div className="border-b border-stone-200 bg-zinc-950 p-6 text-white lg:border-b-0 lg:border-r">
            <p className="text-xs font-black uppercase tracking-widest text-amber-200">Start Here</p>
            <h2 className="mt-3 text-2xl font-black leading-tight">{FEATURED_ARTICLE.title}</h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-300">{FEATURED_ARTICLE.description}</p>
          </div>
          <div className="grid gap-3 p-6 sm:grid-cols-3">
            <GuidePoint icon={FileSearch} title="요강 읽기" text="지원 자격과 제출물을 먼저 분리합니다." />
            <GuidePoint icon={ListChecks} title="초안 작성" text="평가 기준에 맞춰 핵심 문장을 잡습니다." />
            <GuidePoint icon={Clock3} title="제출 점검" text="마감 시간 전에 파일과 링크를 확인합니다." />
          </div>
        </Link>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {categories.map((category) => (
          <span key={category} className="report-chip">
            {category}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {GUIDE_ARTICLES.map((article) => (
          <Link
            key={article.slug}
            href={`/guide/${article.slug}`}
            className="group report-panel p-5 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-card-hover"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-amber-700">
                <BookOpenCheck className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-zinc-400">
                  <span>{article.category}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {article.readingMinutes}분
                  </span>
                </div>
                <h2 className="mt-1 text-base font-black text-zinc-950 group-hover:text-amber-800">
                  {article.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-500">
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

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-card">
      <p className="text-[11px] font-black text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-black text-zinc-950">{value}</p>
    </div>
  );
}

function GuidePoint({
  icon: Icon,
  title,
  text,
}: {
  readonly icon: typeof FileSearch;
  readonly title: string;
  readonly text: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <Icon className="h-5 w-5 text-amber-700" />
      <p className="mt-3 text-sm font-black text-zinc-950">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{text}</p>
    </div>
  );
}
