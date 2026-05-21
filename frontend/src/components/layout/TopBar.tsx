import { Menu, Moon, Sun, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useUI } from "@/store/ui";
import { LANGUAGES, getLanguage } from "@/lib/languages";
import { cn } from "@/lib/utils";

export function TopBar() {
  const { language, setLanguage, theme, toggleTheme, toggleSidebar } = useUI();
  const current = getLanguage(language);

  return (
    <header
      className={cn(
        "h-14 flex items-center px-4 gap-3 relative",
        "bg-surface/70 backdrop-blur-xl",
        "border-b border-border"
      )}
    >
      {/* Subtle gradient underline */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        className="text-text-muted hover:text-text"
      >
        <Menu className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-2.5">
        {/* Brand glyph */}
        <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center shadow-[0_0_20px_-4px_var(--brand-glow)]">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <div className="absolute inset-0 rounded-lg ring-1 ring-white/20" />
        </div>
        <div className="font-display font-semibold tracking-tight text-[15px]">
          <span className="gradient-text">AI Code Reviewer</span>
        </div>
        <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-medium font-mono bg-surface-2 text-text-muted border border-border">
          beta
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              data-shortcut="language"
              className={cn(
                "gap-2 bg-surface-2 border-border-strong text-text",
                "hover:bg-surface-3 hover:border-brand/40 transition-colors"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]", current.dotColor)} />
              <span className="font-mono text-[12px]">{current.label}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-surface border-border-strong">
            {LANGUAGES.map((l) => (
              <DropdownMenuItem
                key={l.label}
                onClick={() => setLanguage(l.label)}
                className="gap-2 font-mono text-[12.5px]"
              >
                <span className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]", l.dotColor)} />
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="text-text-muted hover:text-text"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  );
}
