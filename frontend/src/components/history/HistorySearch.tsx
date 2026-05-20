import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function HistorySearch({ value, onChange }: Props) {
  return (
    <div className="relative px-3 mb-3">
      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search reviews..."
        className="pl-7 h-8 text-sm bg-surface-2 border-border"
      />
    </div>
  );
}
