# Interview Tasks

This repository contains the implementation workspace for the full-stack interview tasks.

## Requirements Summary

### Task 1: Housing Price Prediction Model API

Build a Python 3.12+ FastAPI service that trains and serves a simple scikit-learn regression model for housing price prediction.

Required endpoints:

- `POST /predict` accepts single or batch housing feature inputs and returns predicted prices.
- `GET /model-info` returns model coefficients and performance metrics.
- `GET /health` returns a basic service health check.

Deliverables include source code, a Dockerfile, and a live Swagger/OpenAPI demo during the interview.

### Task 2: Multi-Application Next.js Portal

Build a unified Next.js App Router portal that hosts two applications with a shared layout, navigation, design system, loading states, and error handling.

- `Property Value Estimator`: frontend form and comparison views backed by a Python service that integrates with the ML model container.
- `Property Market Analysis`: dashboard, filters, what-if analysis, exports, and sortable tables backed by a Java 21 / Spring Boot 3.4.4 service.

## Repository Structure

```text
.
├── 1_1_predict_model/      # Task 1 FastAPI ML model service
├── 2_1_frontend/           # Task 2 Next.js portal
├── 2_2_backend_py/         # Task 2 Python backend
├── 2_3_backend_java/       # Task 2 Java Spring Boot backend
└── _requirements/          # Original task brief and datasets
```

## Data

The supplied data is stored in `_requirements/`:

- `House Price Dataset.csv`: training data with 50 rows.
- `Test Data For Prediction.csv`: sample prediction data with 10 rows.
- `Interview Tasks Fullstack.pdf`: original task brief.

Model input fields:

- `square_footage`
- `bedrooms`
- `bathrooms`
- `year_built`
- `lot_size`
- `distance_to_city_center`
- `school_rating`

Training data also includes `id` and target field `price`.

## Notes

Keep generated files, local environments, dependency folders, model artifacts, and build outputs out of git. See `.gitignore` for the current ignore rules.

## Task 1 Docker

Task 1 is configured as a Dockerized FastAPI service. The API code lives under `1_1_predict_model/model_api`. Start it with:

```bash
docker compose up --build
```

The model API will be available at:

- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`
