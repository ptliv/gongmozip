"use server";

import { redirect } from "next/navigation";
import { createSSRClient } from "@/lib/supabase/ssr";

/**
 * 로그인 — 성공 시 /admin으로 리다이렉트
 * 실패 시 /admin/login?error=... 로 리다이렉트
 */
export async function loginAction(formData: FormData): Promise<void> {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    redirect(`/admin/login?error=empty`);
  }

  const supabase = createSSRClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/admin/login?error=credentials`);
  }

  // 성공 → 미들웨어가 이메일 허용 목록을 재검사한 뒤 대시보드 진입
  redirect("/admin");
}

/**
 * 로그아웃 — 세션 삭제 후 로그인 페이지로 이동
 */
export async function logoutAction(): Promise<void> {
  const supabase = createSSRClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
