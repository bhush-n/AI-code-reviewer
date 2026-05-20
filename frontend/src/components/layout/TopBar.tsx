import { Menu, Moon, Sun } from "lucide-react";
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
    <header className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
        <Menu className="w-4 h-4" />
      </Button>
      <div className="font-semibold tracking-tight">
        <span className="text-accent">▣</span> AI Code Reviewer
      </div>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              data-shortcut="language"
            >
              <span className={cn("w-2 h-2 rounded-full", current.dotColor)} />
              {current.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {LANGUAGES.map((l) => (
              <DropdownMenuItem key={l.label} onClick={() => setLanguage(l.label)}>
                <span className={cn("w-2 h-2 rounded-full mr-2", l.dotColor)} />
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  );
}
