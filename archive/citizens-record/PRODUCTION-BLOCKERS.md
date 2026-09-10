# Citizen's Record — Production Blockers

Archived from the production verification work. This is a consolidation record, not a production-change instruction executed by EIE.

## Current blocker

The deployed Citizen's Record frontend was verified with:

- `VITE_APP_ID` missing from the compiled frontend bundle.
- `VITE_OAUTH_PORTAL_URL` missing from the compiled frontend bundle.
- Login handler therefore constructs `undefined/app-auth`.

## Required manual action

Configure the two frontend build-time variables in Railway and redeploy. Then verify the OAuth callback:

`https://citizens-record-production.up.railway.app/api/oauth/callback`

After authentication is restored, verify the remaining environment variables and the investigation migration before testing persisted investigations.

## Safety boundary

No authentication bypass, demo evidence insertion, unverified migration, authorization disablement, or secret modification was performed during the reported verification.

## Consolidation rule

Preserve this blocker record and the source project's implementation. EIE does not replace Citizen's Record or remove its production capabilities.
