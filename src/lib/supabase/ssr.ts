/**
 * @supabase/ssr 기반 쿠키-세션 클라이언트
 *
 * 사용처:
 *   - Server Components / Server Actions → createSSRClient()
 *   - Middleware → createMiddlewareClient() (별도 패턴)
 *
 * 기존 server.ts의 createServerClient()는 데이터 읽기(contests 등) 전용이며,
 * 이 파일의 클라이언트는 Supabase Auth 세션 관리 전용입니다.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Server Components / Server Actions용 SSR 클라이언트
 * 쿠키에서 세션을 읽고, 갱신된 토큰을 쿠키에 다시 씁니다.
 */
export function createSSRClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components에서 호출 시 무시 (읽기 전용 컨텍스트)
            // Server Actions에서는 정상 동작합니다.
          }
        },
      },
    }
  );
}
