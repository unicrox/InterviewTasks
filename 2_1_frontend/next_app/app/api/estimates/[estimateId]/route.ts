import { NextResponse } from "next/server"

const PYTHON_SERVER_URL = (
  process.env.PYTHON_SERVER_URL ?? "http://localhost:8001"
).replace(/\/$/, "")

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ estimateId: string }> }
) {
  const { estimateId } = await params

  try {
    const response = await fetch(`${PYTHON_SERVER_URL}/estimates/${estimateId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(await request.json()),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to update estimate: HTTP ${response.status}` },
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
