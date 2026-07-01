import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CommunityWriteForm } from "@/components/community/CommunityWriteForm";
import { createSSRClient } from "@/lib/supabase/ssr";
import { createCommunityPostAction } from "./actions";

export const metadata: Metadata = {
  title: "커뮤니티 글쓰기",
};

interface CommunityWritePageProps {
  readonly searchParams: {
    readonly submitted?: string;
    readonly error?: string;
  };
}

function errorMessage(error?: string): string | null {
  const messages: Record<string, string> = {
    name: "표시 이름은 2~24자로 입력해 주세요.",
    title: "제목은 5~120자로 입력해 주세요.",
    body: "내용은 20자 이상 입력해 주세요.",
    team: "팀원 모집글은 참여 공모전명을 입력해야 합니다.",
    roles: "팀원 모집글은 찾는 역할을 1개 이상 입력해야 합니다.",
    contact: "팀원 모집글은 연락 방식과 연락처를 입력해야 합니다.",
    save: "저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  };
  return error ? messages[error] ?? "입력값을 다시 확인해 주세요." : null;
}

export default async function CommunityWritePage({ searchParams }: CommunityWritePageProps) {
  const supabase = createSSRClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/community/write");
  }

  const message = errorMessage(searchParams.error);

  return (
    <section className="bg-stone-50">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {searchParams.submitted === "1" && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            검수 요청이 접수되었습니다. 관리자가 공개 처리하면 커뮤니티에 노출됩니다.
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {message}
          </div>
        )}
        <CommunityWriteForm action={createCommunityPostAction} userEmail={user.email} />
      </div>
    </section>
  );
}
