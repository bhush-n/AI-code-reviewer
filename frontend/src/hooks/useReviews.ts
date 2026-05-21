import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const reviewsKey = ["reviews"] as const;

export function useReviewsList() {
  return useQuery({ queryKey: reviewsKey, queryFn: api.listReviews });
}

export function useReview(id: number | null) {
  return useQuery({
    queryKey: ["review", id],
    queryFn: () => api.getReview(id as number),
    enabled: id !== null,
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteReview,
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewsKey }),
  });
}
