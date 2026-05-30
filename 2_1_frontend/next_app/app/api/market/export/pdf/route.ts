const JAVA_SERVER_URL = (process.env.JAVA_SERVER_URL ?? "http://localhost:8080").replace(/\/$/, "")

export async function GET() {
  const response = await fetch(`${JAVA_SERVER_URL}/api/market/export/pdf`, {
    cache: "no-store",
  })
  const body = await response.arrayBuffer()

  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Disposition": response.headers.get("Content-Disposition") ?? "attachment; filename=\"market-summary.pdf\"",
      "Content-Type": response.headers.get("Content-Type") ?? "application/pdf",
    },
  })
}
