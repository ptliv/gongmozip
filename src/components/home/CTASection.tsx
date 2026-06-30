import Link from "next/link";
import { ArrowRight, BookOpenCheck, FileSearch, ShieldCheck } from "lucide-react";

const TRUST_POINTS = [
  { label: "원문 기준", description: "공식 출처와 모집 요강을 우선 확인합니다.", icon: ShieldCheck },
  { label: "준비 연결", description: "공고별로 필요한 준비 가이드를 이어 봅니다.", icon: BookOpenCheck },
  { label: "검토 루틴", description: "마감 전 확인할 항목을 빠르게 점검합니다.", icon: FileSearch },
] as const;

export function CTASection() {
  return (
    <section className="py-12">
      <div className="report-panel overflow-hidden bg-[#fffdf8]">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-amber-700">Next Check</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-zinc-950 sm:text-3xl">
              오늘 지원할 공고를 고른 뒤, 제출 전 체크까지 이어가세요
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              목록에서 조건을 좁히고 상세 페이지에서 원문, 일정, 제출물, 준비 가이드를 함께 확인하는 흐름으로 구성했습니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/contests?sort=recommended" className="btn-primary">
                지원 가치순 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/guides" className="btn-secondary">
                준비 가이드
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {TRUST_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.label} className="rounded-lg border border-stone-200 bg-white p-4">
                  <Icon className="h-5 w-5 text-amber-700" />
                  <p className="mt-3 text-sm font-black text-zinc-950">{point.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{point.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
