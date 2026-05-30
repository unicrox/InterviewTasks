import { NextResponse } from "next/server"

const JAVA_SERVER_URL = (process.env.JAVA_SERVER_URL ?? "http://localhost:8080").replace(/\/$/, "")

export async function POST(request: Request) {
  try {
    const response = await fetch(`${JAVA_SERVER_URL}/api/market/what-if`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(await request.json()),
    })
    const payload = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: payload.message ?? `Java server returned HTTP ${response.status}` },
        { status: response.status }
      )
    }

    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to connect to Java server" },
      { status: 503 }
    )
  }
}
