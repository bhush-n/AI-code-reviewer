import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Review } from "@/lib/api";

export const reviewsKey = ["reviews"] as const;

export function useCreateReview(
  options?: { onSuccess?: (review: Review) => void; onError?: (err: Error) => void }
) {
  const qc = useQueryClient();
  return useMutation<Review, Error, { code: string; language: string }>({
    mutationFn: (payload) => api.createReview(payload),
    onSuccess: (review) => {
      qc.invalidateQueries({ queryKey: reviewsKey });
      options?.onSuccess?.(review);
    },
    onError: (err) => options?.onError?.(err),
  });
}
