/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 싱글톤
 *
 * 사용법:
 *   import { supabaseBrowser } from "@/lib/supabase/client";
 *   const { data } = await supabaseBrowser.from("contests").select();
 *
 * 주의: 이 클라이언트는 NEXT_PUBLIC_ anon key를 사용합니다.
 *       RLS 정책이 적용되므로 public 읽기 전용 용도에 적합합니다.
 *       관리자 쓰기 작업은 서버에서 createAdminClient()를 사용하세요.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let _client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseBrowser() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.\n" +
      ".env.local 파일을 확인하세요."
    );
  }

  _client = createClient<Database>(url, key);
  return _client;
}

/** 편의용 named export — "use client" 컴포넌트에서 직접 import 가능 */
export const supabaseBrowser = typeof window !== "undefined"
  ? getSupabaseBrowser()
  : null;
