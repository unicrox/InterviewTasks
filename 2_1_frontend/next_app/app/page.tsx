import { ServerHealth } from "@/components/server-health"

export default function Page() {
  return (
    <main className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center px-6">
      <div>
        <h1 className="text-center text-6xl font-semibold tracking-normal sm:text-8xl">
          Welcome
        </h1>
        <ServerHealth />
      </div>
    </main>
  )
}
