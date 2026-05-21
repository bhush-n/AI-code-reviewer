import { TopBar } from "@/components/layout/TopBar";
import { HistorySidebar } from "@/components/layout/HistorySidebar";
import { Workspace } from "@/components/layout/Workspace";
import { Toaster } from "@/components/ui/sonner";
import { useShortcuts } from "@/hooks/useShortcuts";

export default function App() {
  useShortcuts();
  return (
    <div className="h-full flex flex-col bg-bg text-text">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <HistorySidebar />
        <Workspace />
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
