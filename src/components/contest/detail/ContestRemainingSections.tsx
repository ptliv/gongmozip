import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Lightbulb,
  Trophy,
  Users,
} from "lucide-react";
import { highlightInline, renderHighlightedParagraphs } from "@/components/contest/detail/highlight";
import {
  FaqSection,
  MetadataSection,
  PlatformNotice,
  RelatedContests,
  RelatedGuides,
} from "@/components/contest/detail/ContestRelatedResources";
import type { GuideArticle } from "@/data/guides";
import type { ContestPrizeInfo } from "@/lib/prize";
import {
  benefitLabel,
  safeDateLabel,
  targetLabel,
} from "@/lib/contest-detail/preparation";
import type { ContestDetailPayload } from "@/lib/supabase/public-contest-queries";
import type { Contest } from "@/types/contest";

interface ContestRemainingSectionsProps {
  readonly contest: ContestDetailPayload;
  readonly prizeInfo: ContestPrizeInfo | null;
  readonly officialEnrichment: { readonly chars?: number; readonly lines: readonly string[] };
  readonly suitableFor: readonly string[];
  readonly strategyItems: readonly string[];
  readonly cautionItems: readonly string[];
  readonly preparationTips: readonly string[];
  readonly scheduleGuide: ReadonlyArray<{ readonly label: string; readonly text: string }>;
  readonly checklist: readonly string[];
  readonly faqItems: ReadonlyArray<{ readonly q: string; readonly a: string }>;
  readonly relatedGuides: readonly GuideArticle[];
  readonly metadataPairs: ReadonlyArray<{ readonly key: string; readonly value: string }>;
  readonly relatedItems: readonly Contest[];
  readonly applyUrl: string;
}

