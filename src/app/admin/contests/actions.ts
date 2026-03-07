"use server";

/**
 * 관리자 공고 Server Actions
 *
 * "use server" 지시어로 인해 이 파일의 함수는 서버에서만 실행됩니다.
 * createAdminClient()가 사용하는 SUPABASE_SERVICE_ROLE_KEY는
 * 클라이언트 번들에 절대 포함되지 않습니다.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { upsertContest, deleteContest } from "@/lib/supabase/contests";
import type { ContestFormValues } from "@/types/contest";
import type { ContestInsert } from "@/types/database";

// ----------------------------------------------------------
// 내부 헬퍼
// ----------------------------------------------------------

/** ContestFormValues → ContestInsert 변환 (slug는 upsertContest가 자동 생성) */
function toInsert(values: ContestFormValues): ContestInsert {
  return { ...values, slug: "" };
}

function revalidateAll(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/contests");
  if (id) revalidatePath(`/admin/contests/${id}`);
  // 사용자 페이지도 갱신
  revalidatePath("/");
  revalidatePath("/contests");
}

// ----------------------------------------------------------
// 공고 등록 (신규)
// ----------------------------------------------------------

/**
 * 신규 공고 등록 → 저장 성공 시 목록으로 리다이렉트
 * 실패 시 { error } 반환 (클라이언트가 배너로 표시)
 */
export async function createContestAction(
  values: ContestFormValues
): Promise<{ error: string } | void> {
  try {
    await upsertContest(toInsert(values));
    revalidateAll();
  } catch (e) {
    console.error("[createContestAction]", e);
    return { error: "등록에 실패했습니다. 다시 시도해주세요." };
  }
  // redirect()는 try-catch 밖에서 호출 — NEXT_REDIRECT 에러를 catch하지 않기 위함
  redirect("/admin/contests");
}

// ----------------------------------------------------------
// 공고 수정
// ----------------------------------------------------------

/**
 * 기존 공고 수정 → 저장 후 현재 페이지 유지
 * 성공: {} 반환 (클라이언트가 "저장됨" 배너 표시 + router.refresh())
 * 실패: { error } 반환
 */
export async function updateContestAction(
  id: string,
  values: ContestFormValues
): Promise<{ error?: string }> {
  try {
    await upsertContest(toInsert(values), id);
    revalidateAll(id);
    return {};
  } catch (e) {
    console.error("[updateContestAction]", e);
    return { error: "저장에 실패했습니다. 다시 시도해주세요." };
  }
}

// ----------------------------------------------------------
// 공고 삭제
// ----------------------------------------------------------

/**
 * 공고 삭제 → 삭제 성공 시 목록으로 리다이렉트
 * 실패 시 { error } 반환
 */
export async function deleteContestAction(
  id: string
): Promise<{ error: string } | void> {
  try {
    await deleteContest(id);
    revalidateAll(id);
  } catch (e) {
    console.error("[deleteContestAction]", e);
    return { error: "삭제에 실패했습니다. 다시 시도해주세요." };
  }
  redirect("/admin/contests");
}
