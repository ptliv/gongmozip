import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  CommunityPost,
  CommunityPostInsert,
  CommunityPostKind,
  CommunityPostStatus,
  CommunityPostUpdate,
} from "@/types/community";

const COMMUNITY_POST_SELECT = `
  id, author_id, author_name, kind, status, title, body,
  contest_title, contest_url, roles, deadline_at, contact_method, contact_value,
  comment_count, view_count, published_at, created_at, updated_at
`;

export class CommunityDataError extends Error {
  constructor(operation: string, message: string) {
    super(`[${operation}] ${message}`);
    this.name = "CommunityDataError";
  }
}

function normalizeCommunityPost(row: CommunityPost): CommunityPost {
  return {
    ...row,
    roles: row.roles ?? [],
    comment_count: Number(row.comment_count ?? 0),
    view_count: Number(row.view_count ?? 0),
  };
}

function isMissingCommunityTable(message: string): boolean {
  return message.includes("community_posts") && message.includes("schema cache");
}

export async function fetchPublishedCommunityPosts(options?: {
  readonly kind?: CommunityPostKind;
  readonly limit?: number;
}): Promise<CommunityPost[]> {
  const supabase = createServerClient();
  let query = supabase
    .from("community_posts")
    .select(COMMUNITY_POST_SELECT)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (options?.kind) {
    query = query.eq("kind", options.kind);
  }

  if (options?.limit) {
    query = query.limit(Math.max(1, Math.min(options.limit, 50)));
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingCommunityTable(error.message)) return [];
    throw new CommunityDataError("fetchPublishedCommunityPosts", error.message);
  }
  return (data ?? []).map((row) => normalizeCommunityPost(row));
}

export async function fetchAdminCommunityPosts(options?: {
  readonly status?: CommunityPostStatus;
  readonly limit?: number;
}): Promise<CommunityPost[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("community_posts")
    .select(COMMUNITY_POST_SELECT)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.limit) {
    query = query.limit(Math.max(1, Math.min(options.limit, 200)));
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingCommunityTable(error.message)) return [];
    throw new CommunityDataError("fetchAdminCommunityPosts", error.message);
  }
  return (data ?? []).map((row) => normalizeCommunityPost(row));
}

export async function createCommunityPost(
  supabase: SupabaseClient<Database>,
  values: CommunityPostInsert
): Promise<CommunityPost> {
  const { data, error } = await supabase
    .from("community_posts")
    .insert(values)
    .select(COMMUNITY_POST_SELECT)
    .single();

  if (error) throw new CommunityDataError("createCommunityPost", error.message);
  return normalizeCommunityPost(data);
}

export async function updateCommunityPostStatus(
  id: string,
  status: CommunityPostStatus
): Promise<CommunityPost> {
  const update: CommunityPostUpdate = {
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
  };
  const { data, error } = await createAdminClient()
    .from("community_posts")
    .update(update)
    .eq("id", id)
    .select(COMMUNITY_POST_SELECT)
    .single();

  if (error) throw new CommunityDataError("updateCommunityPostStatus", error.message);
  return normalizeCommunityPost(data);
}
