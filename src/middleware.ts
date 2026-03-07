import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_ROOT = "/admin";
const LOGIN_PATH = "/admin/login";

/** ADMIN_ALLOWED_EMAILS 환경변수 파싱 (없으면 모든 인증 사용자 허용) */
function getAllowedEmails(): string[] {
  const raw = process.env.ADMIN_ALLOWED_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin 이하 경로만 처리
  if (!pathname.startsWith(ADMIN_ROOT)) return NextResponse.next();

  // 쿠키 갱신을 위한 response 참조 (토큰 refresh 시 덮어씀)
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // 갱신된 토큰을 request + response 양쪽에 반영
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options })
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser()는 서버에서 토큰을 검증합니다 (getSession()보다 안전)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = pathname === LOGIN_PATH;

  // ── 비로그인 ──────────────────────────────────────────────
  if (!user) {
    if (isLoginPage) return supabaseResponse; // 로그인 페이지는 허용
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  // ── 이메일 허용 목록 확인 ──────────────────────────────────
  const allowedEmails = getAllowedEmails();
  const email = (user.email ?? "").toLowerCase();

  if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
    if (isLoginPage) return supabaseResponse;
    const url = new URL(LOGIN_PATH, request.url);
    url.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(url);
  }

  // ── 인증된 관리자가 로그인 페이지 접근 → 대시보드로 ────────
  if (isLoginPage) {
    return NextResponse.redirect(new URL(ADMIN_ROOT, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*"],
};
