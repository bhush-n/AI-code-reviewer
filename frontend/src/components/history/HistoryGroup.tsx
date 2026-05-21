import type { ReactNode } from "react";

interface Props {
  label: string;
  children: ReactNode;
}

export function HistoryGroup({ label, children }: Props) {
  return (
    <div className="mb-4">
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-text-dim font-mono font-semibold">
        {label}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}
