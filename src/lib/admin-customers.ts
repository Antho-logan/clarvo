import argon2 from "argon2";
import crypto from "node:crypto";

import { authDbPool } from "@/lib/auth-db";

const DEFAULT_OWNER_EMAIL = "anthonylogan1995@gmail.com";

const LIMITS = {
  email: 254,
  name: 120,
} as const;

type QueryResult<T> = {
  rowCount: number | null;
  rows: T[];
};

export type CustomerDb = {
  query<T = Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>;
};

type CustomerRow = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string | Date | null;
};

export type CustomerRecord = {
  id: string;
  email: string;
  name: string;
  role: "Owner" | "Customer";
  createdAt: string | null;
};

export type CustomerInput = {
  email: string;
  name?: string;
};

export type CreateCustomerResult = {
  id: string;
  email: string;
  name: string;
  temporaryPassword: string;
};

type CreateCustomerOptions = {
  db?: CustomerDb;
  temporaryPassword?: string;
};

function configuredOwnerEmails() {
  const raw =
    process.env.CLARVO_OWNER_EMAILS ||
    process.env.ADMIN_EMAILS ||
    DEFAULT_OWNER_EMAIL;
  return raw
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeName(value: string | undefined, email: string) {
  const name = (value || "").trim().replace(/\s+/g, " ");
  return name || email.split("@")[0] || email;
}

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function generateTemporaryPassword() {
  return crypto.randomBytes(18).toString("base64url");
}

export function isOwnerEmail(value: string | null | undefined) {
  if (!value) return false;
  const email = normalizeEmail(value);
  return configuredOwnerEmails().includes(email);
}

export function validateCustomerInput(input: CustomerInput) {
  const email = normalizeEmail(input.email || "");
  const name = normalizeName(input.name, email);

  if (!email || !isEmailLike(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (email.length > LIMITS.email) {
    throw new Error("Email must be 254 characters or fewer.");
  }
  if (name.length > LIMITS.name) {
    throw new Error("Name must be 120 characters or fewer.");
  }

  return { email, name };
}

export async function listCustomers(db: CustomerDb = authDbPool) {
  const result = await db.query<CustomerRow>(
    `
      SELECT id, email, name, created_at
      FROM users
      ORDER BY created_at DESC NULLS LAST, email ASC
    `,
  );

  return result.rows
    .filter((row) => Boolean(row.email))
    .map<CustomerRecord>((row) => {
      const email = normalizeEmail(row.email || "");
      return {
        id: row.id,
        email,
        name: row.name || "",
        role: isOwnerEmail(email) ? "Owner" : "Customer",
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      };
    });
}

export async function createCustomer(
  input: CustomerInput,
  options: CreateCustomerOptions = {},
): Promise<CreateCustomerResult> {
  const db = options.db || authDbPool;
  const { email, name } = validateCustomerInput(input);
  const existing = await db.query<{ id: string }>(
    "SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1",
    [email],
  );

  if (existing.rowCount) {
    throw new Error("A customer with this email already exists.");
  }

  const temporaryPassword = options.temporaryPassword || generateTemporaryPassword();
  const passwordHash = await argon2.hash(temporaryPassword);
  const created = await db.query<{ id: string }>(
    `
      INSERT INTO users (name, email, "emailVerified", password_hash)
      VALUES ($1, $2, now(), $3)
      RETURNING id
    `,
    [name, email, passwordHash],
  );

  return {
    id: created.rows[0]?.id || "",
    email,
    name,
    temporaryPassword,
  };
}
