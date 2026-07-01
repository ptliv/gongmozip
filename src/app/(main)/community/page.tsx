import type { Metadata } from "next";
import Link from "next/link";
import { PenLine, UsersRound } from "lucide-react";
import { CommunityPostList } from "@/components/community/CommunityPostList";
import { fetchPublishedCommunityPosts } from "@/lib/community";
import type { CommunityPost } from "@/types/community";

export const metadata: Metadata = {
  title: "커뮤니티",
  description: "공모전 준비 질문, 팀원 모집, 수상 후기를 나누는 공모전집 커뮤니티입니다.",
};

export const revalidate = 60;

async function getPosts(): Promise<CommunityPost[]> {
  return fetchPublishedCommunityPosts({ limit: 30 }).catch((error: unknown) => {
    console.error("[CommunityPage] fetchPublishedCommunityPosts failed:", error);
    return [];
  });
}

export default async function CommunityPage() {
  const posts = await getPosts();

  return (
    <section className="bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-amber-700">Community</p>
            <h1 className="mt-3 text-3xl font-black text-zinc-950">공모전 커뮤니티</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
              준비 질문, 팀원 모집, 수상 후기를 나누는 공간입니다. 새 글은 관리자 검수 후 공개됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/community/team" className="btn-secondary">
              <UsersRound className="h-4 w-4" />
              팀원 모집
            </Link>
            <Link href="/community/write" className="btn-primary">
              <PenLine className="h-4 w-4" />
              글쓰기
            </Link>
          </div>
        </div>

        <CommunityPostList posts={posts} />
      </div>
    </section>
  );
}
