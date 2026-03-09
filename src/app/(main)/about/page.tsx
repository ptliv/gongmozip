import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl } from "@/lib/seo";
import { Search, Bell, Bookmark, LayoutGrid } from "lucide-react";

export const metadata: Metadata = {
  title: "서비스 소개",
  description:
    "공모전집은 대학생과 청년을 위한 공모전·대외활동·인턴십 정보 통합 플랫폼입니다. 흩어진 공고를 한곳에서 탐색하세요.",
  alternates: { canonical: canonicalUrl("/about") },
  openGraph: {
    title: "서비스 소개 | 공모전집",
    description:
      "공모전집은 대학생과 청년을 위한 공모전·대외활동·인턴십 정보 통합 플랫폼입니다.",
    url: canonicalUrl("/about"),
  },
};

const FEATURES = [
  {
    icon: Search,
    title: "통합 검색",
    desc: "공모전·대외활동·인턴십 공고를 분야, 유형, 마감일로 빠르게 필터링하세요.",
  },
  {
    icon: Bell,
    title: "마감 임박 알림",
    desc: "D-7, D-3 이내로 마감되는 공고를 한눈에 확인해 기회를 놓치지 마세요.",
  },
  {
    icon: Bookmark,
    title: "북마크",
    desc: "관심 공고를 저장해두고 언제든지 다시 확인할 수 있습니다.",
  },
  {
    icon: LayoutGrid,
    title: "분야별 탐색",
    desc: "IT·테크, 디자인, 마케팅, 사회·환경 등 다양한 분야별로 공고를 탐색하세요.",
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      {/* Hero */}
      <header className="space-y-4">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
          공모전집 소개
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
          청년의 성장을 돕는<br />
          <span className="text-blue-600">공모전·대외활동 플랫폼</span>
        </h1>
        <p className="text-base text-gray-600 leading-relaxed max-w-xl">
          공모전집은 대학생과 청년을 위한 공모전·대외활동·인턴십 정보 통합 플랫폼입니다.
          여러 사이트에 흩어진 공고를 한곳에 모아, 원하는 공고를 빠르게 찾을 수 있도록 돕습니다.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/contests"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            공고 검색하기
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            문의하기
          </Link>
        </div>
      </header>

      {/* 주요 기능 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">주요 기능</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-100 bg-white p-5 space-y-2 shadow-sm"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 대상 사용자 */}
      <section className="rounded-2xl border border-gray-100 bg-gray-50 p-6 space-y-3">
        <h2 className="text-xl font-bold text-gray-900">이런 분께 추천합니다</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          {[
            "다양한 공모전 수상 경력을 쌓고 싶은 대학생",
            "대외활동으로 역량을 키우고 싶은 청년",
            "인턴십으로 실무 경험을 쌓고 싶은 취업 준비생",
            "IT·디자인·마케팅 분야 공고를 찾고 있는 개발자·디자이너",
            "마감이 임박한 공고를 빠르게 확인하고 싶은 분",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* 정보 수집 방식 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-gray-900">정보 수집 방식</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          공모전집은 캠퍼스픽 등 공개된 공모전·대외활동 정보 플랫폼의 공개 데이터를 수집·가공하여
          제공합니다. 각 공고의 원본 출처는 상세 페이지에서 확인할 수 있으며, 중요한 내용은 반드시
          원본 공고를 확인하시기 바랍니다.
        </p>
        <p className="text-sm text-gray-500">
          공고 정보의 정확성을 위해 최선을 다하고 있으나, 원본 공고 기관의 변경 사항이 즉시 반영되지
          않을 수 있습니다.
        </p>
      </section>

      {/* 수정·삭제 요청 안내 */}
      <section className="rounded-2xl border border-gray-100 bg-gray-50 p-6 space-y-2">
        <h2 className="text-base font-bold text-gray-900">공고 정보 수정·삭제 요청</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          공고 내용이 잘못되었거나 삭제가 필요한 경우, 카카오톡 채널을 통해 요청하실 수 있습니다.
          해당 공고의 URL과 요청 내용을 함께 보내주시면 운영자가 순차적으로 확인 후 처리합니다.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-[#FEE500] text-[#3C1E1E] text-sm font-bold hover:bg-yellow-300 transition-colors"
        >
          카카오톡으로 수정·삭제 요청하기
        </Link>
      </section>

      {/* 정책 링크 */}
      <section className="border-t border-gray-100 pt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/privacy" className="text-gray-500 hover:text-blue-600 transition-colors">
          개인정보처리방침
        </Link>
        <Link href="/terms" className="text-gray-500 hover:text-blue-600 transition-colors">
          이용약관
        </Link>
        <Link href="/contact" className="text-gray-500 hover:text-blue-600 transition-colors">
          문의하기
        </Link>
      </section>
    </div>
  );
}
