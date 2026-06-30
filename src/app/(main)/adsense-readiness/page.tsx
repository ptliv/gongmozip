import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { ReadinessBadge } from "./ReadinessBadge";
import { STATIC_CHECKS } from "./readiness-checks";
import { fetchContests } from "@/lib/supabase/contests";
import { getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "AdSense Readiness Check",
  description: "Internal AdSense approval readiness checklist for operator review.",
  robots: { index: false, follow: false },
};

const SITE_URL = getSiteUrl();

export default async function AdsenseReadinessPage() {
  const contests = await fetchContests().catch(() => []);
  const sampleContests = contests.slice(0, 3);

  const passCount = STATIC_CHECKS.filter((c) => c.status === "pass").length;
  const warnCount = STATIC_CHECKS.filter((c) => c.status === "warn").length;
  const allPass = warnCount === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
            OPERATOR ONLY · NOINDEX
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AdSense Readiness Check</h1>
          <p className="text-sm text-gray-500">
            사이트:{" "}
            <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {SITE_URL}
            </a>
          </p>
        </div>
        <div className={`rounded-2xl px-5 py-3 text-center ${allPass ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
          <p className={`text-2xl font-bold ${allPass ? "text-emerald-700" : "text-amber-700"}`}>
            {passCount}/{STATIC_CHECKS.length}
          </p>
          <p className={`text-xs font-semibold ${allPass ? "text-emerald-600" : "text-amber-600"}`}>
            {allPass ? "전체 통과" : `경고 ${warnCount}개`}
          </p>
        </div>
      </div>

      {/* 체크리스트 */}
      <section className="space-y-2">
        <h2 className="text-base font-bold text-gray-800">체크리스트</h2>
        <div className="rounded-2xl border border-gray-100 bg-white divide-y divide-gray-50 overflow-hidden shadow-sm">
          {STATIC_CHECKS.map((item) => (
            <div key={item.label} className="flex items-start gap-3 px-5 py-3.5">
              <ReadinessBadge status={item.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 신뢰 페이지 링크 */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-800">신뢰·정책 페이지</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "서비스 소개", href: "/about" },
            { label: "개인정보처리방침", href: "/privacy" },
            { label: "이용약관", href: "/terms" },
            { label: "문의하기", href: "/contact" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target="_blank"
              className="flex items-center justify-between gap-1.5 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:border-blue-200 hover:text-blue-700 transition-colors shadow-sm"
            >
              {link.label}
              <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* 주요 페이지 */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-800">주요 콘텐츠 페이지</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "홈", href: "/" },
            { label: "공고 목록", href: "/contests" },
            { label: "마감 임박", href: "/deadline-soon" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target="_blank"
              className="flex items-center justify-between gap-1.5 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:border-blue-200 hover:text-blue-700 transition-colors shadow-sm"
            >
              {link.label}
              <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* 샘플 공고 */}
      {sampleContests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-800">
            샘플 공고 상세 ({contests.length}개 중 3개)
          </h2>
          <div className="rounded-2xl border border-gray-100 bg-white divide-y divide-gray-50 overflow-hidden shadow-sm">
            {sampleContests.map((c) => (
              <Link
                key={c.id}
                href={`/contests/${c.slug}`}
                target="_blank"
                className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-700">
                    {c.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate">/contests/{c.slug}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 시스템 링크 */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-800">시스템 파일</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "robots.txt", href: "/robots.txt", expect: "/admin 차단 확인" },
            { label: "ads.txt", href: "/ads.txt", expect: "AdSense 게시자 ID 확인" },
            { label: "sitemap.xml", href: "/sitemap.xml", expect: "공개 페이지 포함 확인" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-gray-100 bg-white px-5 py-4 space-y-1 hover:border-blue-200 transition-colors shadow-sm block"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500">{item.expect}</p>
            </a>
          ))}
        </div>
      </section>

      {/* 남은 리스크 */}
      <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5 space-y-3">
        <h2 className="text-base font-bold text-amber-800">AdSense 심사 유의 사항</h2>
        <ul className="space-y-2 text-sm text-amber-900">
          {[
            "콘텐츠가 충분히 독창적이고 가치 있는지 확인 — 단순 크롤링 나열보다 요약·필터 등 부가 가치 제공 필요",
            "광고가 콘텐츠보다 많거나 페이지 구성을 해치지 않도록 유지",
            "접수 조건·일정·제출 방식이 최신 안내와 맞는지 주기적 점검",
            "개인정보처리방침·이용약관이 실제 서비스와 일치하는지 정기 검토",
            "AdSense 정책 위반 콘텐츠(도박·성인·저작권 위반 등) 공고가 포함되지 않도록 모니터링",
          ].map((risk) => (
            <li key={risk} className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              {risk}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
