import { Sparkles } from "lucide-react";
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
  if (state === "loading") return <Skeleton />;
  if (state === "error") {
    return (
      <div className="text-sm text-danger border border-danger/30 bg-danger/10 rounded-md p-3 flex items-center justify-between gap-3">
        <span>{error ?? "Something went wrong"}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-2 py-1 rounded border border-danger/30 hover:bg-danger/20 text-xs"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-accent" />
          AI Review
        </div>
        <ReviewActions text={text} />
      </div>
      <div className="flex-1 overflow-auto pr-2">
        <ReviewMarkdown text={text} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center text-text-muted">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        <div className="text-sm">
          Paste code, hit <kbd className="px-1 py-0.5 rounded bg-surface-2">⌘</kbd>
          <kbd className="px-1 py-0.5 rounded bg-surface-2">↵</kbd>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-3 w-1/4 bg-surface-2 rounded" />
      <div className="h-3 w-full bg-surface-2 rounded" />
      <div className="h-3 w-5/6 bg-surface-2 rounded" />
      <div className="h-3 w-4/6 bg-surface-2 rounded" />
      <div className="h-3 w-3/6 bg-surface-2 rounded" />
    </div>
  );
}
