import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  Code2,
  GraduationCap,
  HandHeart,
  Rocket,
  Trophy,
} from "lucide-react";
import { CONTEST_CATEGORIES, type ContestType } from "@/types/contest";
import { slugifyContestTitle } from "@/lib/slug";
import type { FacetOption } from "@/lib/supabase/public-contest-queries";

interface TypeItem {
  readonly label: ContestType;
  readonly description: string;
  readonly icon: LucideIcon;
}

const TYPE_ITEMS: readonly TypeItem[] = [
  { label: "공모전", description: "기획·디자인·개발 결과물", icon: Trophy },
  { label: "대외활동", description: "서포터즈·기자단·홍보단", icon: Building2 },
  { label: "인턴십", description: "실무 경험과 채용 연계", icon: BriefcaseBusiness },
  { label: "창업", description: "사업화·투자·멘토링", icon: Rocket },
  { label: "교육", description: "부트캠프·장학·강의", icon: GraduationCap },
  { label: "봉사", description: "공익 활동과 현장 경험", icon: HandHeart },
  { label: "해외", description: "연수·교류·글로벌 활동", icon: BookOpenCheck },
  { label: "기타", description: "새로운 모집 유형", icon: Code2 },
];

const FEATURED_CATEGORIES = CONTEST_CATEGORIES.slice(0, 6);

interface CategorySectionProps {
  readonly featuredFields?: FacetOption[];
  readonly featuredTargets?: FacetOption[];
}

export function CategorySection({
  featuredFields = [],
  featuredTargets = [],
}: CategorySectionProps) {
  const fieldLinks = (featuredFields.length > 0 ? featuredFields : defaultFields()).slice(0, 6);
  const targetLinks = (featuredTargets.length > 0 ? featuredTargets : defaultTargets()).slice(0, 6);

  return (
    <section className="py-12">
      <div className="section-header">
        <div className="section-title">
          <div className="section-title-accent" />
          <div>
            <h2 className="text-xl font-black text-zinc-950">탐색 기준을 먼저 고르세요</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              유형, 분야, 지원 대상별로 공고를 좁히면 검토 시간이 줄어듭니다.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TYPE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={`/contests?type=${item.label}`}
              className="group report-panel p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-zinc-600 group-hover:border-amber-300 group-hover:bg-amber-50 group-hover:text-amber-800">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-zinc-950">{item.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-zinc-500">{item.description}</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <LinkGroup title="주제 카테고리" links={FEATURED_CATEGORIES.map((label) => ({
          href: `/categories/${slugifyContestTitle(label)}`,
          label,
        }))} />
        <LinkGroup title="분야별 탐색" links={fieldLinks.map((item) => ({
          href: `/field/${item.slug}`,
          label: item.count > 0 ? `${item.label} ${item.count}` : item.label,
        }))} />
        <LinkGroup title="지원 대상" links={targetLinks.map((item) => ({
          href: `/target/${item.slug}`,
          label: item.count > 0 ? `${item.label} ${item.count}` : item.label,
        }))} />
      </div>
    </section>
  );
}

function defaultFields(): FacetOption[] {
  return ["IT·테크", "디자인", "마케팅·광고", "경영·경제"].map((label) => ({
    slug: slugifyContestTitle(label),
    label,
    count: 0,
  }));
}

function defaultTargets(): FacetOption[] {
  return ["대학생", "대학원생", "청년", "누구나"].map((label) => ({
    slug: slugifyContestTitle(label),
    label,
    count: 0,
  }));
}

function LinkGroup({
  title,
  links,
}: {
  readonly title: string;
  readonly links: ReadonlyArray<{ readonly href: string; readonly label: string }>;
}) {
  return (
    <div className="report-panel p-4">
      <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">{title}</p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-zinc-700 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
