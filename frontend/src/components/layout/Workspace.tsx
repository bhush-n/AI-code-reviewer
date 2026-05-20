import { useState, useEffect } from "react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { ReviewButton } from "@/components/editor/ReviewButton";
import { ReviewPanel } from "@/components/review/ReviewPanel";
import { useCreateReview } from "@/hooks/useCreateReview";
import { useReview } from "@/hooks/useReviews";
import { useUI } from "@/store/ui";

export function Workspace() {
  const [code, setCode] = useState("");
  const { language, currentReviewId, setCurrentReview } = useUI();
  const { data: savedReview } = useReview(currentReviewId);

  const mutation = useCreateReview({
    onSuccess: (review) => setCurrentReview(review.id),
  });

  useEffect(() => {
    if (savedReview && currentReviewId !== null) {
      setCode(savedReview.code);
    }
  }, [savedReview, currentReviewId]);

  const submit = () => {
    if (!code.trim() || mutation.isPending) return;
    if (currentReviewId !== null) return;
    mutation.mutate({ code, language });
  };

  const showText =
    currentReviewId !== null && savedReview
      ? savedReview.response
      : mutation.data?.response ?? "";

  const state: "idle" | "loading" | "done" | "error" = (() => {
    if (currentReviewId !== null && savedReview) return "done";
    if (mutation.isPending) return "loading";
    if (mutation.isError) return "error";
    if (mutation.data) return "done";
    return "idle";
  })();

  return (
    <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 grid-rows-2 lg:grid-rows-1 gap-px bg-border">
      <section className="bg-bg p-6 bg-radial-accent flex flex-col gap-3 min-w-0">
        <div className="text-sm text-text-muted">Code</div>
        <div className="flex-1 min-h-0">
          <CodeEditor
            value={code}
            onChange={setCode}
            language={language}
            readOnly={currentReviewId !== null}
            onSubmit={submit}
          />
        </div>
        <div>
          <ReviewButton
            loading={mutation.isPending}
            disabled={!code.trim() || currentReviewId !== null}
            onClick={submit}
          />
        </div>
      </section>
      <section className="bg-bg p-6 min-w-0">
        <ReviewPanel
          text={showText}
          state={state}
          error={mutation.error?.message}
          onRetry={() => mutation.mutate({ code, language })}
        />
      </section>
    </main>
  );
}
