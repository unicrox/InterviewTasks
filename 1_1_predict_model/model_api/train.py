from __future__ import annotations

import joblib

from model_api.model import ARTIFACT_PATH, train_ridge_model


def main() -> None:
    artifact = train_ridge_model(alpha=1.0)

    # -- Save the trained model and metadata to the requested artifact path.
    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, ARTIFACT_PATH)

    print(f"Saved Ridge model artifact to {ARTIFACT_PATH}")
    print(f"Training rows: {artifact['training_rows']}")
    print(f"Evaluation rows: {artifact['evaluation_rows']}")
    print("Metrics:")
    for name, value in artifact["metrics"].items():
        print(f"  {name}: {value:.4f}")


if __name__ == "__main__":
    main()
