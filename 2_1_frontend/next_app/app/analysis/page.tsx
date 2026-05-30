import { AnalysisDashboard } from "@/components/analysis-dashboard"

export default function AnalysisPage() {
  return (
    <main className="min-h-[calc(100svh-3.5rem)] px-6 py-10">
      <section className="mx-auto w-full max-w-5xl">
        <AnalysisDashboard />
      </section>
    </main>
  )
}
