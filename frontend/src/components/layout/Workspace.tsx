import { useState, useEffect } from "react";
import { RotateCcw, Code2, Sparkles } from "lucide-react";
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
    <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 grid-rows-2 lg:grid-rows-1 relative overflow-hidden">
      {/* Vertical accent divider between panes (only large screens) */}
      <div className="hidden lg:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-px hairline-accent z-10" />

      {/* ============ CODE PANE ============ */}
      <section className="panel-frame flex flex-col gap-3 p-6 min-w-0">
        <SectionHeader icon={<Code2 className="w-3.5 h-3.5" />} label="Source">
          {currentReviewId !== null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={editACopy}
              className="gap-1 text-[11px] font-mono h-7 text-text-muted hover:text-brand hover:bg-brand/10"
            >
              <RotateCcw className="w-3 h-3" /> Edit a copy
            </Button>
          )}
        </SectionHeader>

        <div className={cn("flex-1 min-h-0 editor-shell", shake && "shake")}>
          <CodeEditor
            value={code}
            onChange={setCode}
            language={language}
            readOnly={currentReviewId !== null}
            onSubmit={submit}
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-[11px] text-text-dim font-mono">
            {code.length} chars · {code.split("\n").length} lines
          </div>
          <ReviewButton
            loading={mutation.isPending}
            disabled={currentReviewId !== null}
            onClick={submit}
          />
        </div>
      </section>

      {/* ============ REVIEW PANE ============ */}
      <section className="panel-frame flex flex-col gap-3 p-6 min-w-0 relative">
        <SectionHeader icon={<Sparkles className="w-3.5 h-3.5 text-brand" />} label="AI Review" />
        <div className="flex-1 min-h-0">
          <ReviewPanel
            text={showText}
            state={state}
            error={mutation.error?.message}
            onRetry={() => mutation.mutate({ code, language })}
          />
        </div>
      </section>
    </main>
  );
}

function SectionHeader({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-text-muted">
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-surface-2 border border-border">
          {icon}
        </div>
        <span className="text-[10px] uppercase tracking-[0.16em] font-mono font-semibold text-text-muted">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
