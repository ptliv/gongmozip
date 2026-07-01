import Link from "next/link";
import { MessageSquareText, UsersRound } from "lucide-react";
import {
  COMMUNITY_KIND_LABELS,
  COMMUNITY_STATUS_LABELS,
  type CommunityPost,
} from "@/types/community";

interface CommunityPostListProps {
  readonly posts: readonly CommunityPost[];
  readonly emptyTitle?: string;
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function preview(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function CommunityPostList({
  posts,
  emptyTitle = "아직 공개된 글이 없습니다.",
}: CommunityPostListProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-white px-5 py-12 text-center">
        <p className="text-sm font-black text-zinc-900">{emptyTitle}</p>
        <p className="mt-2 text-sm text-zinc-500">첫 공개 글은 관리자 검수 후 노출됩니다.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200 bg-white">
      {posts.map((post) => (
        <article key={post.id} className="p-5 transition-colors hover:bg-stone-50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-black text-white">
              {COMMUNITY_KIND_LABELS[post.kind]}
            </span>
            {post.kind === "team" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-black text-amber-800">
                <UsersRound className="h-3.5 w-3.5" />
                팀원 모집
              </span>
            )}
            <span className="text-xs font-semibold text-zinc-400">
              {dateLabel(post.created_at)} · {post.author_name}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-black leading-snug text-zinc-950">{post.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">{preview(post.body)}</p>

          {post.kind === "team" && (
            <div className="mt-4 grid gap-2 rounded-lg bg-stone-50 p-3 text-xs font-semibold text-zinc-600 sm:grid-cols-2">
              <span>공모전: {post.contest_title ?? "미정"}</span>
              <span>마감: {post.deadline_at ?? "협의"}</span>
              <span className="sm:col-span-2">역할: {post.roles.join(", ")}</span>
              <span className="sm:col-span-2">
                연락: {post.contact_method} {post.contact_value}
              </span>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-xs font-bold text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <MessageSquareText className="h-3.5 w-3.5" />
              댓글 {post.comment_count}
            </span>
            <Link href="/community/write" className="text-amber-800 hover:text-amber-900">
              내 글 작성하기
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

export function AdminCommunityPostList({ posts }: { readonly posts: readonly CommunityPost[] }) {
  return (
    <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
      {posts.map((post) => (
        <div key={post.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
                {COMMUNITY_KIND_LABELS[post.kind]}
              </span>
              <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                {COMMUNITY_STATUS_LABELS[post.status]}
              </span>
              <span className="text-xs text-gray-400">{post.author_name}</span>
            </div>
            <p className="mt-2 truncate text-sm font-bold text-gray-900">{post.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{post.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
