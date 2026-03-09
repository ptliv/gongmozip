import Link from "next/link";
import { Trophy } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50/50 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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
                { label: "마감 임박", href: "/deadline" },
                { label: "최신 공고", href: "/contests?sort=latest" },
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
        </div>

        <div className="border-t border-gray-200 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            © 2025 공모전집. All rights reserved.
          </p>
          <p className="text-xs text-gray-400">
            공모전·대외활동 정보 플랫폼
          </p>
        </div>
      </div>
    </footer>
  );
}
