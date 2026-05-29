import { NextResponse } from "next/server"

const PYTHON_SERVER_URL = (
  process.env.PYTHON_SERVER_URL ?? "http://localhost:8001"
).replace(/\/$/, "")

export async function GET() {
  try {
    const response = await fetch(`${PYTHON_SERVER_URL}/estimates`, {
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to load estimates: HTTP ${response.status}` },
        { status: response.status }
      )
    }

    return NextResponse.json(await response.json())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to connect to backend" },
      { status: 503 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const response = await fetch(`${PYTHON_SERVER_URL}/estimate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(await request.json()),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to create estimate: HTTP ${response.status}` },
        { status: response.status }
      )
    }

    return NextResponse.json(await response.json(), { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to connect to backend" },
      { status: 503 }
    )
  }
}
