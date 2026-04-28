"""Repository helpers for persisted user settings."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from backend_common import User, UserSettings, get_session_factory, utcnow

DEFAULT_SETTINGS: dict[str, Any] = {
    "theme_preference": "system",
    "bwb_enabled": True,
    "rechtspraak_enabled": True,
    "openai_key_configured": False,
    "cohere_key_configured": False,
    "onboarding_completed": False,
}


def _ensure_user_row(session: Session, user_id: str) -> None:
    """Create a minimal user row for API-issued identities when needed."""
    if session.get(User, user_id) is None:
        session.add(User(id=user_id))


def get_or_create_settings(user_id: str) -> UserSettings:
    """Return settings for a user, creating defaults when needed."""
    session_factory = get_session_factory()
    with session_factory() as session:
        settings = session.get(UserSettings, user_id)
        if settings is None:
            _ensure_user_row(session, user_id)
            settings = UserSettings(user_id=user_id, **DEFAULT_SETTINGS)
            session.add(settings)
            session.commit()
            session.refresh(settings)
        return settings


def update_settings(user_id: str, values: dict[str, Any]) -> UserSettings:
    """Patch safe settings fields and return the updated row."""
    allowed_fields = {
        "display_name",
        "firm_name",
        "theme_preference",
        "bwb_enabled",
        "rechtspraak_enabled",
        "openai_key_configured",
        "cohere_key_configured",
        "primary_domain",
        "onboarding_completed",
    }
    session_factory = get_session_factory()
    with session_factory() as session:
        settings = session.get(UserSettings, user_id)
        if settings is None:
            _ensure_user_row(session, user_id)
            settings = UserSettings(user_id=user_id, **DEFAULT_SETTINGS)
            session.add(settings)

        for key, value in values.items():
            if key in allowed_fields and value is not None:
                setattr(settings, key, value)
        settings.updated_at = utcnow()
        session.commit()
        session.refresh(settings)
        return settings
