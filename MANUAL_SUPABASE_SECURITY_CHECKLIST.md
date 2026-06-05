# Manual Supabase Security Checklist

Run these checks in the Supabase dashboard before treating production as hardened.

- Enable leaked password protection.
- Enable email confirmation if public email/password signup is ever opened.
- Keep public signup disabled during private beta.
- Enable MFA for owner/admin accounts.
- Configure CAPTCHA or bot protection before public signup/login is enabled.
- Run Supabase Security Advisor and fix all `ERROR` findings.
- Confirm RLS is enabled on every table in the exposed `public` schema, including Auth.js tables.
- Confirm sensitive Auth.js tables (`accounts`, `sessions`, `verification_token`, `users`) have RLS enabled and are not readable through the Data API.
- Confirm service-role or secret keys are not present in frontend code, browser env vars, Vercel public variables, or committed files.
- Rotate any API key, database password, Auth secret, OpenAI key, or Resend key that was ever pasted into a public place or committed.
- Review Auth logs and Database logs for unexpected anonymous access attempts, failed logins, and unusual query volume.
- Keep Supabase Storage buckets private unless a future feature explicitly requires public assets.
- If Storage is added later, require file-size, file-type, owner-path, SELECT/INSERT/UPDATE/DELETE policy review before launch.
- Keep database connection strings in server-only deployment settings.
- Confirm `AUTH_DEV_BYPASS=false` and `AUTH_ALLOW_CREDENTIAL_SIGNUP=false` in production.

Current note: Clarvo does not currently use Supabase Storage or a browser Supabase client.
