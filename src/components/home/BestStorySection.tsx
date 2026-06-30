import Link from "next/link";
import { communityStoriesMockData } from "@/data/community-stories";

const TABS = ["커뮤니티", "준비 질문", "팀원 모집", "수상 후기"] as const;
const SUB_TABS = ["실시간", "주간", "월간", "댓글순", "추천순"] as const;

export function BestStorySection() {
  return (
    <section id="community" className="py-10">
      <div className="report-panel overflow-hidden">
        <div className="border-b border-stone-200 px-5 py-5">
          <h2 className="text-2xl font-black text-zinc-950">공모전집 BEST 이야기</h2>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex">
            {TABS.map((tab, index) => (
              <button
                key={tab}
                type="button"
                className={`rounded-lg px-3 py-2 text-sm font-black ${index === 0 ? "bg-zinc-900 text-white" : "bg-stone-100 text-zinc-600"}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-stone-200 px-5 py-3">
          <div className="flex gap-4 overflow-x-auto whitespace-nowrap text-sm scrollbar-hide">
            {SUB_TABS.map((tab, index) => (
              <button
                key={tab}
                type="button"
                className={index === 0 ? "font-black text-amber-700" : "font-bold text-zinc-500"}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <ol className="divide-y divide-stone-100 px-5">
          {communityStoriesMockData.map((story, index) => (
            <li key={story.id}>
              <Link href={story.href} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 py-3.5">
                <span className="text-lg font-black tabular-nums text-zinc-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-zinc-800">{story.title}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-zinc-400">{story.kind}</span>
                </span>
                <span className="text-sm font-black text-red-500">({story.commentCount})</span>
              </Link>
            </li>
          ))}
        </ol>

        <div className="border-t border-stone-200 px-5 py-4">
          <Link href="/#community" className="text-sm font-black text-zinc-700 hover:text-amber-800">
            커뮤니티 더보기
          </Link>
        </div>
      </div>
    </section>
  );
}
