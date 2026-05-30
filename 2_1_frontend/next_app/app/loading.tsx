export default function Loading() {
  return (
    <main className="min-h-[calc(100svh-3.5rem)] px-6 py-10">
      <section className="mx-auto w-full max-w-5xl">
        <div className="space-y-6">
          <div>
            <div className="h-8 w-44 animate-pulse rounded-md bg-muted" />
            <div className="mt-3 h-4 w-64 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="space-y-3">
            <div className="h-10 animate-pulse rounded-md bg-muted" />
            <div className="h-20 animate-pulse rounded-md bg-muted" />
            <div className="h-20 animate-pulse rounded-md bg-muted" />
            <div className="h-20 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </section>
    </main>
  )
}
