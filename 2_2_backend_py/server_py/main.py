from typing import Annotated
from contextlib import asynccontextmanager
import csv
from datetime import datetime
import os
from pathlib import Path
from uuid import uuid4

import arrow
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

MODEL_API_URL = os.getenv("MODEL_API_URL", "http://localhost:8000").rstrip("/")
MODEL_API_TIMEOUT_SECONDS = float(os.getenv("MODEL_API_TIMEOUT_SECONDS", "10"))
DEFAULT_TEST_DATA_PATH = Path(__file__).resolve().parents[2] / "_requirements" / "Test Data For Prediction.csv"
TEST_DATA_PATH = Path(os.getenv("TEST_DATA_PATH", DEFAULT_TEST_DATA_PATH))


class HousingFeatures(BaseModel):
    square_footage: Annotated[float, Field(gt=0)]
    bedrooms: Annotated[float, Field(ge=0)]
    bathrooms: Annotated[float, Field(ge=0)]
    year_built: Annotated[int, Field(ge=1800, le=2100)]
    lot_size: Annotated[float, Field(gt=0)]
    distance_to_city_center: Annotated[float, Field(ge=0)]
    school_rating: Annotated[float, Field(ge=0, le=10)]


class EstimateRequest(BaseModel):
    label: str | None = None
    features: HousingFeatures


class EstimateRecord(BaseModel):
    id: str
    label: str | None
    features: HousingFeatures
    predicted_price: float | None
    created_at: datetime


class EstimateListResponse(BaseModel):
    items: list[EstimateRecord]
    count: int


class DeleteEstimateResponse(BaseModel):
    id: str
    deleted: bool


class HealthResponse(BaseModel):
    status: str
    model_api_url: str
    model_api_status: str
    model_api_error: str | None = None
    stored_estimates: int


ESTIMATES: dict[str, EstimateRecord] = {}


async def load_seed_estimates() -> None:
    if ESTIMATES or not TEST_DATA_PATH.exists():
        return

    with TEST_DATA_PATH.open(newline="", encoding="utf-8-sig") as test_data:
        seed_features = [HousingFeatures.model_validate(row) for row in csv.DictReader(test_data)]

    predictions: list[float | None] = [None] * len(seed_features)

    # -- Batch request predictions for seeded rows when the model API is available.
    try:
        async with httpx.AsyncClient(timeout=MODEL_API_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{MODEL_API_URL}/predict",
                json=[features.model_dump() for features in seed_features],
            )
        response.raise_for_status()
        prediction_values = response.json().get("predictions", [])
        if isinstance(prediction_values, list) and len(prediction_values) == len(seed_features):
            predictions = [round(float(prediction), 2) for prediction in prediction_values]
    except httpx.HTTPError:
        pass

    created_at = arrow.utcnow().datetime
    for index, features in enumerate(seed_features):
        estimate = EstimateRecord(
            id=str(uuid4()),
            label=f"Test Data Row {index + 1}",
            features=features,
            predicted_price=predictions[index],
            created_at=created_at,
        )
        ESTIMATES[estimate.id] = estimate


@asynccontextmanager
async def lifespan(app: FastAPI):
    await load_seed_estimates()
    yield


app = FastAPI(
    title="Property Value Estimator Backend",
    version="0.1.0",
    description="Task 2 Python backend for property value estimation history and model API integration.",
    lifespan=lifespan,
)


@app.get("/health")
async def health() -> HealthResponse:
    model_api_status = "ok"
    model_api_error = None

    try:
        async with httpx.AsyncClient(timeout=MODEL_API_TIMEOUT_SECONDS) as client:
            response = await client.get(f"{MODEL_API_URL}/health")
        response.raise_for_status()
        model_health = response.json()
        if model_health.get("status") != "ok":
            model_api_status = "unhealthy"
            model_api_error = f"Unexpected health response: {model_health}"
    except httpx.HTTPStatusError as exc:
        model_api_status = "unhealthy"
        model_api_error = f"HTTP {exc.response.status_code}: {exc.response.text}"
    except httpx.HTTPError as exc:
        model_api_status = "unavailable"
        model_api_error = str(exc)

    return HealthResponse(
        status="ok",
        model_api_url=MODEL_API_URL,
        model_api_status=model_api_status,
        model_api_error=model_api_error,
        stored_estimates=len(ESTIMATES),
    )


@app.post("/estimate")
async def create_estimate(payload: EstimateRequest) -> EstimateRecord:
    # -- Ask the model API for one prediction, then persist the returned estimate in memory.
    try:
        async with httpx.AsyncClient(timeout=MODEL_API_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{MODEL_API_URL}/predict",
                json=payload.features.model_dump(),
            )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"Model API prediction failed: {exc.response.text}",
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Model API unavailable: {exc}",
        ) from exc

    prediction_payload = response.json()
    predictions = prediction_payload.get("predictions")
    if not isinstance(predictions, list) or not predictions:
        raise HTTPException(status_code=502, detail="Model API returned no predictions.")

    estimate = EstimateRecord(
        id=str(uuid4()),
        label=payload.label,
        features=payload.features,
        predicted_price=round(float(predictions[0]), 2),
        created_at=arrow.utcnow().datetime,
    )
    ESTIMATES[estimate.id] = estimate

    return estimate


@app.get("/estimates")
def list_estimates() -> EstimateListResponse:
    return EstimateListResponse(
        items=sorted(ESTIMATES.values(), key=lambda estimate: estimate.created_at, reverse=True),
        count=len(ESTIMATES),
    )


@app.get("/estimates/{estimate_id}")
def get_estimate(estimate_id: str) -> EstimateRecord:
    estimate = ESTIMATES.get(estimate_id)
    if estimate is None:
        raise HTTPException(status_code=404, detail=f"Estimate not found: {estimate_id}")

    return estimate


@app.delete("/estimates/{estimate_id}")
def delete_estimate(estimate_id: str) -> DeleteEstimateResponse:
    if estimate_id not in ESTIMATES:
        raise HTTPException(status_code=404, detail=f"Estimate not found: {estimate_id}")

    del ESTIMATES[estimate_id]
    return DeleteEstimateResponse(id=estimate_id, deleted=True)


@app.get("/model-info")
async def model_info() -> dict:
    # -- Proxy model metadata from the Task 1 prediction service.
    try:
        async with httpx.AsyncClient(timeout=MODEL_API_TIMEOUT_SECONDS) as client:
            response = await client.get(f"{MODEL_API_URL}/model-info")
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"Model API metadata lookup failed: {exc.response.text}",
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Model API unavailable: {exc}",
        ) from exc

    return response.json()
