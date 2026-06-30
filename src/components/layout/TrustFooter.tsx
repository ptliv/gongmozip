import Link from "next/link";
import { BookOpenCheck, Mail, Megaphone, ShieldCheck, Trophy } from "lucide-react";

const TYPE_LINKS = [
  { label: "공모전", href: "/contests?type=공모전" },
  { label: "대외활동", href: "/contests?type=대외활동" },
  { label: "인턴십", href: "/contests?type=인턴십" },
  { label: "봉사", href: "/contests?type=봉사" },
  { label: "교육", href: "/contests?type=교육" },
] as const;

const EXPLORE_LINKS = [
  { label: "전체 공고", href: "/contests" },
  { label: "마감 임박", href: "/deadline" },
  { label: "최신 공고", href: "/latest" },
  { label: "준비 가이드", href: "/guides" },
  { label: "공모전 브리핑", href: "/#briefing" },
] as const;

const TRUST_LINKS = [
  { label: "소개", href: "/about" },
  { label: "개인정보처리방침", href: "/privacy" },
  { label: "이용약관", href: "/terms" },
  { label: "문의", href: "/contact" },
  { label: "정보 수정 요청", href: "/contact?topic=correction" },
] as const;

export function TrustFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-9 md:grid-cols-[1.4fr_0.75fr_0.75fr_0.85fr]">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950">
                <Trophy className="h-4 w-4 text-amber-200" aria-hidden="true" />
              </span>
              <span className="text-base font-black text-zinc-950">
                공모전<span className="text-amber-700">집</span>
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-zinc-600">
              공고 원문, 일정, 혜택, 준비 난이도를 함께 정리해 지원 여부를 판단할 수 있게 돕는 공모전 탐색 서비스입니다.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <span className="report-chip">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                공식 출처 우선 확인
              </span>
              <span className="report-chip">
                <BookOpenCheck className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
                준비 가이드 연결
              </span>
              <span className="report-chip sm:col-span-2">
                <Megaphone className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
                정보 수정 및 문의 가능
              </span>
            </div>
          </div>

          <FooterColumn title="공고 유형" links={TYPE_LINKS} />
          <FooterColumn title="탐색" links={EXPLORE_LINKS} />
          <FooterColumn title="신뢰 정보" links={TRUST_LINKS} />
        </div>

        <div className="mt-10 grid gap-4 border-t border-stone-200 pt-6 text-xs text-zinc-500 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-1">
            <p>© 2026 공모전집. All rights reserved.</p>
            <a href="mailto:info@gongmozip.com" className="inline-flex items-center gap-1.5 font-bold text-zinc-600 hover:text-zinc-950">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              info@gongmozip.com
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/contact?topic=submit" className="btn-secondary px-3 py-2 text-xs">
              공고 등록 문의
            </Link>
            <Link href="/contact?topic=partnership" className="btn-secondary px-3 py-2 text-xs">
              광고/제휴 문의
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  readonly title: string;
  readonly links: readonly { readonly label: string; readonly href: string }[];
}) {
  return (
    <div>
      <p className="mb-4 text-[11px] font-black uppercase tracking-widest text-zinc-500">{title}</p>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm font-semibold text-zinc-600 transition-colors hover:text-amber-800">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
