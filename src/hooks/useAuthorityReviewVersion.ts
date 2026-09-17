import { useSyncExternalStore } from "react";
import { getAuthorityReviewVersion, subscribeAuthorityReview } from "@/lib/authority-review-queue";

export function useAuthorityReviewVersion(): number {
  return useSyncExternalStore(subscribeAuthorityReview, getAuthorityReviewVersion, () => 0);
}
