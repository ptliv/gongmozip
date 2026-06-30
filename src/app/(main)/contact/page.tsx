import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, MessageCircle } from "lucide-react";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "문의",
  description:
    "공모전집 공고 등록, 정보 수정, 광고·제휴, 개인정보 관련 문의는 info@gongmozip.com으로 보내주세요.",
  alternates: { canonical: canonicalUrl("/contact") },
};

const CONTACT_EMAIL = "info@gongmozip.com";
const KAKAO_CHANNEL_URL = "https://open.kakao.com/o/saBxtxki";

const INQUIRY_TYPES = [
  "공모전 공고 등록 문의",
  "공고 정보 수정 또는 삭제 요청",
  "서비스 오류 제보",
  "광고·제휴 문의",
  "개인정보 관련 문의",
] as const;

const FAQ = [
  {
    q: "공고 정보 수정이나 삭제를 요청할 수 있나요?",
    a: "네. 공고 URL, 수정이 필요한 항목, 요청 사유를 함께 보내주시면 운영자가 출처를 확인한 뒤 순차적으로 반영합니다.",
  },
  {
    q: "공고 등록이나 상단 노출 문의도 가능한가요?",
    a: "가능합니다. 기관명, 공고 제목, 모집 기간, 공식 링크, 포스터 이미지를 함께 보내주시면 검토가 빨라집니다.",
  },
  {
    q: "공모전집에서 바로 참가 신청을 받나요?",
    a: "공모전집은 공고 탐색과 준비 판단을 돕는 서비스입니다. 실제 접수 전에는 공식 모집 요강과 접수 조건을 반드시 확인해 주세요.",
  },
] as const;

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="mb-9">
        <p className="mb-3 inline-flex rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900">
          정보 수정 및 문의
        </p>
        <h1 className="text-3xl font-black text-zinc-950">문의</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          공고 등록, 정보 수정, 광고·제휴, 서비스 제안은 도메인 메일로 보내주세요. 운영자가 순차적으로 확인합니다.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-amber-200">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black text-zinc-950">이메일 문의</h2>
              <p className="text-xs font-semibold text-zinc-500">기본 문의 채널</p>
            </div>
          </div>
          <a
            href="mailto:info@gongmozip.com"
            className="mt-5 inline-flex items-center gap-2 text-xl font-black text-amber-800 hover:text-amber-900"
          >
            {CONTACT_EMAIL}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <ul className="mt-5 grid gap-2 text-sm text-zinc-600">
            {INQUIRY_TYPES.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <aside className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FEE500] text-[#3C1E1E]">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-black text-zinc-950">빠른 전달 채널</h2>
              <p className="text-xs font-semibold text-zinc-500">오픈채팅 보조 문의</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-zinc-700">
            이미지나 긴 설명을 보내야 하는 경우 오픈채팅을 함께 사용할 수 있습니다.
          </p>
          <a
            href={KAKAO_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-black text-[#3C1E1E] transition-colors hover:bg-yellow-300"
          >
            오픈채팅으로 문의하기
          </a>
        </aside>
      </section>

      <section className="mt-10 rounded-lg border border-stone-200 bg-[#fffdf8] p-6">
        <h2 className="text-lg font-black text-zinc-950">요청 시 함께 보내면 좋은 정보</h2>
        <ol className="mt-4 grid gap-2 text-sm leading-relaxed text-zinc-600 sm:grid-cols-2">
          <li>1. 공고 제목과 공식 링크</li>
          <li>2. 모집 기간과 주최/주관 기관</li>
          <li>3. 수정이 필요한 항목</li>
          <li>4. 포스터 이미지 또는 첨부 자료</li>
        </ol>
      </section>

      <section className="mt-10 grid gap-3">
        <h2 className="text-xl font-black text-zinc-950">자주 묻는 질문</h2>
        {FAQ.map((item) => (
          <details key={item.q} className="rounded-lg border border-stone-200 bg-white p-5">
            <summary className="cursor-pointer text-sm font-black text-zinc-900">{item.q}</summary>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{item.a}</p>
          </details>
        ))}
      </section>

      <section className="mt-10 flex flex-wrap gap-4 border-t border-stone-200 pt-6 text-sm font-semibold">
        <Link href="/privacy" className="text-zinc-500 transition-colors hover:text-amber-800">
          개인정보처리방침
        </Link>
        <Link href="/terms" className="text-zinc-500 transition-colors hover:text-amber-800">
          이용약관
        </Link>
        <Link href="/about" className="text-zinc-500 transition-colors hover:text-amber-800">
          서비스 소개
        </Link>
      </section>
    </div>
  );
}
