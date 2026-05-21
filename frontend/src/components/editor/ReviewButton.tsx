import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function ReviewButton({ loading, disabled, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "group relative inline-flex items-center gap-2.5 h-10 px-5 rounded-lg",
        "font-semibold text-[13px] tracking-tight text-white",
        "bg-gradient-to-br from-brand via-brand to-brand-2",
        "brand-glow",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none"
      )}
    >
      <span className="absolute inset-0 rounded-lg ring-1 ring-white/15 pointer-events-none" />
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Reviewing…</span>
        </>
      ) : (
        <>
          <span>Review Code</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          <kbd className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/15 text-white/90">
            ⌘↵
          </kbd>
        </>
      )}
    </button>
  );
}
