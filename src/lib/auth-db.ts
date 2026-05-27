import { Pool } from "pg";

export function normalizePostgresUrl(value: string | undefined) {
  return value
    ?.replace("postgresql+psycopg://", "postgresql://")
    .replace("postgresql+psycopg2://", "postgresql://");
}

export const authDbPool = new Pool({
  connectionString: normalizePostgresUrl(
    process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL,
  ),
});
