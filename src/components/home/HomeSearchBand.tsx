import { ArrowRight, Search } from "lucide-react";

export function HomeSearchBand() {
  return (
    <section className="py-4">
      <form action="/contests" className="report-panel flex flex-col gap-2 bg-white p-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">공고 검색</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <input
            name="q"
            type="search"
            placeholder="공고명, 주최사, 분야, 제출물로 검색"
            className="h-12 w-full rounded-lg border border-stone-200 bg-stone-50 pl-12 pr-4 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </label>
        <button type="submit" className="btn-primary h-12 px-5">
          공고 검색
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
