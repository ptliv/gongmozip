import Link from "next/link";
import { BookOpenCheck, Mail, ShieldCheck, Trophy } from "lucide-react";

const TYPE_LINKS = ["공모전", "대외활동", "인턴십", "봉사", "교육"] as const;

const SERVICE_LINKS = [
  { label: "전체 공고", href: "/contests" },
  { label: "마감 임박", href: "/deadline" },
  { label: "최신 공고", href: "/latest" },
  { label: "준비 가이드", href: "/guides" },
] as const;

const TRUST_LINKS = [
  { label: "소개", href: "/about" },
  { label: "개인정보처리방침", href: "/privacy" },
  { label: "이용약관", href: "/terms" },
  { label: "문의", href: "/contact" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-200 bg-[#fffdf8]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.35fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950">
                <Trophy className="h-4 w-4 text-amber-200" />
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
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                공식 출처 우선 확인
              </span>
              <span className="report-chip">
                <BookOpenCheck className="h-3.5 w-3.5 text-amber-700" />
                준비 가이드 연결
              </span>
            </div>
          </div>

          <FooterColumn title="공고 유형">
            {TYPE_LINKS.map((type) => (
              <FooterLink key={type} href={`/contests?type=${type}`} label={type} />
            ))}
          </FooterColumn>

          <FooterColumn title="탐색">
            {SERVICE_LINKS.map((link) => (
              <FooterLink key={link.href} href={link.href} label={link.label} />
            ))}
          </FooterColumn>

          <FooterColumn title="신뢰 정보">
            {TRUST_LINKS.map((link) => (
              <FooterLink key={link.href} href={link.href} label={link.label} />
            ))}
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-stone-200 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 공모전집. All rights reserved.</p>
          <Link href="/contact" className="inline-flex items-center gap-1.5 font-semibold text-zinc-600 hover:text-zinc-950">
            <Mail className="h-3.5 w-3.5" />
            정보 수정 및 문의
          </Link>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-4 text-[11px] font-black uppercase tracking-widest text-zinc-500">{title}</p>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, label }: { readonly href: string; readonly label: string }) {
  return (
    <li>
      <Link href={href} className="text-sm font-semibold text-zinc-600 transition-colors hover:text-amber-800">
        {label}
      </Link>
    </li>
  );
}
