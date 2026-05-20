import { useUI } from "@/store/ui";
import { cn } from "@/lib/utils";

export function HistorySidebar() {
  const open = useUI((s) => s.sidebarOpen);
  return (
    <aside
      className={cn(
        "h-full border-r border-border bg-surface transition-[width] duration-200",
        open ? "w-[280px]" : "w-[56px]"
      )}
    >
      <div className="p-4 text-text-muted text-sm">{open ? "History" : "≡"}</div>
    </aside>
  );
}
