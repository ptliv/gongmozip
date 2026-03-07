import { cn } from "@/lib/utils";
import { ContestType, ContestField } from "@/types/contest";

type ChipVariant = "type" | "field" | "tag";

interface CategoryChipProps {
  label: string;
  variant?: ChipVariant;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const variantStyles: Record<ChipVariant, string> = {
  type: "bg-blue-50 text-blue-700 border border-blue-100",
  field: "bg-violet-50 text-violet-700 border border-violet-100",
  tag: "bg-gray-100 text-gray-600 border border-gray-200",
};

const hoverStyles: Record<ChipVariant, string> = {
  type: "hover:bg-blue-100 hover:border-blue-200",
  field: "hover:bg-violet-100 hover:border-violet-200",
  tag: "hover:bg-gray-200 hover:border-gray-300",
};

const activeStyles: Record<ChipVariant, string> = {
  type: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm",
  field: "bg-violet-600 text-white border-violet-600 hover:bg-violet-700 shadow-sm",
  tag: "bg-gray-800 text-white border-gray-800 hover:bg-gray-900 shadow-sm",
};

export function CategoryChip({
  label,
  variant = "type",
  active = false,
  onClick,
  className,
}: CategoryChipProps) {
  const isInteractive = !!onClick;

  return (
    <span
      role={isInteractive ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-150",
        active ? activeStyles[variant] : variantStyles[variant],
        isInteractive && !active && hoverStyles[variant],
        isInteractive ? "cursor-pointer select-none active:scale-95" : "cursor-default",
        className
      )}
    >
      {label}
    </span>
  );
}

// 유형별 이모지 매핑
export const TYPE_EMOJI: Record<ContestType, string> = {
  공모전: "🏆",
  대외활동: "🌟",
  인턴십: "💼",
  봉사: "🤝",
  교육: "📚",
  해외: "✈️",
  창업: "🚀",
  기타: "📌",
};

export const POPULAR_TYPES: Array<{ label: ContestType; emoji: string }> = [
  { label: "공모전", emoji: "🏆" },
  { label: "대외활동", emoji: "🌟" },
  { label: "인턴십", emoji: "💼" },
  { label: "창업", emoji: "🚀" },
  { label: "교육", emoji: "📚" },
  { label: "봉사", emoji: "🤝" },
  { label: "해외", emoji: "✈️" },
];

export const POPULAR_FIELDS: Array<{ label: ContestField }> = [
  { label: "IT·테크" },
  { label: "디자인" },
  { label: "마케팅·광고" },
  { label: "사회·환경" },
];
