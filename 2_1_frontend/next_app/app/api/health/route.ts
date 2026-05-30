import { NextResponse } from "next/server"

const PYTHON_SERVER_URL = (
  process.env.PYTHON_SERVER_URL ?? "http://localhost:8001"
).replace(/\/$/, "")
const JAVA_SERVER_URL = (process.env.JAVA_SERVER_URL ?? "http://localhost:8080").replace(/\/$/, "")

export async function GET() {
  // -- Proxy backend health through Next.js so the browser avoids CORS,
  // -- keeps backend URLs server-side, and always gets one normalized
  // -- response shape.
  let javaServer: {
    status: "running" | "failed"
    url: string
    error?: string
  }

  try {
    const javaResponse = await fetch(`${JAVA_SERVER_URL}/actuator/health`, {
      cache: "no-store",
    })
    const javaHealth = await javaResponse.json()

    javaServer = {
      status: javaResponse.ok && javaHealth.status === "UP" ? "running" : "failed",
      url: JAVA_SERVER_URL,
      error: javaResponse.ok ? undefined : `HTTP ${javaResponse.status}`,
    }
  } catch (error) {
    javaServer = {
      status: "failed",
      url: JAVA_SERVER_URL,
      error: error instanceof Error ? error.message : "Failed to connect",
    }
  }

  try {
    const response = await fetch(`${PYTHON_SERVER_URL}/health`, {
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json({
        pythonServer: {
          status: "failed",
          error: `HTTP ${response.status}`,
        },
        modelApi: {
          status: "unknown",
        },
        javaServer,
      })
    }

    const health = await response.json()

    return NextResponse.json({
      pythonServer: {
        status: health.status === "ok" ? "running" : "failed",
        storedEstimates: health.stored_estimates,
      },
      modelApi: {
        status: health.model_api_status === "ok" ? "running" : "failed",
        url: health.model_api_url,
        error: health.model_api_error,
      },
      javaServer,
    })
  } catch (error) {
    return NextResponse.json({
      pythonServer: {
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to connect",
      },
      modelApi: {
        status: "unknown",
      },
      javaServer,
    })
  }
}
