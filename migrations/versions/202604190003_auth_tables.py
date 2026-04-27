"""add auth tables

Revision ID: 202604190003
Revises: 202604190002
Create Date: 2026-04-19 01:22:00.000000
"""

from __future__ import annotations

from alembic import op


revision = "202604190003"
down_revision = "202604190002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create Auth.js tables idempotently."""
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            name TEXT,
            email TEXT UNIQUE,
            "emailVerified" TIMESTAMPTZ,
            image TEXT,
            password_hash TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS accounts (
            id SERIAL PRIMARY KEY,
            "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            provider TEXT NOT NULL,
            "providerAccountId" TEXT NOT NULL,
            refresh_token TEXT,
            access_token TEXT,
            expires_at INTEGER,
            token_type TEXT,
            scope TEXT,
            id_token TEXT,
            session_state TEXT,
            UNIQUE(provider, "providerAccountId")
        )
        """
    )
    op.execute('CREATE INDEX IF NOT EXISTS ix_accounts_user_id ON accounts ("userId")')
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            "sessionToken" TEXT NOT NULL UNIQUE,
            "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires TIMESTAMPTZ NOT NULL
        )
        """
    )
    op.execute('CREATE INDEX IF NOT EXISTS ix_sessions_session_token ON sessions ("sessionToken")')
    op.execute('CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON sessions ("userId")')
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS verification_token (
            identifier TEXT NOT NULL,
            expires TIMESTAMPTZ NOT NULL,
            token TEXT NOT NULL,
            PRIMARY KEY(identifier, token),
            UNIQUE(token)
        )
        """
    )


def downgrade() -> None:
    """Preserve auth data on downgrade; table drops require an explicit data-preserving plan."""
    return None
