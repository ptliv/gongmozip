import Link from "next/link";
import { ContestType, CONTEST_CATEGORIES } from "@/types/contest";
import { slugifyContestTitle } from "@/lib/slug";
import type { FacetOption } from "@/lib/supabase/public-contest-queries";

interface TypeItem {
  label: ContestType;
  emoji: string;
  description: string;
  color: string;
  accent: string;
}

const TYPE_ITEMS: TypeItem[] = [
  {
    label: "공모전",
    emoji: "🏆",
    description: "아이디어·디자인·논문",
    color: "from-blue-50 to-blue-100/80 border-blue-100",
    accent: "text-blue-700",
  },
  {
    label: "대외활동",
    emoji: "🌟",
    description: "서포터즈·기자단",
    color: "from-violet-50 to-violet-100/80 border-violet-100",
    accent: "text-violet-700",
  },
  {
    label: "인턴십",
    emoji: "💼",
    description: "기업 실무 경험",
    color: "from-emerald-50 to-emerald-100/80 border-emerald-100",
    accent: "text-emerald-700",
  },
  {
    label: "창업",
    emoji: "🚀",
    description: "스타트업·투자 유치",
    color: "from-orange-50 to-orange-100/80 border-orange-100",
    accent: "text-orange-700",
  },
  {
    label: "교육",
    emoji: "📚",
    description: "장학금·교육 프로그램",
    color: "from-amber-50 to-amber-100/80 border-amber-100",
    accent: "text-amber-700",
  },
  {
    label: "봉사",
    emoji: "🤝",
    description: "국내외 봉사활동",
    color: "from-pink-50 to-pink-100/80 border-pink-100",
    accent: "text-pink-700",
  },
  {
    label: "해외",
    emoji: "✈️",
    description: "해외 인턴·연수·교환",
    color: "from-sky-50 to-sky-100/80 border-sky-100",
    accent: "text-sky-700",
  },
  {
    label: "기타",
    emoji: "📌",
    description: "그 외 다양한 활동",
    color: "from-gray-50 to-gray-100/80 border-gray-200",
    accent: "text-gray-600",
  },
];

const FEATURED_CATEGORIES = CONTEST_CATEGORIES.slice(0, 6);

interface CategorySectionProps {
  featuredFields?: FacetOption[];
  featuredTargets?: FacetOption[];
}

export function CategorySection({
  featuredFields = [],
  featuredTargets = [],
}: CategorySectionProps) {
  const defaultFields = ["IT·테크", "디자인", "마케팅·광고", "경영·경제"]
    .map((label) => ({ slug: slugifyContestTitle(label), label, count: 0 }));
  const defaultTargets = ["대학생", "대학원생", "청년", "일반인"]
    .map((label) => ({ slug: slugifyContestTitle(label), label, count: 0 }));

  const fieldLinks = (featuredFields.length > 0 ? featuredFields : defaultFields).slice(0, 6);
  const targetLinks = (featuredTargets.length > 0 ? featuredTargets : defaultTargets).slice(0, 6);

  return (
    <section className="py-12">
      <div className="section-header">
        <div className="section-title">
          <div className="section-title-accent" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">유형으로 탐색</h2>
            <p className="text-sm text-gray-500 mt-0.5">관심 있는 활동 유형을 선택하세요</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TYPE_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={`/contests?type=${item.label}`}
            className={`group flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-gradient-to-br border ${item.color} hover:-translate-y-1 hover:shadow-card transition-all duration-200 active:scale-[0.97]`}
          >
            <span className="text-2xl group-hover:scale-110 transition-transform duration-200 inline-block">
              {item.emoji}
            </span>
            <div className="text-center">
              <div className={`text-sm font-bold ${item.accent}`}>
                {item.label}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{item.description}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-semibold text-gray-500">대표 카테고리</span>
        {FEATURED_CATEGORIES.map((category) => (
          <Link
            key={category}
            href={`/categories/${slugifyContestTitle(category)}`}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            {category}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-semibold text-gray-500">분야별 보기</span>
        {fieldLinks.map((item) => (
          <Link
            key={`field-${item.slug}`}
            href={`/field/${item.slug}`}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-semibold text-gray-500">대상별 보기</span>
        {targetLinks.map((item) => (
          <Link
            key={`target-${item.slug}`}
            href={`/target/${item.slug}`}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-violet-700 bg-violet-50 border border-violet-100 hover:bg-violet-100 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-semibold text-gray-500">바로가기</span>
        <Link
          href="/bookmarks"
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          북마크
        </Link>
        <Link
          href="/deadline/7days"
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-colors"
        >
          7일 내 마감
        </Link>
      </div>
    </section>
  );
}
