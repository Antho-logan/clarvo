"""Celery application for background ingestion work."""

from __future__ import annotations

import os

from celery import Celery


def get_celery_app() -> Celery:
    broker_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    app = Celery(
        "veridicta_ingestion",
        broker=broker_url,
        backend=os.getenv("CELERY_RESULT_BACKEND", broker_url),
        include=["ingestion.tasks"],
    )
    app.conf.update(
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        task_track_started=True,
        worker_prefetch_multiplier=1,
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
    )
    return app


celery_app = get_celery_app()
