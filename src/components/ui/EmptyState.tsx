import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title = "검색 결과가 없습니다",
  description = "다른 키워드나 필터로 검색해보세요.",
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-24 px-4 text-center",
        className
      )}
    >
      {/* 아이콘 컨테이너 */}
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100/70 flex items-center justify-center shadow-sm">
          <Search className="w-8 h-8 text-blue-400" />
        </div>
        {/* 장식 원 */}
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 opacity-20 blur-sm" />
      </div>

      <h3 className="text-base font-bold text-gray-800 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500 max-w-[240px] leading-relaxed">{description}</p>

      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 btn-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
