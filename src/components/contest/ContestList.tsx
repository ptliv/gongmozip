import { Contest } from "@/types/contest";
import { ContestCard } from "./ContestCard";
import { EmptyState } from "@/components/ui/EmptyState";

interface ContestListProps {
  contests: Contest[];
  onReset?: () => void;
}

export function ContestList({ contests, onReset }: ContestListProps) {
  if (contests.length === 0) {
    return (
      <EmptyState
        title="조건에 맞는 공고가 없습니다"
        description="검색어를 바꾸거나 필터를 초기화해보세요."
        action={
          onReset
            ? {
                label: "필터 초기화",
                onClick: onReset,
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {contests.map((contest) => (
        <ContestCard key={contest.id} contest={contest} />
      ))}
    </div>
  );
}
