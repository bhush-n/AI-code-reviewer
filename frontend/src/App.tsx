import { TopBar } from "@/components/layout/TopBar";
import { HistorySidebar } from "@/components/layout/HistorySidebar";
import { Workspace } from "@/components/layout/Workspace";

export default function App() {
  return (
    <div className="h-full flex flex-col bg-bg text-text">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <HistorySidebar />
        <Workspace />
      </div>
    </div>
  );
}
