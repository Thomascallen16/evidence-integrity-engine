# Evidence Integrity Engine

Provider-neutral deterministic core for source-backed evidence integrity.

## Non-negotiable rule

A source alone never becomes a `FACT`. A claim is promoted only when source-backed evidence is explicitly linked as `SUPPORTING`, has a source locator, and is backed by an explicit latest `VERIFIED` evidence record containing verifier, method, and timestamp. Source designation (`PRIMARY`/`SECONDARY`) does not by itself determine truth. Structural ambiguity blocks promotion. Supporting plus contrary evidence yields `CONTRADICTION`.

## Classification

`FACT` · `AUTHORITY` · `CLAIM` · `INFERENCE` · `CONTRADICTION` · `QUESTION` · `UNKNOWN`

## Core responsibilities

- Source and evidence structures
- Preserved exact evidence text
- Claim/evidence relationships
- Explicit verification metadata
- Contradiction detection
- Structural uncertainty
- Audit-trail validation
- Provider/model independence

Retrieval, network calls, model inference, UI, application workflows, and vendor integrations stay outside the core.

## Origin

The initial deterministic core is consolidated from the existing ProofFlow engine implementation. ProofFlow, Citizen's Record, Open the Record, Watchtower, and future applications should consume this canonical layer rather than maintain divergent integrity implementations.


## Canonical module boundaries

The core is intentionally split by responsibility:

- **Integrity** — evaluates what the supplied evidence establishes and assigns an epistemic classification.
- **Verification** — represents explicit verification status and provenance of that verification.
- **Audit** — validates the structural audit trail and independently provides tamper-evident hash-chain verification.
- **Types** — defines the provider-neutral contracts shared by those modules.

`evaluateIntegrity()` remains synchronous and uses the structural audit validator. Hash-chain verification is a separate asynchronous operation via `verifyAuditChain(events, anchorHash)`, so cryptographic verification does not get hidden inside the classification function or force consumers into an unnecessary async API.

There is deliberately one canonical implementation of each capability. Retrieval, network calls, model inference, UI, and application workflows remain outside the deterministic core.

## Verification boundary

AI or an upstream application may propose classifications, relationships, or verification actions, but those proposals are not self-authenticating. A `FACT` requires explicit evidence linkage, preserved source-backed text, locator provenance, and a `VERIFIED` record with verifier, method, and timestamp.

Audit integrity answers a different question: **did the record remain structurally and cryptographically intact?** A valid audit chain does not make the underlying claim true; it makes the history of the record tamper-evident.

## Repository cleanup note

The `engine/` tree is the canonical implementation and is the package/test surface. Older `src/` and `tests/` material remains in Git history while consolidation is completed; it is not referenced by the current package scripts.