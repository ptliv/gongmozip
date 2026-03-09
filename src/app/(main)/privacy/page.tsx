import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "공모전집의 개인정보처리방침을 확인하세요. 수집 정보, 이용 목적, 쿠키 및 광고 정책을 안내합니다.",
  alternates: { canonical: canonicalUrl("/privacy") },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <header className="space-y-2 pb-6 border-b border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900">개인정보처리방침</h1>
        <p className="text-sm text-gray-400">최종 업데이트: 2025년 1월 1일 · 시행일: 2025년 1월 1일</p>
        <p className="text-sm text-gray-600 leading-relaxed">
          공모전집(이하 &apos;서비스&apos;)은 이용자의 개인정보를 소중하게 생각합니다. 본 방침은
          서비스 이용 과정에서 수집·이용·보관·파기되는 개인정보에 관한 사항을 안내합니다.
        </p>
      </header>

      <Section title="1. 수집하는 개인정보 항목">
        <p>서비스는 별도의 회원가입 없이 이용 가능하며, 다음과 같은 정보가 자동으로 수집될 수 있습니다.</p>
        <ul>
          <li><b>자동 수집 정보:</b> 접속 IP, 브라우저 종류, 운영체제, 방문 일시, 서비스 이용 기록</li>
          <li><b>로컬 저장소 기반 정보:</b> 북마크 공고 목록 (기기 내 저장, 서버 미전송)</li>
          <li><b>쿠키:</b> 서비스 이용 편의를 위한 쿠키 및 광고 쿠키(Google AdSense)</li>
        </ul>
        <p>
          서비스는 회원 가입, 로그인, 또는 개인 식별이 가능한 별도 정보를 수집하지 않습니다.
          관리자 기능을 제외한 일반 이용자로부터 성명·연락처·이메일 등을 수집하지 않습니다.
        </p>
      </Section>

      <Section title="2. 개인정보 수집 및 이용 목적">
        <ul>
          <li>서비스 제공 및 정상 운영</li>
          <li>서비스 이용 통계 분석 및 품질 개선</li>
          <li>맞춤형 광고 제공 (Google AdSense 기반)</li>
          <li>오류 탐지 및 보안 유지</li>
        </ul>
      </Section>

      <Section title="3. 쿠키(Cookie) 및 유사 기술">
        <p>
          서비스는 이용 편의성 향상 및 광고 게재를 위해 쿠키를 사용합니다.
          쿠키는 웹브라우저에 저장되는 소량의 데이터 파일입니다.
        </p>
        <ul>
          <li>
            <b>서비스 운영 쿠키:</b> 서비스 정상 동작에 필요한 필수 쿠키
          </li>
          <li>
            <b>분석 쿠키:</b> 서비스 이용 패턴 분석을 위한 통계용 쿠키
          </li>
          <li>
            <b>광고 쿠키:</b> Google AdSense가 관심 기반 맞춤 광고를 제공하기 위해 사용하는 쿠키
          </li>
        </ul>
        <p>
          브라우저 설정에서 쿠키를 거부하거나 삭제할 수 있습니다. 단, 일부 기능이 제한될 수 있습니다.
        </p>
      </Section>

      <Section title="4. Google AdSense 및 제3자 광고">
        <p>
          서비스는 Google AdSense를 통해 광고를 게재합니다. Google은 서비스 이용 정보와 쿠키를 바탕으로
          사용자 관심사에 맞는 광고를 표시할 수 있습니다.
        </p>
        <ul>
          <li>
            Google의 개인정보처리방침:{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              policies.google.com/privacy
            </a>
          </li>
          <li>
            맞춤 광고 비활성화:{" "}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              adssettings.google.com
            </a>
          </li>
        </ul>
      </Section>

      <Section title="5. 개인정보 보유 및 파기">
        <p>
          자동 수집된 접속 로그 등의 정보는 서비스 운영 목적 달성 후 또는 관련 법령에서 정한 기간이
          경과한 후 지체 없이 파기합니다.
        </p>
        <ul>
          <li>접속 로그 기록: 통신비밀보호법에 따라 3개월 보관 후 파기</li>
          <li>로컬 저장소 데이터: 이용자 기기에서 직접 삭제 가능</li>
        </ul>
      </Section>

      <Section title="6. 이용자의 권리">
        <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
        <ul>
          <li>개인정보 처리 현황 열람 요청</li>
          <li>개인정보 삭제 및 처리 정지 요청</li>
          <li>광고 쿠키 비활성화 (브라우저 설정 또는 Google 광고 설정 이용)</li>
          <li>북마크 데이터 삭제 (브라우저 로컬 스토리지 직접 삭제)</li>
        </ul>
      </Section>

      <Section title="7. 개인정보 보호책임자 및 문의">
        <p>
          개인정보 처리에 관한 문의, 열람·정정·삭제·처리 정지 요청은 아래 연락처로 문의해 주세요.
        </p>
        <ul>
          <li><b>서비스명:</b> 공모전집 (Gongmozip)</li>
          <li>
            <b>문의:</b>{" "}
            <Link href="/contact" className="text-blue-600 hover:underline">
              문의하기 페이지
            </Link>
          </li>
        </ul>
        <p>문의 접수 후 영업일 기준 5일 이내에 답변드립니다.</p>
      </Section>

      <Section title="8. 방침 변경">
        <p>
          본 개인정보처리방침은 법령·정책 변경 또는 서비스 변경에 따라 수정될 수 있습니다.
          변경 시 서비스 내 공지사항을 통해 안내하며, 중요한 변경의 경우 7일 이상 사전 공지합니다.
        </p>
      </Section>

      <div className="border-t border-gray-100 pt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/terms" className="text-gray-500 hover:text-blue-600 transition-colors">
          이용약관
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      <div className="space-y-2 text-sm text-gray-600 leading-relaxed [&_ul]:space-y-1.5 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:pl-1 [&_b]:font-semibold [&_b]:text-gray-800">
        {children}
      </div>
    </section>
  );
}
