import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { fetchContests } from "@/lib/supabase/contests";

export const metadata: Metadata = {
  title: "AdSense Readiness Check",
  description: "Internal AdSense approval readiness checklist for operator review.",
  robots: { index: false, follow: false },
};

interface CheckItem {
  label: string;
  status: "pass" | "warn" | "info";
  note: string;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://gongmozip.com";

const STATIC_CHECKS: CheckItem[] = [
  // ── AdSense 기술 요건 ──────────────────────────────────────
  {
    label: "Google AdSense 스크립트",
    status: "pass",
    note: "RootLayout · next/script · strategy=afterInteractive · async · crossOrigin=anonymous · ca-pub-7242419267984081",
  },
  {
    label: "/adsense-readiness noindex",
    status: "pass",
    note: "robots: { index: false, follow: false } — 이 페이지는 색인 제외",
  },
  // ── 신뢰·정책 페이지 ────────────────────────────────────────
  {
    label: "/about 서비스 소개 페이지",
    status: "pass",
    note: "정적 페이지 · canonical 설정 · sitemap 포함 · 수집 방식·수정/삭제 요청 안내 포함",
  },
  {
    label: "/privacy 개인정보처리방침",
    status: "pass",
    note: "AdSense 쿠키 정책·Google 정책 링크 포함",
  },
  {
    label: "/terms 이용약관",
    status: "pass",
    note: "광고 조항·면책 조항 포함",
  },
  {
    label: "/contact 문의하기 (카카오톡 CTA)",
    status: "pass",
    note: "이메일 미노출 · 카카오톡 오픈채널 CTA · 수정/삭제 요청·서비스 문의·일반 문의 안내",
  },
  {
    label: "공개 이메일 주소 미노출",
    status: "pass",
    note: "공개 UI에 이메일 하드코딩 없음 · 문의는 카카오톡 채널로 통일",
  },
  // ── Footer / 탐색 ────────────────────────────────────────────
  {
    label: "Footer 신뢰 링크",
    status: "pass",
    note: "소개·개인정보·이용약관·문의 — 데스크톱 열 + 모바일 바 양쪽 노출",
  },
  // ── SEO / canonical ─────────────────────────────────────────
  {
    label: "canonical / metadataBase 도메인 일관성",
    status: "pass",
    note: "getSiteUrl() 유틸로 gongmozip.com 통일 · www 혼선 없음 · 상세·목록·정책 페이지 모두 적용",
  },
  {
    label: "robots.txt",
    status: "pass",
    note: "/admin, /adsense-readiness 크롤링 차단 · 공개 페이지 전체 허용",
  },
  {
    label: "sitemap.xml",
    status: "pass",
    note: "홈·목록·공고 상세·신뢰 4개 페이지 포함 · /adsense-readiness 제외",
  },
  // ── 콘텐츠 품질 ─────────────────────────────────────────────
  {
    label: "공고 상세 — 신청 플랫폼 안내 문구",
    status: "pass",
    note: "상세 하단에 '참가 신청은 각 공고의 공식 사이트에서 진행' 명시",
  },
  {
    label: "공고 상세 디버그 블록",
    status: "pass",
    note: "NEXT_PUBLIC_SHOW_DEBUG_FIELDS=true 일 때만 노출 (운영 기본 숨김)",
  },
  {
    label: "콘텐츠 충분성",
    status: "pass",
    note: "공고 상세 200개 이상 + 정책 4개 + 분야·유형·카테고리 페이지",
  },
  {
    label: "가짜 정보 / 허위 광고 없음",
    status: "pass",
    note: "실제 공개 데이터 기반 · 허위 리뷰·보증·주소·전화번호 없음",
  },
  {
    label: "회원가입 강제 없음",
    status: "pass",
    note: "모든 공개 페이지 로그인 없이 접근 가능",
  },
  {
    label: "모바일 반응형",
    status: "pass",
    note: "Tailwind 반응형 레이아웃 전체 적용",
  },
  {
    label: "HTTPS",
    status: "pass",
    note: "gongmozip.com — Vercel 자동 TLS",
  },
];

function Badge({ status }: { status: CheckItem["status"] }) {
  if (status === "pass") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> PASS
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle className="w-3 h-3" /> WARN
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
      INFO
    </span>
  );
}

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
              <Badge status={item.status} />
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
            "외부 원본 링크 클릭 후 정상 이동 여부 주기적 점검",
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
