.PHONY: install migrate api web worker gen-api test eval build

install:
	python3 -m pip install --user -r requirements-backend.txt -r requirements-dev.txt
	npm install

migrate:
	python3 -m alembic upgrade head

api:
	python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8000

web:
	npm run dev -- -p 3003

worker:
	python3 -m celery -A ingestion.celery_app.celery_app worker --loglevel=INFO

gen-api:
	DATABASE_URL=$${DATABASE_URL:-postgresql+psycopg://antho@localhost:5432/veridicta_m1} AUTH_SECRET=$${AUTH_SECRET:-local-openapi-secret-with-at-least-thirty-two-bytes} python3 -c "import json; from pathlib import Path; from api.main import app; Path('api/openapi.json').write_text(json.dumps(app.openapi(), indent=2), encoding='utf-8')"
	npm run gen:api

test:
	python3 -m pytest
	npm run lint
	npm run typecheck
	npm test

eval:
	python3 evals/run_milestone2_eval.py --limit 10

build:
	npm run build
