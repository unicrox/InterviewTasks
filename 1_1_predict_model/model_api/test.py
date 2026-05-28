from __future__ import annotations

import joblib
import pandas as pd

from model_api.model import ARTIFACT_PATH, FEATURE_COLUMNS, TEST_DATA_PATH


def main() -> None:
    if not ARTIFACT_PATH.exists():
        raise FileNotFoundError(f"Model artifact not found. Run training first: {ARTIFACT_PATH}")

    artifact = joblib.load(ARTIFACT_PATH)
    test_data = pd.read_csv(TEST_DATA_PATH, encoding="utf-8-sig")

    missing_columns = sorted(set(FEATURE_COLUMNS) - set(test_data.columns))  # Convert set to sorted list.
    if missing_columns:
        raise ValueError(f"Test data is missing required columns: {missing_columns}")

    predictions = artifact["model"].predict(test_data[FEATURE_COLUMNS])
    output = test_data.copy()
    output["predicted_price"] = predictions.round(2)

    print(output.to_string(index=False))


if __name__ == "__main__":
    main()
