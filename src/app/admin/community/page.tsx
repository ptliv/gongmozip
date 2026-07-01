import type { Metadata } from "next";
import { MessageSquareText } from "lucide-react";
import { fetchAdminCommunityPosts } from "@/lib/community";
import {
  COMMUNITY_KIND_LABELS,
  COMMUNITY_STATUS_LABELS,
  type CommunityPost,
  type CommunityPostStatus,
} from "@/types/community";
import { updateCommunityPostStatusAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "커뮤니티 관리",
};

async function getPosts(): Promise<CommunityPost[]> {
  return fetchAdminCommunityPosts({ limit: 200 }).catch((error: unknown) => {
    console.error("[AdminCommunityPage] fetchAdminCommunityPosts failed:", error);
    return [];
  });
}

function statusClass(status: CommunityPostStatus): string {
  if (status === "pending") return "bg-amber-50 text-amber-700";
  if (status === "published") return "bg-emerald-50 text-emerald-700";
  if (status === "hidden") return "bg-zinc-100 text-zinc-600";
  return "bg-red-50 text-red-700";
}

function StatusButton({
  id,
  status,
  label,
}: {
  readonly id: string;
  readonly status: CommunityPostStatus;
  readonly label: string;
}) {
  return (
    <form action={updateCommunityPostStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
      >
        {label}
      </button>
    </form>
  );
}

export default async function AdminCommunityPage() {
  const posts = await getPosts();
  const pendingCount = posts.filter((post) => post.status === "pending").length;

  return (
    <div className="max-w-6xl p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">커뮤니티 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            로그인 사용자가 작성한 글을 검수하고 공개 여부를 관리합니다.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-right">
          <p className="text-xs font-bold text-amber-700">검수 대기</p>
          <p className="text-2xl font-black text-amber-900">{pendingCount}건</p>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-16 text-center">
          <MessageSquareText className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-bold text-gray-600">관리할 커뮤니티 글이 없습니다.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
          {posts.map((post) => (
            <article key={post.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
                    {COMMUNITY_KIND_LABELS[post.kind]}
                  </span>
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusClass(post.status)}`}>
                    {COMMUNITY_STATUS_LABELS[post.status]}
                  </span>
                  <span className="text-xs text-gray-400">{post.author_name}</span>
                </div>
                <h2 className="mt-2 text-base font-bold text-gray-900">{post.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-500">{post.body}</p>
                {post.kind === "team" && (
                  <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs font-semibold text-gray-600">
                    <p>공모전: {post.contest_title}</p>
                    <p>역할: {post.roles.join(", ")}</p>
                    <p>
                      연락: {post.contact_method} {post.contact_value}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap content-start gap-2 lg:justify-end">
                <StatusButton id={post.id} status="published" label="공개" />
                <StatusButton id={post.id} status="hidden" label="숨김" />
                <StatusButton id={post.id} status="deleted" label="삭제" />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
