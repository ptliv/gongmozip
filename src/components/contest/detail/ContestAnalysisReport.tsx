import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Gauge,
  Gift,
  Sparkles,
  Users,
} from "lucide-react";
import type { AnalysisTone, PublicContestAnalysis } from "@/lib/contest-analysis";

interface ContestAnalysisReportProps {
  readonly analysis: PublicContestAnalysis;
}

const TONE_CLASSES: Record<AnalysisTone, { card: string; icon: string; value: string }> = {
  blue: {
    card: "border-sky-200 bg-sky-50",
    icon: "bg-sky-100 text-sky-700",
    value: "text-sky-800",
  },
  emerald: {
    card: "border-emerald-200 bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-800",
  },
  amber: {
    card: "border-amber-200 bg-amber-50",
    icon: "bg-amber-100 text-amber-700",
    value: "text-amber-800",
  },
  rose: {
    card: "border-rose-200 bg-rose-50",
    icon: "bg-rose-100 text-rose-700",
    value: "text-rose-800",
  },
  violet: {
    card: "border-stone-200 bg-stone-50",
    icon: "bg-stone-100 text-zinc-700",
    value: "text-zinc-800",
  },
  gray: {
    card: "border-stone-200 bg-stone-50",
    icon: "bg-stone-100 text-zinc-600",
    value: "text-zinc-800",
  },
};

export function ContestAnalysisReport({ analysis }: ContestAnalysisReportProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-black text-zinc-950">
          <Sparkles className="h-5 w-5 text-amber-700" />
          공모전집 분석 리포트
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          공고 내용, 마감일, 혜택, 준비 난이도, 포트폴리오 활용도를 종합해 지원 판단 기준을 정리했습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {analysis.metrics.map((metric) => {
          const Icon = getAnalysisIcon(metric.label);
          const tone = TONE_CLASSES[metric.tone];
          return (
            <article key={metric.label} className={`rounded-lg border p-4 ${tone.card}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-zinc-500">{metric.label}</p>
                  <p className={`mt-1 text-xl font-black ${tone.value}`}>{metric.value}</p>
                </div>
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${tone.icon}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-600">{metric.description}</p>
            </article>
          );
        })}
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
        <p className="text-sm leading-relaxed text-zinc-700">{analysis.summary}</p>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          {analysis.actionItems.map((item) => (
            <p key={item} className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-relaxed text-zinc-600">
              {item}
            </p>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-stone-200 pt-5 lg:grid-cols-3">
          <ReportList title="추천 대상" items={analysis.recommendedTargets} positive />
          <ReportList title="주의할 점" items={analysis.cautions} />
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="mb-2 text-sm font-black text-zinc-950">한줄 판단</h3>
            <p className="text-sm leading-relaxed text-zinc-700">{analysis.verdict}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportList({
  title,
  items,
  positive = false,
}: {
  readonly title: string;
  readonly items: readonly string[];
  readonly positive?: boolean;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-black text-zinc-950">{title}</h3>
      <ul className="space-y-2 text-sm leading-relaxed text-zinc-600">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            {positive ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" />
            ) : (
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getAnalysisIcon(label: string) {
  switch (label) {
    case "지원 가치 점수":
    case "추천도":
      return Sparkles;
    case "지원 난이도":
    case "준비 난이도":
      return Gauge;
    case "예상 준비 기간":
    case "마감 위험도":
    case "마감 긴급도":
      return Clock3;
    case "초보자 적합도":
      return Users;
    case "포트폴리오 활용도":
      return ClipboardCheck;
    case "혜택 명확도":
      return Gift;
    default:
      return CheckCircle2;
  }
}
