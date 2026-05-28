from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

FEATURE_COLUMNS = [
    "square_footage",
    "bedrooms",
    "bathrooms",
    "year_built",
    "lot_size",
    "distance_to_city_center",
    "school_rating",
]
TARGET_COLUMN = "price"

DATA_PATH = Path("/app/data/House Price Dataset.csv")  # Docker training dataset path.
TEST_DATA_PATH = Path("/app/data/Test Data For Prediction.csv")  # Docker prediction sample dataset path.
ARTIFACT_PATH = Path("/app/artifacts/ridge_model.joblib")  # Docker model artifact path.


def train_ridge_model(alpha: float = 1.0) -> dict[str, Any]:
    data = pd.read_csv(DATA_PATH, encoding="utf-8-sig")
    missing_columns = sorted({*FEATURE_COLUMNS, TARGET_COLUMN} - set(data.columns))  # Convert set to sorted list.
    if missing_columns:
        raise ValueError(f"Training data is missing required columns: {missing_columns}")

    x = data[FEATURE_COLUMNS]
    y = data[TARGET_COLUMN]
    x_train, x_test, y_train, y_test = train_test_split(
        x,  # Feature columns used to predict price.
        y,  # Target prices.
        test_size=0.2,  # Reserve 20% of rows for holdout evaluation.
        random_state=42,  # Keep the train/test split deterministic.
    )

    # -- Train on the split data first so we can report holdout metrics.
    evaluation_model = Pipeline(
        steps=[
            ("scaler", StandardScaler()),  # Normalize feature scales before regression.
            ("ridge", Ridge(alpha=alpha)),  # Train Ridge regression with L2 regularization.
        ]
    )
    evaluation_model.fit(x_train, y_train)
    predictions = evaluation_model.predict(x_test)

    # -- Train the saved model on all available rows after evaluation is complete.
    final_model = Pipeline(
        steps=[
            ("scaler", StandardScaler()),  # Normalize feature scales before regression.
            ("ridge", Ridge(alpha=alpha)),  # Train Ridge regression with L2 regularization.
        ]
    )
    final_model.fit(x, y)
    ridge = final_model.named_steps["ridge"]

    return {
        "model": final_model,
        "model_type": "Ridge",
        "alpha": alpha,
        "feature_columns": FEATURE_COLUMNS,
        "target_column": TARGET_COLUMN,
        "training_rows": int(len(data)),
        "evaluation_rows": int(len(x_test)),
        "metrics": {
            "r2": float(r2_score(y_test, predictions)),  # R2 = 1 - SS_res / SS_tot; higher is better. 0 - 1.
            "mae": float(mean_absolute_error(y_test, predictions)),  # MAE = mean(abs(actual - predicted)).
            "rmse": float(np.sqrt(mean_squared_error(y_test, predictions))),  # RMSE = sqrt(mean((actual - predicted)^2)).
        },
        "intercept": float(ridge.intercept_),  # Baseline prediction before feature coefficients are applied.
        "coefficients": {
            feature: float(coefficient)
            for feature, coefficient in zip(FEATURE_COLUMNS, ridge.coef_, strict=True)
        },
    }
