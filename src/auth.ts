import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";
import argon2 from "argon2";

import { resolveCredentialIdentity } from "@/lib/auth-identifiers";

function normalizePostgresUrl(value: string | undefined) {
  return value
    ?.replace("postgresql+psycopg://", "postgresql://")
    .replace("postgresql+psycopg2://", "postgresql://");
}

const pool = new Pool({
  connectionString: normalizePostgresUrl(
    process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL,
  ),
});

async function getOrCreateCredentialsUser(
  email: string,
  password: string,
  name: string,
) {
  const existing = await pool.query(
    "SELECT id, name, email, image, password_hash FROM users WHERE lower(email) = lower($1) LIMIT 1",
    [email],
  );

  if (existing.rowCount) {
    const user = existing.rows[0];
    if (!user.password_hash) {
      return null;
    }
    const verified = await argon2.verify(user.password_hash, password);
    return verified ? user : null;
  }

  if (process.env.AUTH_ALLOW_CREDENTIAL_SIGNUP !== "true") {
    return null;
  }

  const passwordHash = await argon2.hash(password);
  const created = await pool.query(
    'INSERT INTO users (name, email, "emailVerified", password_hash) VALUES ($1, $2, now(), $3) RETURNING id, name, email, image',
    [name, email, passwordHash],
  );
  return created.rows[0];
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Name or email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const identity = resolveCredentialIdentity(String(credentials?.email || ""));
      const password = String(credentials?.password || "");
      if (!identity.email || !password) {
        return null;
      }

      const user = await getOrCreateCredentialsUser(
        identity.email,
        password,
        identity.name,
      );
      if (!user?.id || !user?.email) {
        return null;
      }

      return {
        id: String(user.id),
        name: user.name || identity.name || user.email,
        email: user.email,
        image: user.image || null,
      };
    },
  }),
];

if (process.env.RESEND_API_KEY) {
  providers.push(
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.AUTH_EMAIL_FROM || "Clarvo <auth@clarvo.nl>",
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  providers,
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig);
