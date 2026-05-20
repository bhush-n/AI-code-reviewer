import { useEffect } from "react";
import { useUI } from "@/store/ui";

export function useShortcuts() {
  const { toggleSidebar } = useUI();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>(
          'input[placeholder="Search reviews..."]'
        );
        el?.focus();
        return;
      }

      if (meta && e.key.toLowerCase() === "l") {
        e.preventDefault();
        const trigger = document.querySelector<HTMLButtonElement>(
          'button[data-shortcut="language"]'
        );
        trigger?.click();
        return;
      }

      if (e.key === "Escape") {
        const el = document.activeElement as HTMLElement | null;
        if (el && el.tagName !== "BODY") el.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);
}
