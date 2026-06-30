import Link from "next/link";
import { ArrowRight, Clock3, Gift, ShieldCheck, Sparkles } from "lucide-react";

const QUICK_CARDS = [
  {
    title: "추천순",
    description: "지원 가치, 마감 여유, 포트폴리오 활용도를 함께 본 공고부터 확인하세요.",
    href: "/contests?sort=recommended",
    icon: Sparkles,
  },
  {
    title: "마감임박순",
    description: "제출 일정이 가까운 공고를 먼저 확인하고 준비 가능 여부를 빠르게 판단하세요.",
    href: "/contests?sort=deadline",
    icon: Clock3,
  },
  {
    title: "공식 출처",
    description: "접수 전 상세 페이지의 공식 링크에서 제출 조건과 시간을 다시 확인하세요.",
    href: "/about",
    icon: ShieldCheck,
  },
  {
    title: "상금 높은 공모전",
    description: "상금이나 혜택이 큰 공고를 따로 모아 비교하세요.",
    href: "/contests?q=상금&sort=recommended",
    icon: Gift,
  },
] as const;

export function QuickExploreCards() {
  return (
    <section className="flex gap-3 overflow-x-auto py-6 scrollbar-hide sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
      {QUICK_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.title}
            href={card.href}
            className="group report-panel min-w-[16rem] p-4 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-card-hover sm:min-w-0"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 group-hover:bg-amber-100 group-hover:text-amber-800">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-black text-zinc-950">{card.title}</h2>
            <p className="mt-2 min-h-[3rem] text-xs leading-relaxed text-zinc-500">{card.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-amber-800">
              바로 보기
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </Link>
        );
      })}
    </section>
  );
}
