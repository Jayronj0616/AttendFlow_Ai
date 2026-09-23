export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold text-card-foreground">
          AttendFlow AI
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          AI-assisted attendance correction with deterministic business rules,
          human approval, and a complete audit trail.
        </p>
        <p className="mt-6 text-xs text-muted-foreground">
          Foundation ready. Authentication arrives in Phase 3.
        </p>
      </div>
    </main>
  );
}
