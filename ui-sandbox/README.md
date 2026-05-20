# Veridicta UI Sandbox

This folder is safe for rough UI experiments.

Files here are `.txt` copies of real frontend files, so Next.js and TypeScript do not compile them. Editing these files will not change the live app until Codex intentionally ports the changes back into `src/`.

## Main Live UI Files

- Landing page component: `src/components/landing/ApprovedStaticLanding.tsx`
- Landing page styles: `src/components/landing/ApprovedStaticLanding.module.css`
- Login screen: `src/app/login/page.tsx`
- Assistant screen: `src/components/dashboard/assistant-streaming-page.tsx`
- Dashboard shell/sidebar/header: `src/components/dashboard/DashboardShell.tsx`
- Dashboard home: `src/app/dashboard/page.tsx`
- Matters page: `src/app/dashboard/matters/page.tsx`
- Knowledge page: `src/app/dashboard/knowledge/page.tsx`
- Vault/documents page: `src/app/dashboard/documents/page.tsx`
- Workflows page: `src/app/dashboard/workflows/page.tsx`
- Settings page: `src/app/dashboard/settings/page.tsx`

## Sandbox Copies

- `ui-sandbox/landing/ApprovedStaticLanding.tsx.txt`
- `ui-sandbox/landing/ApprovedStaticLanding.module.css.txt`
- `ui-sandbox/app/login-page.tsx.txt`
- `ui-sandbox/app/assistant-streaming-page.tsx.txt`
- `ui-sandbox/app/DashboardShell.tsx.txt`

## How To Use This With Claude

Give Claude the relevant `.txt` file from this folder and ask it to redesign or polish that file only.

Important rules for Claude:

- Do not change backend behavior.
- Do not remove working form/API calls.
- Do not rename routes.
- Keep the same component props and exported component names.
- Keep copy honest: private beta, source-backed answers, citations must be inspected.
- Return the edited `.txt` file, not a new architecture.

After Claude edits the sandbox file, ask Codex to review the diff and port the good changes back into the real `src/` file.

## Current Recommendation

For UI polish, start here:

1. `ui-sandbox/app/assistant-streaming-page.tsx.txt`
   - Smooth the chunky answer animation.
   - Improve answer/citation layout.
   - Keep refusal behavior and save-to-matter behavior intact.

2. `ui-sandbox/app/login-page.tsx.txt`
   - Make login look more premium.
   - Keep the `Name or email` and password fields.
   - Keep local MVP login working.

3. `ui-sandbox/app/DashboardShell.tsx.txt`
   - Polish sidebar/header/navigation.
   - Do not change routes.

4. `ui-sandbox/landing/ApprovedStaticLanding.tsx.txt`
   - Use only if you want to experiment with landing-page changes without touching the current approved landing page.

