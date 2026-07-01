"use server";

import { revalidatePath } from "next/cache";
import { updateCommunityPostStatus } from "@/lib/community";
import { COMMUNITY_POST_STATUSES, type CommunityPostStatus } from "@/types/community";

function isCommunityStatus(value: string): value is CommunityPostStatus {
  return COMMUNITY_POST_STATUSES.some((status) => status === value);
}

export async function updateCommunityPostStatusAction(formData: FormData): Promise<void> {
  const id = formData.get("id")?.toString() ?? "";
  const rawStatus = formData.get("status")?.toString() ?? "";

  if (!id || !isCommunityStatus(rawStatus)) {
    return;
  }

  await updateCommunityPostStatus(id, rawStatus);
  revalidatePath("/admin/community");
  revalidatePath("/community");
  revalidatePath("/community/team");
  revalidatePath("/");
}
