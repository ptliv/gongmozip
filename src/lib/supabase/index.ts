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

export {
  getContestDetailPayload,
  getRecentContestsPayload,
  getRelatedContestsPayload,
  getDeadlineContestsPayload,
  getDeadline7DaysContestsPayload,
  getCategoryContestsPayload,
  getFieldContestsPayload,
  getTargetContestsPayload,
  getHostContestsPayload,
  getFacetOptionsPayload,
} from "./public-contest-queries";
