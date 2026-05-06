# Security Review Prompt

You are performing a security review.

Follow AGENT_NATIVE.md.

Check for:
- Secret leakage
- Exposed API keys
- Auth bypass
- Missing authorization checks
- Unsafe input handling
- Insecure webhooks
- Payment/user identity bugs
- Database injection risk
- Unsafe file uploads
- Unsafe redirects
- Overly permissive CORS
- Dev bypass leaking into production
- Sensitive data in logs
- Missing rate limits where relevant

Output:
- Critical issues
- High issues
- Medium issues
- Low issues
- Recommended fixes
- Files affected
- Verification steps

Do not edit unless explicitly asked.
