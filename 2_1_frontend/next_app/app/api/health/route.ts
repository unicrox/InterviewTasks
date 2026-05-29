import { NextResponse } from "next/server"

const PYTHON_SERVER_URL = (
  process.env.PYTHON_SERVER_URL ?? "http://localhost:8001"
).replace(/\/$/, "")

export async function GET() {
  // -- Proxy backend health through Next.js so the browser avoids CORS,
  // -- keeps the Python URL server-side, and always gets one normalized
  // -- response shape.
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
    })
  }
}
