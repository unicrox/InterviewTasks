from fastapi import FastAPI

app = FastAPI(
    title="House Price Prediction API",
    version="0.1.0",
    description="Task 1 FastAPI service for housing price prediction.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

