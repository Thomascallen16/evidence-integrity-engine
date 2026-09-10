# Production Deployment Verification — Citizen's Record

## Root finding

The actual production deployment is:

**https://citizens-record-production.up.railway.app**

The deployed frontend and backend are present and serving the investigation pipeline.

The first actual production failure is authentication configuration:

```text
VITE_OAUTH_PORTAL_URL = undefined
VITE_APP_ID = undefined
```

The deployed JavaScript bundle contains:

```js
new URL("undefined/app-auth")
```

The login button is rendered and wired, but it cannot navigate to the Manus OAuth provider because the required frontend build-time variables were missing.

## Verified production flow

| Component | Status | Evidence |
|---|---|---|
| Production URL | VERIFIED | Railway deployment status identifies `citizens-record-production.up.railway.app`. |
| Frontend | VERIFIED | `/workspace` returns HTTP 200 and renders the private workspace screen. |
| Backend/API | VERIFIED | `/api/trpc/auth.me` responds successfully. |
| Frontend initialization | VERIFIED | Workspace renders without an initialization error. |
| Anonymous session initialization | VERIFIED | `auth.me` returns `{ data: null }`. |
| Login button | VERIFIED | Button exists and its handler is wired. |
| OAuth navigation | FAILED | Deployed bundle contains `new URL("undefined/app-auth")`; `appId` is also undefined. |
| Protected investigation route | VERIFIED | Unauthenticated call returns expected `401 UNAUTHORIZED`. |
| Database connectivity | BLOCKED | Requires Railway database access or an authenticated request reaching the database. |
| Investigation migration | BLOCKED | Migration exists in source, but production database state cannot be inspected from this session. |
| Evidence retrieval | BLOCKED | Requires authenticated access to a production record with stored evidence. |
| Provenance preservation | BLOCKED | Implemented locally, but no authenticated live investigation could run. |
| LLM invocation | BLOCKED | Requires authenticated flow and production Forge configuration. |
| Integrity validation | VERIFIED | Current code delegates to the pinned evidence-integrity engine; local tests pass. |
| Persistence | BLOCKED | Requires successful authenticated mutation and applied production migration. |
| Audit trail | BLOCKED | Requires successful persisted investigation. |
| Result UI | VERIFIED | Deployed bundle contains the investigation result renderer. |
| Browser console | VERIFIED | No initial console errors on `/workspace`. |
| Production API target | VERIFIED | Client uses same-origin tRPC; no localhost API endpoint was found in the deployed bundle. |
| Server logs | BLOCKED | Railway logs are not available through the repository or current session. |

## Exact failure path

```text
/workspace
→ frontend initializes
→ auth.me returns anonymous session
→ private workspace renders
→ user clicks login
→ login handler reads compiled OAuth variables
→ VITE_OAUTH_PORTAL_URL is undefined
→ VITE_APP_ID is undefined
→ handler constructs undefined/app-auth
→ OAuth flow cannot begin
→ no callback
→ no authenticated session
→ investigation API cannot execute
```

The backend route itself is deployed and correctly protected.

## Environment classification

| Variable | Status |
|---|---|
| `DATABASE_URL` | UNKNOWN |
| `OAUTH_SERVER_URL` | UNKNOWN |
| `VITE_APP_ID` | **MISSING — verified from deployed bundle** |
| `VITE_OAUTH_PORTAL_URL` | **MISSING — verified from deployed bundle** |
| `BUILT_IN_FORGE_API_URL` | UNKNOWN |
| `BUILT_IN_FORGE_API_KEY` | UNKNOWN |
| `JWT_SECRET` | UNKNOWN |
| `VITE_FRONTEND_FORGE_API_URL` | NOT REQUIRED for this server-side investigation flow |
| `VITE_FRONTEND_FORGE_API_KEY` | NOT REQUIRED for this server-side investigation flow |

## Manual production configuration required

1. Set `VITE_APP_ID` in Railway.
2. Set `VITE_OAUTH_PORTAL_URL` in Railway.
3. Ensure the OAuth application allows this exact callback:

```text
https://citizens-record-production.up.railway.app/api/oauth/callback
```

4. Redeploy after setting the variables. These are Vite build-time variables; setting them only at runtime is insufficient.
5. Verify `OAUTH_SERVER_URL`, `JWT_SECRET`, `DATABASE_URL`, `BUILT_IN_FORGE_API_URL`, and `BUILT_IN_FORGE_API_KEY`.
6. Apply and verify `drizzle/0005_investigations.sql`.
7. Re-test login, then run:

```text
What evidence is currently available in this case?
```

## What was configured automatically

Nothing was changed in the production environment or database during this verification. Authentication was not bypassed; demo evidence was not inserted; an unverified migration was not applied; authorization was not disabled; Railway secrets were not altered.

The source verification report was committed and pushed to Citizen's Record `main` as:

```text
040fc13 docs: note evidence engine deployment dependency
```

## Consolidation note

This report is archived in Evidence Integrity Engine as source material. It does not authorize or perform any production change. The Citizen's Record deployment remains its own system.

## First remaining blocker

**Missing `VITE_OAUTH_PORTAL_URL` and `VITE_APP_ID` in the production frontend build.**
