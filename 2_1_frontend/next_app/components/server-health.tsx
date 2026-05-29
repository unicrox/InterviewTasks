"use client"

import { useEffect, useState } from "react"

type HealthState = {
  pythonServer: {
    status: "checking" | "running" | "failed"
    error?: string
  }
  modelApi: {
    status: "checking" | "running" | "failed" | "unknown"
    error?: string | null
  }
}

export function ServerHealth() {
  const [health, setHealth] = useState<HealthState>({
    pythonServer: { status: "checking" },
    modelApi: { status: "checking" },
  })

  useEffect(() => {
    let cancelled = false

    async function checkHealth() {
      try {
        const response = await fetch("/api/health", { cache: "no-store" })
        const nextHealth = (await response.json()) as HealthState

        if (!cancelled) {
          setHealth(nextHealth)
        }
      } catch (error) {
        if (!cancelled) {
          setHealth({
            pythonServer: {
              status: "failed",
              error: error instanceof Error ? error.message : "Failed to connect",
            },
            modelApi: { status: "unknown" },
          })
        }
      }
    }

    void checkHealth()
    const intervalId = window.setInterval(checkHealth, 10_000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  const pythonStatusText =
    health.pythonServer.status === "running"
      ? "running"
      : health.pythonServer.status === "checking"
        ? "checking"
        : "failed to connect"

  const modelStatusText =
    health.modelApi.status === "running"
      ? "running"
      : health.modelApi.status === "checking"
        ? "checking"
        : health.modelApi.status === "unknown"
          ? "unknown"
          : "failed to connect"

  const pythonStatusClass =
    health.pythonServer.status === "running"
      ? "text-green-600 dark:text-green-400"
      : health.pythonServer.status === "failed"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground"

  const modelStatusClass =
    health.modelApi.status === "running"
      ? "text-green-600 dark:text-green-400"
      : health.modelApi.status === "failed"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground"

  return (
    <div className="mt-6 space-y-2 text-center text-sm">
      <p>
        <span className="text-muted-foreground">Python server: </span>
        <span className={pythonStatusClass}>{pythonStatusText}</span>
      </p>
      <p>
        <span className="text-muted-foreground">Model server: </span>
        <span className={modelStatusClass}>{modelStatusText}</span>
      </p>
    </div>
  )
}
