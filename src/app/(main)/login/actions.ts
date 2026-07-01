"use server";

import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/seo";
import { createSSRClient } from "@/lib/supabase/ssr";

function sanitizeNext(value: FormDataEntryValue | null): string {
  const next = value?.toString() ?? "/community/write";
  if (!next.startsWith("/") || next.startsWith("//")) return "/community/write";
  return next;
}

export async function requestLoginLinkAction(formData: FormData): Promise<void> {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const next = sanitizeNext(formData.get("next"));

  if (!email) {
    redirect(`/login?next=${encodeURIComponent(next)}&error=email`);
  }

  const supabase = createSSRClient();
  const emailRedirectTo = `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect(`/login?next=${encodeURIComponent(next)}&error=send`);
  }

  redirect(`/login?next=${encodeURIComponent(next)}&sent=1`);
}