export function ContestRemainingSections({
  contest,
  prizeInfo,
  officialEnrichment,
  suitableFor,
  strategyItems,
  cautionItems,
  preparationTips,
  scheduleGuide,
  checklist,
  faqItems,
  relatedGuides,
  metadataPairs,
  relatedItems,
  applyUrl,
}: ContestRemainingSectionsProps) {
  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="report-panel p-5">
          <h2 className="text-lg font-black text-zinc-950">공고 요약</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            {highlightInline(contest.summary || `${contest.organizer}에서 진행하는 ${contest.type} 공고입니다.`)}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Fact label="주최기관" value={contest.organizer || "모집 요강 기준"} />
            <Fact label="지원 대상" value={targetLabel(contest)} />
            <Fact label="마감일" value={safeDateLabel(contest.apply_end_at)} />
            <Fact label="상금/혜택" value={benefitLabel(contest)} amber />
          </div>
        </div>

        <aside className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-sm font-black text-zinc-950">최신 모집 요강 확인</h3>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
            접수 전에는 주최 기관의 최신 안내에서 자격, 제출물, 마감 시간을 다시 확인하세요.
          </p>
          {applyUrl && (
            <a href={applyUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-amber-900">
              신청 링크 열기
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </aside>
      </section>

      {(prizeInfo || (contest.benefit?.types?.length ?? 0) > 0) && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-black text-zinc-950">
            <Trophy className="h-5 w-5 text-amber-700" />
            혜택 / 시상
          </h2>
          {prizeInfo && (
            <div className="mt-3">
              <p className="text-xs font-black uppercase text-amber-800">확인된 상금/혜택</p>
              <p className="mt-1 text-2xl font-black leading-tight text-amber-800">
                {prizeInfo.amountLabel ?? prizeInfo.text}
              </p>
              {prizeInfo.amountLabel && prizeInfo.text !== prizeInfo.amountLabel && (
                <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-700">{prizeInfo.text}</p>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {contest.benefit.types?.map((type) => (
              <span key={type} className="rounded-md border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900">
                {type}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="report-panel p-5">
        <h2 className="text-lg font-black text-zinc-950">지원 자격 / 안내</h2>
        {contest.eligibility_text ? (
          <div className="mt-3 text-sm leading-relaxed text-zinc-700">{renderHighlightedParagraphs(contest.eligibility_text)}</div>
        ) : (
          <div className="mt-3 space-y-3">
            {contest.normalized_targets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {contest.normalized_targets.map((target) => (
                  <span key={target} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800">
                    <Users className="h-3 w-3" />
                    {target}
                  </span>
                ))}
              </div>
            )}
            <p className="text-sm leading-relaxed text-zinc-600">
              지원 자격과 참가 방법은 최신 모집 요강 기준으로 확인하세요.
              {contest.online_offline ? ` 본 공고는 ${contest.online_offline} 방식으로 진행됩니다.` : ""}
              {contest.region && contest.region !== "무관" ? ` 참가 지역: ${contest.region}.` : ""}
            </p>
          </div>
        )}
      </section>

      <section className="report-panel p-5">
        <h2 className="mb-4 text-lg font-black text-zinc-950">지원 판단 가이드</h2>
        <div className="grid gap-5 lg:grid-cols-3">
          <GuideList title="적합한 사람" items={suitableFor} positive />
          <GuideList title="지원 전 확인사항" items={strategyItems} />
          <GuideList title="제출 전 유의사항" items={cautionItems} />
        </div>
      </section>

      <section className="report-panel p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-zinc-950">
              <ClipboardCheck className="h-5 w-5 text-amber-700" />
              지원 준비 가이드
            </h2>
            <p className="mt-1 text-sm text-zinc-500">공고 정보와 상세 안내를 바탕으로 제출 전 확인할 내용을 정리했습니다.</p>
          </div>
          <span className="report-chip">{officialEnrichment.chars ? "상세 본문 보강됨" : "상세 기준 요약"}</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <PrepBox icon={Lightbulb} title="준비 포인트" items={preparationTips} />
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-zinc-950">
              <Clock3 className="h-4 w-4 text-zinc-500" />
              일정 운영
            </h3>
            <div className="space-y-3">
              {scheduleGuide.map((step) => (
                <div key={step.label} className="flex gap-3">
                  <div className="w-16 flex-shrink-0 text-xs font-black text-zinc-500">{highlightInline(step.label)}</div>
                  <p className="text-sm leading-relaxed text-zinc-700">{highlightInline(step.text)}</p>
                </div>
              ))}
            </div>
          </div>
          <PrepBox icon={CheckCircle2} title="준비 서류 체크리스트" items={checklist} positive />
        </div>

        {officialEnrichment.lines.length > 0 && (
          <div className="mt-5 border-t border-stone-200 pt-4">
            <p className="mb-2 text-xs font-black text-zinc-500">주요 확인 항목</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {officialEnrichment.lines.map((line) => (
                <p key={line} className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-relaxed text-zinc-700">
                  {highlightInline(line)}
                </p>
              ))}
            </div>
          </div>
        )}
      </section>

      <FaqSection faqItems={faqItems} />
      <RelatedGuides guides={relatedGuides} />
      <MetadataSection items={metadataPairs} />
      <PlatformNotice applyUrl={applyUrl} title={contest.title} />
      <RelatedContests items={relatedItems} />
    </>
  );
}

function Fact({ label, value, amber = false }: { readonly label: string; readonly value: string; readonly amber?: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-3 ${amber ? "bg-amber-50" : "bg-stone-50"}`}>
      <p className={`text-xs font-black ${amber ? "text-amber-800" : "text-zinc-500"}`}>{label}</p>
      <p className={`mt-1 font-black ${amber ? "text-amber-800" : "text-zinc-950"}`}>{value}</p>
    </div>
  );
}

function GuideList({ title, items, positive = false }: { readonly title: string; readonly items: readonly string[]; readonly positive?: boolean }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-black text-zinc-950">{title}</h3>
      <ul className="space-y-2 text-sm leading-relaxed text-zinc-600">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            {positive ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" /> : <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />}
            <span>{highlightInline(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PrepBox({ icon: Icon, title, items, positive = false }: { readonly icon: typeof Lightbulb; readonly title: string; readonly items: readonly string[]; readonly positive?: boolean }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-zinc-950">
        <Icon className="h-4 w-4 text-amber-700" />
        {title}
      </h3>
      <ul className="space-y-2 text-sm leading-relaxed text-zinc-700">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            {positive ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" /> : <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />}
            <span>{highlightInline(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
