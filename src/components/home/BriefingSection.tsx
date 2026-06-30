import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { briefingMockData } from "@/data/briefing";

export function BriefingSection() {
  return (
    <section id="briefing" className="py-10">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-amber-700">Briefing</p>
          <h2 className="mt-1 text-2xl font-black text-zinc-950">공모전 브리핑</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            새로 열린 공모전, 주최기관 소식, 준비 포인트를 공모전집 관점으로 정리합니다.
          </p>
        </div>
        <Link href="/#briefing" className="hidden text-sm font-bold text-amber-800 hover:text-amber-900 sm:inline-flex">
          전체 보기
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {briefingMockData.map((item) => (
          <Link key={item.id} href={item.href} className="group report-panel p-5 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-card-hover">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2.5 py-1 text-xs font-black text-zinc-700">
              <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
              {item.category}
            </span>
            <h3 className="mt-4 line-clamp-2 text-base font-black leading-snug text-zinc-950 group-hover:text-amber-800">
              {item.title}
            </h3>
            <p className="mt-3 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-zinc-600">
              {item.summary}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-zinc-500">
              {item.dateLabel}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
