export function Workspace() {
  return (
    <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 grid-rows-2 lg:grid-rows-1 gap-px bg-border">
      <section className="bg-bg p-6 bg-radial-accent">
        <div className="text-text-muted text-sm">Code editor placeholder</div>
      </section>
      <section className="bg-bg p-6">
        <div className="text-text-muted text-sm">Review panel placeholder</div>
      </section>
    </main>
  );
}
