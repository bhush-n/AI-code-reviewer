import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarOpen: boolean;
  language: string;
  theme: "dark" | "light";
  currentReviewId: number | null;
  toggleSidebar: () => void;
  setLanguage: (l: string) => void;
  toggleTheme: () => void;
  setCurrentReview: (id: number | null) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      language: "Python",
      theme: "dark",
      currentReviewId: null,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setLanguage: (language) => set({ language }),
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === "dark" ? "light" : "dark";
          document.documentElement.classList.toggle("dark", next === "dark");
          return { theme: next };
        }),
      setCurrentReview: (currentReviewId) => set({ currentReviewId }),
    }),
    {
      name: "ai-code-reviewer-ui",
      partialize: (s) => ({
        sidebarOpen: s.sidebarOpen,
        language: s.language,
        theme: s.theme,
      }),
    }
  )
);
