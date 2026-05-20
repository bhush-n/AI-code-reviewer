import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { getLanguage } from "@/lib/languages";
import type { ReviewSummary } from "@/lib/api";

interface Props {
  item: ReviewSummary;
  active: boolean;
  onClick: () => void;
}

export function HistoryItem({ item, active, onClick }: Props) {
  const lang = getLanguage(item.language);
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2",
        "hover:bg-surface-2 transition-colors",
        active && "bg-surface-2"
      )}
    >
      <span className={cn("w-2 h-2 rounded-full shrink-0", lang.dotColor)} />
      <span className="flex-1 truncate" title={item.title}>
        {item.title}
      </span>
      <span className="text-xs text-text-muted shrink-0">
        {formatDistanceToNow(new Date(item.created_at), { addSuffix: false })}
      </span>
    </button>
  );
}
