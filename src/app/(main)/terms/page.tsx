import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "이용약관",
  description: "공모전집 서비스 이용약관을 확인하세요. 서비스 이용 조건, 권리와 의무, 면책 사항을 안내합니다.",
  alternates: { canonical: canonicalUrl("/terms") },
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <header className="space-y-2 pb-6 border-b border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900">이용약관</h1>
        <p className="text-sm text-gray-400">최종 업데이트: 2025년 1월 1일 · 시행일: 2025년 1월 1일</p>
        <p className="text-sm text-gray-600 leading-relaxed">
          공모전집(이하 &apos;서비스&apos;)을 이용해 주셔서 감사합니다. 본 약관은 서비스 이용과 관련된
          조건과 절차를 정합니다. 서비스를 이용하시면 본 약관에 동의하신 것으로 간주합니다.
        </p>
      </header>

      <Article num={1} title="목적">
        <p>
          이 약관은 공모전집이 제공하는 공모전·대외활동·인턴십 정보 플랫폼 서비스(이하 &apos;서비스&apos;)의
          이용 조건 및 절차, 서비스 제공자와 이용자 간의 권리·의무·책임 사항을 규정함을 목적으로 합니다.
        </p>
      </Article>

      <Article num={2} title="서비스 내용">
        <p>서비스는 다음의 기능을 제공합니다.</p>
        <ul>
          <li>공모전, 대외활동, 인턴십, 봉사, 교육 관련 공고 정보 수집 및 제공</li>
          <li>분야·유형·마감일 기반 공고 검색 및 필터링</li>
          <li>마감 임박 공고 안내</li>
          <li>공고 북마크 (기기 내 로컬 저장)</li>
          <li>공고 상세 페이지 및 원본 출처 링크 제공</li>
        </ul>
        <p>
          서비스에서 제공되는 공고 정보는 공개된 외부 소스에서 수집·가공된 것으로, 원본 공고 기관이
          변경하거나 삭제한 정보가 즉시 반영되지 않을 수 있습니다. 중요한 사항은 반드시 원본 공고를 확인하시기 바랍니다.
        </p>
      </Article>

      <Article num={3} title="이용자의 의무">
        <p>이용자는 서비스를 이용함에 있어 다음 사항을 준수해야 합니다.</p>
        <ul>
          <li>관련 법령 및 본 약관을 준수해야 합니다.</li>
          <li>서비스의 정상적인 운영을 방해하는 행위를 해서는 안 됩니다.</li>
          <li>서비스의 콘텐츠를 무단으로 크롤링, 복제, 재배포해서는 안 됩니다.</li>
          <li>타인의 개인정보를 무단으로 수집하거나 이용해서는 안 됩니다.</li>
          <li>서비스를 이용하여 불법적인 행위를 해서는 안 됩니다.</li>
        </ul>
      </Article>

      <Article num={4} title="지식재산권">
        <p>
          서비스 내에서 제공되는 텍스트, UI 디자인, 로고 등의 저작권은 공모전집에 귀속됩니다.
          각 공고의 원본 내용에 대한 저작권은 해당 공고 기관에 귀속됩니다.
          이용자는 서비스 내 콘텐츠를 서비스 이용 목적에 한하여만 사용할 수 있으며,
          무단 복제·배포·수정은 금지됩니다.
        </p>
      </Article>

      <Article num={5} title="광고">
        <p>
          서비스는 운영 비용 충당을 위해 Google AdSense를 통한 광고를 게재할 수 있습니다.
          광고 내용과 서비스 제공 정보는 구분되며, 서비스는 광고 내용에 대한 책임을 지지 않습니다.
          광고 관련 쿠키 및 개인정보 처리에 관한 사항은 개인정보처리방침을 참조하시기 바랍니다.
        </p>
      </Article>

      <Article num={6} title="면책 조항">
        <p>서비스는 다음의 사항에 대해 책임을 지지 않습니다.</p>
        <ul>
          <li>공고 정보의 정확성, 완전성, 최신성에 대한 보증</li>
          <li>이용자가 공고 정보를 신뢰하여 입은 손해</li>
          <li>이용자 간 또는 이용자와 제3자 간의 분쟁</li>
          <li>천재지변, 서버 장애 등 불가항력적 사유로 인한 서비스 중단</li>
          <li>이용자의 귀책 사유로 발생한 손해</li>
          <li>외부 링크(원본 공고 사이트)의 내용 및 운영</li>
        </ul>
      </Article>

      <Article num={7} title="서비스 변경 및 중단">
        <p>
          서비스는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.
          서비스 변경 또는 중단 시 가능한 범위 내에서 사전에 공지합니다.
          다만, 긴급한 경우에는 사후에 공지할 수 있습니다.
        </p>
      </Article>

      <Article num={8} title="약관의 변경">
        <p>
          서비스는 관련 법령의 변경 또는 서비스 정책 변경에 따라 본 약관을 수정할 수 있습니다.
          약관이 변경되는 경우 서비스 내 공지를 통해 변경 내용을 안내하며, 변경 효력은 공지 후 7일이 경과한 날부터
          발생합니다. 변경된 약관에 동의하지 않으실 경우 서비스 이용을 중단하시기 바랍니다.
          변경 공지 이후에도 서비스를 계속 이용하시면 변경 약관에 동의한 것으로 간주됩니다.
        </p>
      </Article>

      <Article num={9} title="준거법 및 관할">
        <p>
          본 약관은 대한민국 법령에 따라 해석됩니다. 서비스 이용과 관련한 분쟁 발생 시
          대한민국 법원을 관할 법원으로 합니다.
        </p>
      </Article>

      <div className="border-t border-gray-100 pt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/privacy" className="text-gray-500 hover:text-blue-600 transition-colors">
          개인정보처리방침
        </Link>
        <Link href="/contact" className="text-gray-500 hover:text-blue-600 transition-colors">
          문의하기
        </Link>
        <Link href="/about" className="text-gray-500 hover:text-blue-600 transition-colors">
          서비스 소개
        </Link>
      </div>
    </div>
  );
}

function Article({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-gray-800">
        제{num}조 ({title})
      </h2>
      <div className="space-y-2 text-sm text-gray-600 leading-relaxed [&_ul]:space-y-1.5 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:pl-1">
        {children}
      </div>
    </section>
  );
}
