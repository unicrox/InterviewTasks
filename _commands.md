# Commands

## Task 1: Model API

Train the Ridge regression model:

```bash
docker compose exec model-api python -m model_api.train
```

Run predictions for the supplied test data:

```bash
docker compose exec model-api python -m model_api.test
```

Start or rebuild the service:

```bash
docker compose up --build
```

Stop the service:

```bash
docker compose down
```

View logs:

```bash
docker compose logs -f model-api
```

Check the API:

```bash
curl http://localhost:8000/health
```

Open the API docs:

```text
http://localhost:8000/docs
```
