import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { GUIDE_ARTICLES } from "@/data/guides";

const FEATURED_GUIDES = GUIDE_ARTICLES.slice(0, 6);

const FAQS = [
  {
    q: "공모전집은 어떻게 활용하면 좋나요?",
    a: "먼저 유형과 분야 필터로 후보를 줄이고, 추천도와 마감일을 함께 보며 지원 우선순위를 정하는 방식이 좋습니다.",
  },
  {
    q: "마감 임박 공고는 어떤 기준인가요?",
    a: "현재 날짜 기준으로 마감일이 남아 있는 공고만 공개하고, 7일 이내 마감 공고는 별도 페이지에서 확인할 수 있습니다.",
  },
  {
    q: "공고 정보가 다르게 보이면 어떻게 하나요?",
    a: "상세 페이지의 안내를 참고하되 접수 전에는 최신 모집 요강의 제출 조건과 접수 시간을 확인해 주세요.",
  },
];

export function GuideSection() {
  return (
    <section className="py-12 border-t border-gray-100">
      <div className="section-header">
        <div className="section-title">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">공모전·대외활동 준비 가이드</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">지원서, 기획서, 제출 전 점검까지 함께 준비하세요</p>
          </div>
        </div>
        <Link
          href="/guides"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors group"
        >
          전체보기
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURED_GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-card-hover"
            >
              <p className="text-[11px] font-bold text-blue-600">{guide.category}</p>
              <h3 className="mt-1 text-sm font-bold text-gray-900 group-hover:text-blue-700">
                {guide.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">
                {guide.description}
              </p>
            </Link>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">공고 확인 시 주의사항</h3>
            <ul className="space-y-2 text-sm leading-relaxed text-gray-600">
              {[
                "마감일뿐 아니라 접수 종료 시간을 함께 확인하세요.",
                "상금과 활동비는 지급 조건과 제외 조건을 같이 보세요.",
                "팀 지원은 대표자 정보와 팀원 동의가 필요한지 확인하세요.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-bold text-gray-900 mb-2">자주 묻는 질문</h3>
            <div className="space-y-3">
              {FAQS.map((faq) => (
                <div key={faq.q}>
                  <p className="text-sm font-semibold text-gray-800">{faq.q}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
