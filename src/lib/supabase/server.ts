/**
 * 서버(Server Components / Route Handlers / Server Actions)용 Supabase 팩토리
 *
 * 두 가지 클라이언트를 제공합니다:
 *
 * 1. createServerClient()   — anon key + RLS 적용  → 공개 데이터 읽기
 * 2. createAdminClient()    — service_role key     → 관리자 쓰기 (RLS bypass)
 *
 * 사용 예시 (Server Component):
 *   import { createServerClient } from "@/lib/supabase/server";
 *   const supabase = createServerClient();
 *   const { data } = await supabase.from("contests").select();
 *
 * 주의: 이 파일은 "use client" 컴포넌트에서 import 하면 안 됩니다.
 *       서버 전용 env var (SUPABASE_SERVICE_ROLE_KEY)를 사용합니다.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[Supabase] 환경변수 "${key}"가 설정되지 않았습니다.\n.env.local 파일을 확인하세요.`
    );
  }
  return value;
}

/** 공개 읽기용 — RLS 정책 적용 (anon key) */
export function createServerClient() {
  return createClient<Database>(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: { persistSession: false },
    }
  );
}

/**
 * 관리자 전용 쓰기용 — RLS bypass (service_role key)
 * Server Actions / Route Handlers에서만 사용할 것
 */
export function createAdminClient() {
  return createClient<Database>(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
