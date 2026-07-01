"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCommunityPost, CommunityDataError } from "@/lib/community";
import { createSSRClient } from "@/lib/supabase/ssr";
import {
  COMMUNITY_POST_KINDS,
  type CommunityPostInsert,
  type CommunityPostKind,
} from "@/types/community";

function getText(formData: FormData, key: string): string {
  return formData.get(key)?.toString().trim() ?? "";
}

function isCommunityKind(value: string): value is CommunityPostKind {
  return COMMUNITY_POST_KINDS.some((kind) => kind === value);
}

function parseRoles(value: string): string[] {
  return value
    .split(/[,，]/)
    .map((role) => role.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function validateBase(title: string, body: string, authorName: string): string | null {
  if (authorName.length < 2 || authorName.length > 24) return "name";
  if (title.length < 5 || title.length > 120) return "title";
  if (body.length < 20 || body.length > 4000) return "body";
  return null;
}

function validateTeamPost(values: {
  readonly contestTitle: string;
  readonly roles: string[];
  readonly contactMethod: string;
  readonly contactValue: string;
}): string | null {
  if (values.contestTitle.length < 2) return "team";
  if (values.roles.length === 0) return "roles";
  if (!values.contactMethod || !values.contactValue) return "contact";
  return null;
}

export async function createCommunityPostAction(formData: FormData): Promise<void> {
  const supabase = createSSRClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/community/write");
  }

  const rawKind = getText(formData, "kind");
  const kind = isCommunityKind(rawKind) ? rawKind : "general";
  const title = getText(formData, "title");
  const body = getText(formData, "body");
  const authorName = getText(formData, "authorName");
  const contestTitle = getText(formData, "contestTitle");
  const contestUrl = getText(formData, "contestUrl");
  const roles = parseRoles(getText(formData, "roles"));
  const deadlineAt = getText(formData, "deadlineAt");
  const contactMethod = getText(formData, "contactMethod");
  const contactValue = getText(formData, "contactValue");

  const baseError = validateBase(title, body, authorName);
  if (baseError) redirect(`/community/write?error=${baseError}`);

  const teamError =
    kind === "team"
      ? validateTeamPost({ contestTitle, roles, contactMethod, contactValue })
      : null;
  if (teamError) redirect(`/community/write?error=${teamError}`);

  const payload: CommunityPostInsert = {
    author_id: user.id,
    author_name: authorName,
    kind,
    status: "pending",
    title,
    body,
    contest_title: kind === "team" ? contestTitle : null,
    contest_url: kind === "team" && contestUrl ? contestUrl : null,
    roles: kind === "team" ? roles : [],
    deadline_at: kind === "team" && deadlineAt ? deadlineAt : null,
    contact_method: kind === "team" ? contactMethod : null,
    contact_value: kind === "team" ? contactValue : null,
  };

  try {
    await createCommunityPost(supabase, payload);
  } catch (error) {
    if (error instanceof CommunityDataError) {
      redirect("/community/write?error=save");
    }
    throw error;
  }

  revalidatePath("/community");
  revalidatePath("/community/team");
  revalidatePath("/");
  redirect("/community/write?submitted=1");
}
