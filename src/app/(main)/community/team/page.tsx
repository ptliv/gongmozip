import type { Metadata } from "next";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { CommunityPostList } from "@/components/community/CommunityPostList";
import { fetchPublishedCommunityPosts } from "@/lib/community";
import type { CommunityPost } from "@/types/community";

export const metadata: Metadata = {
  title: "팀원 모집",
  description: "공모전 팀원을 찾는 커뮤니티 글을 모아봅니다.",
};

export const revalidate = 60;

async function getTeamPosts(): Promise<CommunityPost[]> {
  return fetchPublishedCommunityPosts({ kind: "team", limit: 30 }).catch((error: unknown) => {
    console.error("[CommunityTeamPage] fetchPublishedCommunityPosts failed:", error);
    return [];
  });
}

export default async function CommunityTeamPage() {
  const posts = await getTeamPosts();

  return (
    <section className="bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-amber-700">Team Matching</p>
            <h1 className="mt-3 text-3xl font-black text-zinc-950">팀원 모집</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
              함께 지원할 사람을 찾는 글만 모았습니다. 연락처는 작성자가 공개한 정보만 표시됩니다.
            </p>
          </div>
          <Link href="/community/write" className="btn-primary">
            <PenLine className="h-4 w-4" />
            모집글 작성
          </Link>
        </div>

        <CommunityPostList posts={posts} emptyTitle="아직 공개된 팀원 모집글이 없습니다." />
      </div>
    </section>
  );
}
