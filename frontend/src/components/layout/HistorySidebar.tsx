import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
      <aside className="h-full w-[56px] border-r border-border bg-surface flex flex-col items-center py-3 gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="New review"
          onClick={() => setCurrentReview(null)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="h-full w-[280px] border-r border-border bg-surface flex flex-col">
      <div className="p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setCurrentReview(null)}
        >
          <Plus className="w-4 h-4" /> New review
        </Button>
      </div>
      <HistorySearch value={search} onChange={setSearch} />
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {isLoading && (
          <div className="px-3 text-xs text-text-muted">Loading...</div>
        )}
        {!isLoading && reviews.length === 0 && (
          <div className="px-3 text-xs text-text-muted">No reviews yet.</div>
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
                      "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded",
                      "opacity-0 group-hover:opacity-100 hover:bg-danger/10 hover:text-danger"
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
    </aside>
  );
}
