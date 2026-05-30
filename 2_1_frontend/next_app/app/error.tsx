"use client"

import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-[calc(100svh-3.5rem)] px-6 py-10">
      <section className="mx-auto w-full max-w-5xl">
        <div className="max-w-xl">
          <h1 className="text-3xl font-semibold tracking-normal">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error.message || "The page could not be loaded."}
          </p>
          <Button type="button" className="mt-6" onClick={reset}>
            <RefreshCw />
            Try again
          </Button>
        </div>
      </section>
    </main>
  )
}
