import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function HistorySearch({ value, onChange }: Props) {
  return (
    <div className="relative px-3 pb-3">
      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search reviews…"
        className={cn(
          "pl-8 h-8 text-[12.5px] font-mono",
          "bg-surface-2/60 border-border text-text",
          "placeholder:text-text-dim",
          "focus-visible:border-brand/50 focus-visible:ring-0 focus-visible:bg-surface-2"
        )}
      />
      <kbd className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] text-text-dim font-mono">
        ⌘K
      </kbd>
    </div>
  );
}
