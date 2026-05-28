from typing import Annotated

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from model_api.model import ARTIFACT_PATH, FEATURE_COLUMNS

app = FastAPI(
    title="House Price Prediction API",
    version="0.1.0",
    description="Task 1 FastAPI service for housing price prediction.",
)


class HousingFeatures(BaseModel):
    square_footage: Annotated[float, Field(gt=0)]
    bedrooms: Annotated[float, Field(ge=0)]
    bathrooms: Annotated[float, Field(ge=0)]
    year_built: Annotated[int, Field(ge=1800, le=2100)]
    lot_size: Annotated[float, Field(gt=0)]
    distance_to_city_center: Annotated[float, Field(ge=0)]
    school_rating: Annotated[float, Field(ge=0, le=10)]


class PredictionResponse(BaseModel):
    predictions: list[float]
    count: int


class ModelInfoResponse(BaseModel):
    model_type: str
    alpha: float
    feature_columns: list[str]
    target_column: str
    training_rows: int
    evaluation_rows: int
    metrics: dict[str, float]
    intercept: float
    coefficients: dict[str, float]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict")
def predict(payload: HousingFeatures | list[HousingFeatures]) -> PredictionResponse:
    # -- Load the trained model artifact before running prediction.
    if not ARTIFACT_PATH.exists():
        raise HTTPException(status_code=503, detail="Model artifact not found. Run training first.")

    artifact = joblib.load(ARTIFACT_PATH)
    rows = payload if isinstance(payload, list) else [payload]
    prediction_input = pd.DataFrame([row.model_dump() for row in rows], columns=FEATURE_COLUMNS)
    predictions = artifact["model"].predict(prediction_input)

    return PredictionResponse(
        predictions=[round(float(prediction), 2) for prediction in predictions],
        count=len(predictions),
    )


@app.get("/model-info")
def model_info() -> ModelInfoResponse:
    # -- Load the trained model artifact and return its metadata.
    if not ARTIFACT_PATH.exists():
        raise HTTPException(status_code=503, detail="Model artifact not found. Run training first.")

    artifact = joblib.load(ARTIFACT_PATH)

    return ModelInfoResponse(
        model_type=artifact["model_type"],
        alpha=artifact["alpha"],
        feature_columns=artifact["feature_columns"],
        target_column=artifact["target_column"],
        training_rows=artifact["training_rows"],
        evaluation_rows=artifact["evaluation_rows"],
        metrics=artifact["metrics"],
        intercept=artifact["intercept"],
        coefficients=artifact["coefficients"],
    )
