import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function ReviewButton({ loading, disabled, onClick }: Props) {
  return (
    <Button
      size="lg"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "review-glow bg-accent text-white hover:bg-accent/90 gap-2",
        "transition-all"
      )}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Reviewing...
        </>
      ) : (
        <>
          Review Code
          <ArrowRight className="w-4 h-4" />
          <kbd className="ml-2 text-xs opacity-70">⌘↵</kbd>
        </>
      )}
    </Button>
  );
}
