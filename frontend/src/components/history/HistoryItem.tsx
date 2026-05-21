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
        "group/item w-full text-left px-3 py-2 rounded-md text-[13px] flex items-center gap-2.5 relative",
        "transition-colors duration-150",
        active
          ? "bg-gradient-to-r from-brand/15 to-transparent text-text"
          : "hover:bg-surface-2 text-text-muted hover:text-text"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-gradient-to-b from-brand to-brand-2 rounded-full shadow-[0_0_8px_var(--brand-glow)]" />
      )}
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_6px_currentColor]",
          lang.dotColor
        )}
      />
      <span className="flex-1 truncate" title={item.title}>
        {item.title}
      </span>
      <span className="text-[10px] text-text-dim shrink-0 font-mono uppercase tracking-wider">
        {formatDistanceToNow(new Date(item.created_at), { addSuffix: false })}
      </span>
    </button>
  );
}
