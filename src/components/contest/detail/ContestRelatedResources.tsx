import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";
import { ContestCard } from "@/components/contest/ContestCard";
import { highlightInline } from "@/components/contest/detail/highlight";
import type { GuideArticle } from "@/data/guides";
import type { Contest } from "@/types/contest";

export function FaqSection({
  faqItems,
}: {
  readonly faqItems: ReadonlyArray<{ readonly q: string; readonly a: string }>;
}) {
  return (
    <section className="report-panel p-5">
      <h2 className="mb-4 text-lg font-black text-zinc-950">자주 묻는 질문</h2>
      <div className="divide-y divide-stone-200">
        {faqItems.map((item) => (
          <details key={item.q} className="group py-3 first:pt-0 last:pb-0">
            <summary className="cursor-pointer list-none text-sm font-black text-zinc-800 group-open:text-amber-800">
              {item.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{highlightInline(item.a)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function RelatedGuides({ guides }: { readonly guides: readonly GuideArticle[] }) {
  return (
    <section className="report-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-black text-zinc-950">
          <BookOpen className="h-5 w-5 text-emerald-700" />
          관련 준비 가이드
        </h2>
        <Link href="/guides" className="text-sm font-black text-amber-800">
          전체 가이드
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/guide/${guide.slug}`}
            className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 transition-colors hover:border-amber-300 hover:bg-amber-50"
          >
            <p className="text-xs font-black text-emerald-700">{guide.category}</p>
            <h3 className="mt-1 text-sm font-black text-zinc-950">{guide.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{guide.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function MetadataSection({
  items,
}: {
  readonly items: ReadonlyArray<{ readonly key: string; readonly value: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <section className="report-panel p-5">
      <h2 className="mb-4 text-lg font-black text-zinc-950">추가 정보</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.key} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-black text-zinc-500">{item.key}</p>
            <p className="mt-1 break-words text-sm text-zinc-700">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PlatformNotice({
  applyUrl,
  title,
}: {
  readonly applyUrl: string;
  readonly title: string;
}) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-zinc-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>
          공모전집은 공고 정보를 정리해 제공하는 플랫폼입니다.{" "}
          <strong className="text-zinc-950">참가 신청 전 최신 모집 요강과 접수 조건을 확인</strong>해 주세요.
          공고 정보 수정·삭제 요청은{" "}
          <Link href="/contact" className="font-black text-amber-900">
            문의 페이지
          </Link>
          를 이용해 주세요.
        </p>
        {applyUrl && (
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="btn-secondary min-h-10 shrink-0 px-4 py-2"
            aria-label={`${title} 신청 바로가기`}
          >
            <ExternalLink className="h-4 w-4" />
            신청 바로가기
          </a>
        )}
      </div>
    </section>
  );
}

export function RelatedContests({ items }: { readonly items: readonly Contest[] }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black text-zinc-950">비슷한 공고 추천</h2>
        <Link href="/contests" className="text-sm font-black text-amber-800">
          전체 보기
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center text-sm text-zinc-500">
          비슷한 공고가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ContestCard key={item.id} contest={item} />
          ))}
        </div>
      )}
    </section>
  );
}
