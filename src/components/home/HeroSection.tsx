import { POPULAR_TYPES } from "@/components/ui/CategoryChip";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-violet-950 text-white">
      {/* 배경 장식 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-3xl translate-x-1/3 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-3xl -translate-x-1/3 translate-y-1/2" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.06)_0%,transparent_70%)]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-2xl mx-auto text-center">
          {/* 상단 뱃지 */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-blue-200 mb-7 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            공모전·대외활동 정보 플랫폼
          </div>

          {/* 헤드라인 */}
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight mb-4">
            당신의 다음 도전을
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-300 to-violet-400">
              여기서 시작하세요
            </span>
          </h1>

          <p className="text-sm sm:text-base text-blue-200/70 mb-9 leading-relaxed">
            공모전, 대외활동, 인턴십까지
            <br className="sm:hidden" /> 한곳에서 찾고 지원하세요.
          </p>

          {/* 검색창 */}
          <div className="max-w-xl mx-auto mb-6">
            <form action="/contests" className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                name="q"
                type="search"
                placeholder="삼성, 마케팅, 디자인으로 검색..."
                className="h-14 w-full rounded-2xl border border-gray-200 bg-white/95 pl-12 pr-4 text-base text-gray-900 shadow-lg transition-all duration-150 placeholder:text-gray-400 hover:border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </form>
          </div>

          {/* 인기 유형 칩 */}
          <div className="flex flex-wrap justify-center gap-2 items-center">
            <span className="text-xs text-blue-300/60 font-medium">인기:</span>
            {POPULAR_TYPES.map((t) => (
              <Link
                key={t.label}
                href={`/contests?type=${t.label}`}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/8 border border-white/12 text-xs text-blue-100 hover:bg-white/15 hover:border-white/20 active:scale-95 transition-all duration-150 backdrop-blur-sm"
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 통계 */}
        <div className="flex flex-wrap justify-center gap-10 mt-14 pt-8 border-t border-white/10">
          {[
            { value: "200+", label: "누적 공고" },
            { value: "8개", label: "활동 유형" },
            { value: "매일", label: "업데이트" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-black text-white tracking-tight">{stat.value}</div>
              <div className="text-xs text-blue-300/60 mt-1 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
