import { NextResponse, type NextRequest } from "next/server";
import { createSSRClient } from "@/lib/supabase/ssr";

function sanitizeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/community/write";
  return value;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = sanitizeNext(url.searchParams.get("next"));

  if (code) {
    const supabase = createSSRClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?error=send", url.origin));
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
