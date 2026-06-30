import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, FileSearch, Search, ShieldCheck } from "lucide-react";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "서비스 소개",
  description:
    "공모전집은 공모전·대외활동·인턴십 정보를 원문, 일정, 혜택, 준비 난이도 기준으로 정리하는 공고 탐색 서비스입니다.",
  alternates: { canonical: canonicalUrl("/about") },
  openGraph: {
    title: "서비스 소개 | 공모전집",
    description: "공모전집은 공고 원문과 준비 기준을 함께 정리해 지원 판단을 돕습니다.",
    url: canonicalUrl("/about"),
  },
};

const OPERATING_STANDARDS = [
  {
    icon: ShieldCheck,
    title: "공식 출처 우선",
    text: "공고의 공식 모집 페이지, 주최 기관, 접수 링크를 우선 확인합니다.",
  },
  {
    icon: FileSearch,
    title: "지원 판단 정보",
    text: "마감일, 대상, 혜택, 제출물, 준비 난이도를 함께 보이도록 재구성합니다.",
  },
  {
    icon: BookOpenCheck,
    title: "준비 콘텐츠 연결",
    text: "공고를 고른 뒤 지원서, 기획서, 제출 점검 가이드로 이어지게 합니다.",
  },
  {
    icon: Search,
    title: "수정 요청 반영",
    text: "오류 제보나 삭제 요청이 들어오면 운영자가 순차적으로 확인합니다.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-10 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900">
            <ShieldCheck className="h-3.5 w-3.5" />
            공모전집 운영 기준
          </div>
          <h1 className="max-w-3xl text-3xl font-black leading-tight text-zinc-950 sm:text-4xl">
            흩어진 공고를 모으고, 지원 전에 확인할 기준까지 함께 정리합니다
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600">
            공모전집은 대학생과 청년이 공모전, 대외활동, 인턴십을 탐색할 때 필요한 원문 정보와 준비 판단 기준을 한곳에서 확인하도록 만든 서비스입니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/contests" className="btn-primary">
              공고 탐색
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/guides" className="btn-secondary">
              준비 가이드
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-[#fffdf8] p-5 shadow-card">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Service Scope</p>
          <dl className="mt-4 grid gap-3">
            <InfoItem label="대상" value="공모전·대외활동·인턴십" />
            <InfoItem label="정리 기준" value="일정·혜택·제출물·준비 난이도" />
            <InfoItem label="운영 목적" value="지원 판단과 제출 준비 보조" />
          </dl>
        </div>
      </header>

      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {OPERATING_STANDARDS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="report-panel p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-amber-700">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-sm font-black text-zinc-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{item.text}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="report-panel p-6">
          <h2 className="text-xl font-black text-zinc-950">정보 수집과 한계</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            공모전집은 공개된 모집 정보를 수집·정리하고, 사용자가 비교하기 쉽도록 자체 기준의 요약과 분석을 더합니다. 주최 기관이 모집 조건을 변경할 수 있으므로 실제 접수 전에는 공식 모집 요강과 접수 시간을 반드시 다시 확인해야 합니다.
          </p>
        </div>

        <div className="report-panel p-6">
          <h2 className="text-xl font-black text-zinc-950">수정·삭제 요청</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            공고 내용이 잘못되었거나 삭제가 필요한 경우 공고 URL과 요청 내용을 함께 보내주세요. 운영자가 출처와 요청 내용을 확인한 뒤 순차적으로 반영합니다.
          </p>
          <Link href="/contact" className="mt-4 inline-flex items-center gap-1 text-sm font-black text-amber-800 hover:text-amber-900">
            문의 페이지로 이동
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mt-10 flex flex-wrap gap-4 border-t border-stone-200 pt-6 text-sm font-semibold">
        <Link href="/privacy" className="text-zinc-500 transition-colors hover:text-amber-800">
          개인정보처리방침
        </Link>
        <Link href="/terms" className="text-zinc-500 transition-colors hover:text-amber-800">
          이용약관
        </Link>
        <Link href="/contact" className="text-zinc-500 transition-colors hover:text-amber-800">
          문의하기
        </Link>
      </section>
    </div>
  );
}

function InfoItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2">
      <dt className="text-[11px] font-black text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-black text-zinc-950">{value}</dd>
    </div>
  );
}
