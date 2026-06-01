# Clarvo live RAG/backend todo

Current UI baseline: `ui-polish-session` in `Antho-logan/clarvo`.

This file tracks the remaining work to make the polished Clarvo app work live with the same legal assistant/RAG behavior that already works in the local/private setup.

## P0 - make live dashboard actually usable

1. Hosted auth sanity check
   - Confirm Vercel Production has `AUTH_DATABASE_URL` set to the working Supabase auth database.
   - Confirm `AUTH_DEV_BYPASS=false`.
   - Confirm `AUTH_ALLOW_CREDENTIAL_SIGNUP=false`.
   - Confirm owner login works at `https://clarvo.nl/login`.
   - Confirm `/dashboard` opens after owner login.
   - Confirm logged-out `/dashboard` redirects to `/login`.
   - Confirm non-owner users cannot access `/admin/customers`.

2. Hosted RAG backend
   - Decide where the FastAPI backend will run for the private beta.
   - Deploy the existing backend without changing embeddings.
   - Configure production frontend with `NEXT_PUBLIC_API_BASE_URL` pointing to the hosted backend.
   - Confirm `/health` returns `{ "status": "ok" }`.
   - Confirm CORS/auth assumptions are safe for `clarvo.nl`.

3. Hosted legal corpus database
   - Provision hosted Postgres with pgvector for legal documents and embeddings.
   - Migrate/import the current local corpus:
     - 14,346 legal documents.
     - 14,346 embeddings.
     - `text-embedding-3-small`, 1536 dimensions.
   - Do not regenerate embeddings unless explicitly planned.
   - Verify document and embedding counts after import.

4. Live assistant RAG smoke
   - Ask: `Wat geldt bij opzegging van huur van woonruimte?`
   - Ask: `Wanneer is ontslag op staande voet geldig?`
   - Ask: `Wat geldt bij loondoorbetaling tijdens ziekte?`
   - Confirm each answer includes legal citations/source cards.
   - Ask: `Kun je mijn volledige belastingaangifte doen?`
   - Confirm refusal/limitation and no fake citations.

5. Live Legal Review Mode smoke
   - Use demo clause:
     `Verhuurder mag de huurovereenkomst op elk moment beëindigen met een opzegtermijn van één maand, zonder opgave van reden.`
   - Ask:
     `Beoordeel deze bepaling voor een Nederlandse huurovereenkomst. Welke risico’s zie je?`
   - Confirm answer includes:
     - `[Contract D1.P1]`
     - `Korte conclusie`
     - `Contractpassage`
     - `Juridische regel`
     - `Risico`
     - `Aanbeveling`
     - legal citations
     - lawyer-review requirement
   - Confirm contract context stays separate from legal source trail.

## P1 - make the private beta workflow complete

6. Matter and memo persistence
   - Confirm production DB has the matter/research note/memo tables needed by the app.
   - Save a grounded assistant answer to a Matter.
   - Confirm the research note appears on `/dashboard/matters`.
   - Draft a memo from the saved note.
   - Confirm source trail and lawyer-review warning are preserved.

7. Customer onboarding workflow
   - Log in as owner.
   - Open `/admin/customers`.
   - Create one test customer.
   - Confirm the generated temporary password is shown once.
   - Confirm the test customer can log in.
   - Confirm the test customer cannot access `/admin/customers`.

8. File extraction in production
   - Test pasted text/clause review.
   - Test PDF upload/extraction.
   - Test Word upload/extraction if supported in production.
   - Confirm there is no permanent storage claim.
   - Confirm no OCR claim is made.

9. Production observability
   - Confirm Vercel logs show sanitized lead/auth/app errors only.
   - Confirm backend logs do not print secrets, document contents unnecessarily, or raw API keys.
   - Add a small runbook for common failures:
     - backend unavailable
     - database unavailable
     - OpenAI API failure
     - no sources found
     - auth database issue

## P2 - after first controlled demos

10. Better hosted architecture
    - Decide whether the full RAG database should live in Supabase, Neon, or another hosted pgvector provider.
    - Add backup/restore process.
    - Add monitoring for slow vector queries.

11. Legal quality evaluation
    - Add repeatable demo/eval questions for huurrecht and arbeidsrecht.
    - Track citation quality and refusal quality.
    - Add regression tests for common legal review questions.

12. Product hardening
    - Add production-grade rate limiting/WAF for public routes.
    - Add a stronger admin role model if more owners are added.
    - Add privacy rules for real customer document handling.
    - Add a clear beta data-handling policy before using real sensitive client documents.

## Push/deploy sequence

1. Push the current polished UI branch to GitHub.
2. Do not deploy the full public RAG app until P0 backend/database checks pass.
3. Use `clarvo.nl` for public landing and lead capture.
4. Use the protected dashboard only for controlled private demos until hosted RAG is verified.
