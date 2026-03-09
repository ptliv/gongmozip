import Link from "next/link";
import { Trophy } from "lucide-react";

const TRUST_LINKS = [
  { label: "소개", href: "/about" },
  { label: "개인정보처리방침", href: "/privacy" },
  { label: "이용약관", href: "/terms" },
  { label: "문의", href: "/contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50/50 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-sm group-hover:shadow-blue-glow transition-all duration-200">
                <Trophy className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-[0.9375rem]">
                공모전<span className="text-blue-600">집</span>
              </span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed max-w-[260px]">
              공모전, 대외활동, 인턴십 정보를 한곳에서.
              <br />당신의 성장을 응원합니다.
            </p>
          </div>

          {/* 공고 링크 */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
              공고
            </h4>
            <ul className="space-y-2.5">
              {["공모전", "대외활동", "인턴십", "봉사", "교육"].map((cat) => (
                <li key={cat}>
                  <Link
                    href={`/contests?type=${cat}`}
                    className="text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 서비스 링크 */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
              서비스
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "공고 검색", href: "/contests" },
                { label: "마감 임박", href: "/deadline-soon" },
                { label: "최신 공고", href: "/latest" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 정보 링크 */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
              정보
            </h4>
            <ul className="space-y-2.5">
              {TRUST_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 하단 바 — 모바일에서도 신뢰 링크 노출 */}
        <div className="border-t border-gray-200 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            © 2025 공모전집. All rights reserved.
          </p>
          <nav aria-label="정책 링크" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {TRUST_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
