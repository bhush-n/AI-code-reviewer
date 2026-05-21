import { Sparkles, AlertTriangle, RefreshCw } from "lucide-react";
import { ReviewMarkdown } from "./ReviewMarkdown";
import { ReviewActions } from "./ReviewActions";

type State = "idle" | "loading" | "done" | "error";

interface Props {
  text: string;
  state: State;
  error?: string | null;
  onRetry?: () => void;
}

export function ReviewPanel({ text, state, error, onRetry }: Props) {
  if (state === "idle" && !text) return <EmptyState />;
  if (state === "loading") return <LoadingState />;
  if (state === "error") return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end mb-3">
        <ReviewActions text={text} />
      </div>
      <div className="flex-1 overflow-auto pr-2 -mr-2">
        <ReviewMarkdown text={text} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center text-text-muted">
      <div className="text-center max-w-xs">
        {/* Animated halo */}
        <div className="relative w-20 h-20 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand/30 to-brand-2/20 blur-xl pulse-soft" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-brand/20 to-transparent border border-brand/30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-brand" strokeWidth={1.5} />
          </div>
        </div>
        <div className="text-[15px] font-display font-semibold text-text mb-1.5">
          Ready when you are
        </div>
        <div className="text-[12.5px] text-text-muted leading-relaxed">
          Paste your code on the left and press{" "}
          <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-surface-2 border border-border font-mono text-text">
            ⌘
          </kbd>
          <kbd className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-surface-2 border border-border font-mono text-text">
            ↵
          </kbd>{" "}
          to get an AI review.
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3 relative">
      <div className="flex items-center gap-2 text-text-muted text-[12px] font-mono mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-brand pulse-soft shadow-[0_0_8px_var(--brand)]" />
        Analyzing your code…
      </div>
      {[
        "w-1/3",
        "w-full",
        "w-5/6",
        "w-4/6",
        "w-3/6",
        "w-1/4",
        "w-full",
        "w-5/6",
      ].map((w, i) => (
        <div
          key={i}
          className={`h-3 ${w} rounded-md bg-surface-2 shimmer`}
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border border-danger/30 bg-gradient-to-br from-danger/10 to-transparent p-4 text-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="font-medium text-danger mb-1">Couldn't review code</div>
          <div className="text-text-muted text-[12.5px] break-all">{message ?? "Something went wrong"}</div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border border-danger/30 text-danger hover:bg-danger/15 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
