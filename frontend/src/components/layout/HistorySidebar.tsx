import { useMemo, useState } from "react";
import { Plus, Trash2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUI } from "@/store/ui";
import { useReviewsList, useDeleteReview } from "@/hooks/useReviews";
import { groupByDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { HistorySearch } from "@/components/history/HistorySearch";
import { HistoryGroup } from "@/components/history/HistoryGroup";
import { HistoryItem } from "@/components/history/HistoryItem";

export function HistorySidebar() {
  const open = useUI((s) => s.sidebarOpen);
  const { currentReviewId, setCurrentReview } = useUI();
  const { data: reviews = [], isLoading } = useReviewsList();
  const del = useDeleteReview();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      search.trim()
        ? reviews.filter((r) =>
            r.title.toLowerCase().includes(search.toLowerCase())
          )
        : reviews,
    [reviews, search]
  );

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  if (!open) {
    return (
      <aside className="h-full w-[56px] border-r border-border bg-surface/60 backdrop-blur-xl flex flex-col items-center py-3 gap-2 relative">
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-brand/20 to-transparent" />
        <Button
          variant="ghost"
          size="icon"
          aria-label="New review"
          onClick={() => setCurrentReview(null)}
          className="text-text-muted hover:text-brand hover:bg-brand/10"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="h-full w-[280px] border-r border-border bg-surface/60 backdrop-blur-xl flex flex-col relative">
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-brand/20 to-transparent" />

      <div className="p-3 pb-2">
        <Button
          onClick={() => setCurrentReview(null)}
          className={cn(
            "w-full justify-start gap-2 h-9 text-[13px] font-medium",
            "bg-gradient-to-br from-brand/15 to-brand-2/10",
            "border border-brand/30 hover:border-brand/60",
            "text-text hover:text-white",
            "transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          New review
        </Button>
      </div>

      <HistorySearch value={search} onChange={setSearch} />

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {isLoading && (
          <div className="px-3 text-[11px] text-text-dim uppercase tracking-wider font-mono">
            Loading…
          </div>
        )}
        {!isLoading && reviews.length === 0 && (
          <div className="px-3 py-8 text-center text-text-muted text-sm flex flex-col items-center gap-2">
            <Inbox className="w-5 h-5 text-text-dim" />
            <span>No reviews yet</span>
            <span className="text-[11px] text-text-dim">Your past reviews will appear here.</span>
          </div>
        )}
        {(Object.keys(groups) as Array<keyof typeof groups>).map((label) =>
          groups[label].length > 0 ? (
            <HistoryGroup key={label} label={label}>
              {groups[label].map((item) => (
                <div key={item.id} className="group relative">
                  <HistoryItem
                    item={item}
                    active={item.id === currentReviewId}
                    onClick={() => setCurrentReview(item.id)}
                  />
                  <button
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md",
                      "opacity-0 group-hover:opacity-100 transition-opacity",
                      "hover:bg-danger/15 text-text-muted hover:text-danger"
                    )}
                    aria-label="Delete review"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${item.title}"?`)) {
                        del.mutate(item.id);
                        if (item.id === currentReviewId) setCurrentReview(null);
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </HistoryGroup>
          ) : null
        )}
      </div>

      <div className="border-t border-border px-4 py-3 text-[10px] text-text-dim font-mono tracking-wider uppercase flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_currentColor] pulse-soft" />
        Connected · Groq LLaMA 3.1
      </div>
    </aside>
  );
}
