import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl } from "@/lib/seo";
import { MessageCircle, ChevronDown } from "lucide-react";

export const metadata: Metadata = {
  title: "문의",
  description:
    "서비스 관련 문의, 공고 정보 수정·삭제 요청, 서비스 제안은 카카오톡 채널로 전달해 주세요. 운영자가 순차적으로 확인합니다.",
  alternates: { canonical: canonicalUrl("/contact") },
};

const KAKAO_CHANNEL_URL = "https://open.kakao.com/o/saBxtxki";

const FAQ = [
  {
    q: "공모전 정보는 어떻게 수집되나요?",
    a: "캠퍼스픽 등 공개된 공모전 정보 사이트에서 데이터를 수집·가공하여 제공합니다. 원본 공고 출처는 각 상세 페이지에서 확인할 수 있습니다.",
  },
  {
    q: "공고 정보 수정이나 삭제를 요청할 수 있나요?",
    a: "네, 카카오톡 채널을 통해 수정 또는 삭제를 요청하실 수 있습니다. 해당 공고의 URL과 요청 내용을 함께 보내주시면 운영자가 순차적으로 확인 후 처리합니다.",
  },
  {
    q: "공고 정보가 잘못된 것 같아요.",
    a: "오류를 발견하신 경우 카카오톡 채널로 해당 공고의 URL과 함께 내용을 보내주시면 빠르게 수정하겠습니다.",
  },
  {
    q: "참가 신청은 어떻게 하나요?",
    a: "공모전집은 공고 정보를 모아서 보여주는 플랫폼입니다. 실제 참가 신청은 각 공고 상세 페이지에 안내된 공식 사이트에서 직접 진행해 주세요.",
  },
  {
    q: "서비스 제안이나 광고·제휴 문의는 어떻게 하나요?",
    a: "카카오톡 채널로 제안 내용을 보내주시면 운영자가 확인 후 검토합니다. 구체적인 내용과 함께 문의해 주시면 더욱 빠르게 답변드릴 수 있습니다.",
  },
  {
    q: "개인정보 관련 문의나 삭제 요청은 어떻게 하나요?",
    a: "개인정보 관련 요청은 카카오톡 채널로 문의해 주세요. 관련 법령에 따라 신속하게 처리해 드립니다. 자세한 내용은 개인정보처리방침을 참고하세요.",
  },
];

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">문의</h1>
        <p className="text-gray-500 text-sm">
          서비스 관련 문의, 정보 수정 요청, 제안 사항은 카카오톡 채널로 전달할 수 있습니다.
        </p>
      </header>

      {/* 카카오톡 문의 카드 */}
      <section className="rounded-2xl border border-yellow-200 bg-yellow-50/50 p-7 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEE500] flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-[#3C1E1E]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">카카오톡 채널 문의</h2>
            <p className="text-xs text-gray-500 mt-0.5">운영자가 순차적으로 확인합니다</p>
          </div>
        </div>

        <ul className="space-y-1.5 text-sm text-gray-600">
          {[
            "공모전 공고 정보 수정 / 삭제 요청",
            "서비스 문의 및 오류 제보",
            "서비스 제안 및 광고·제휴 문의",
            "일반 문의",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <div className="pt-1 space-y-3">
          <a
            href={KAKAO_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FEE500] text-[#3C1E1E] text-sm font-bold hover:bg-yellow-300 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            카카오톡 채널로 문의하기
          </a>
          <p className="text-xs text-gray-400">
            ※ 참가 신청은 각 공고의 공식 사이트에서 직접 진행해 주세요.
          </p>
        </div>
      </section>

      {/* 수정/삭제 요청 안내 */}
      <section className="rounded-2xl border border-gray-100 bg-gray-50 p-6 space-y-3">
        <h2 className="text-base font-bold text-gray-900">수정·삭제 요청 방법</h2>
        <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
          <li>위 카카오톡 채널 버튼을 클릭합니다.</li>
          <li>수정 또는 삭제가 필요한 공고의 URL을 복사합니다.</li>
          <li>요청 내용(수정할 항목 또는 삭제 사유)과 함께 메시지를 보냅니다.</li>
          <li>운영자가 확인 후 순차적으로 처리합니다.</li>
        </ol>
      </section>

      {/* FAQ */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">자주 묻는 질문</h2>
        <div className="space-y-2">
          {FAQ.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-xl border border-gray-100 bg-white overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-3 cursor-pointer px-5 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors list-none">
                {q}
                <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
              </summary>
              <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
                {a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* 정책 링크 */}
      <section className="border-t border-gray-100 pt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/privacy" className="text-gray-500 hover:text-blue-600 transition-colors">
          개인정보처리방침
        </Link>
        <Link href="/terms" className="text-gray-500 hover:text-blue-600 transition-colors">
          이용약관
        </Link>
        <Link href="/about" className="text-gray-500 hover:text-blue-600 transition-colors">
          서비스 소개
        </Link>
      </section>
    </div>
  );
}
