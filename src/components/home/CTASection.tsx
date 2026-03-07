import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700 p-8 sm:p-12 text-white">
        {/* 배경 장식 */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4 pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-violet-400/10 blur-2xl pointer-events-none" />

        <div className="relative max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-blue-100 mb-5 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5" />
            지금 바로 찾아보세요
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 leading-snug">
            원하는 공고를
            <br />
            지금 바로 찾아보세요
          </h2>
          <p className="text-blue-200 text-sm sm:text-base leading-relaxed mb-7">
            다양한 필터와 검색으로 나에게 맞는
            <br className="hidden sm:block" />
            공모전·대외활동을 빠르게 찾을 수 있습니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/contests"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-blue-700 text-sm font-bold hover:bg-blue-50 active:scale-95 transition-all shadow-sm"
            >
              공고 전체 보기
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contests?sort=deadline"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 border border-white/20 text-white text-sm font-semibold hover:bg-white/25 active:scale-95 transition-all backdrop-blur-sm"
            >
              마감 임박 공고
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
