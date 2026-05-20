import type { ReactNode } from "react";

interface Props {
  label: string;
  children: ReactNode;
}

export function HistoryGroup({ label, children }: Props) {
  return (
    <div className="mb-4">
      <div className="px-3 py-1 text-[11px] uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}
