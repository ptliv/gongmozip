/**
 * lib/supabase 진입점 — 외부에서는 여기서 import
 *
 * import { fetchContests, fetchContestBySlug } from "@/lib/supabase";
 * import { createServerClient, createAdminClient } from "@/lib/supabase";
 */

export { createServerClient, createAdminClient } from "./server";
export { getSupabaseBrowser } from "./client";

export {
  fetchContests,
  fetchContestBySlug,
  fetchContestById,
  incrementViewCount,
  upsertContest,
  deleteContest,
} from "./contests";
