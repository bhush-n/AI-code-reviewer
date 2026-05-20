import { useState, useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { ReviewButton } from "@/components/editor/ReviewButton";
import { ReviewPanel } from "@/components/review/ReviewPanel";
import { Button } from "@/components/ui/button";
import { useCreateReview } from "@/hooks/useCreateReview";
import { useReview } from "@/hooks/useReviews";
import { useUI } from "@/store/ui";
import { cn } from "@/lib/utils";

export function Workspace() {
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(false);
  const { language, currentReviewId, setCurrentReview } = useUI();
  const { data: savedReview } = useReview(currentReviewId);

  const mutation = useCreateReview({
    onSuccess: (review) => {
      setCurrentReview(review.id);
      toast.success("Review saved", { description: review.title });
    },
    onError: (err) => {
      toast.error("Couldn't review code", { description: err.message });
    },
  });

  useEffect(() => {
    if (savedReview && currentReviewId !== null) {
      setCode(savedReview.code);
    }
  }, [savedReview, currentReviewId]);

  const submit = () => {
    if (!code.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 320);
      return;
    }
    if (mutation.isPending || currentReviewId !== null) return;
    mutation.mutate({ code, language });
  };

  const editACopy = () => {
    setCurrentReview(null);
    mutation.reset();
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
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-text-muted">Code</div>
          {currentReviewId !== null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={editACopy}
              className="gap-1 text-xs"
            >
              <RotateCcw className="w-3 h-3" /> Edit a copy
            </Button>
          )}
        </div>
        <div className={cn("flex-1 min-h-0", shake && "shake")}>
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
            disabled={currentReviewId !== null}
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
