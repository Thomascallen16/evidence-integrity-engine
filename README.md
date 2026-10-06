# Evidence Integrity Engine

Provider-neutral deterministic core for source-backed evidence integrity.

## Non-negotiable rule

A source alone never becomes a FACT. A claim is promoted only when source-backed evidence is explicitly linked as SUPPORTING, has a source locator, and is backed by an explicit latest VERIFIED evidence record containing verifier, method, and timestamp. Source designation (PRIMARY/SECONDARY) does not by itself determine truth. Structural ambiguity blocks promotion. Supporting plus contrary evidence yields CONTRADICTION.

## Classification

FACT · AUTHORITY · CLAIM · INFERENCE · CONTRADICTION · QUESTION · UNKNOWN

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

- Integrity — evaluates what the supplied evidence establishes and assigns an epistemic classification.
- Verification — represents explicit verification status and provenance of that verification.
- Audit — validates the structural audit trail and independently provides tamper-evident hash-chain verification.
- Types — defines the provider-neutral contracts shared by those modules.

evaluateIntegrity() remains synchronous. Hash-chain verification is separate via verifyAuditChain(events, anchorHash).

There is deliberately one canonical implementation of each capability. Retrieval, network calls, model inference, UI, and application workflows remain outside the deterministic core.

## Verification boundary

AI or an upstream application may propose classifications, relationships, or verification actions, but those proposals are not self-authenticating. A FACT requires explicit evidence linkage, preserved source-backed text, locator provenance, and a VERIFIED record with verifier, method, and timestamp.

Audit integrity answers a different question: did the record remain structurally and cryptographically intact? A valid audit chain does not make the underlying claim true; it makes the history of the record tamper-evident.

## Repository status

engine/ is the canonical implementation and test surface. The obsolete pre-consolidation src/ and tests/ trees have been removed from the working tree and remain available through Git history.

## Direction

EIE is becoming the canonical evidence-verification infrastructure for the ecosystem. MCP should be an adapter around this core, not a replacement for it. Applications remain responsible for authentication, authorization, source acquisition, persistence, UI, and policy.

## Strategic expansion

The canonical engine remains deterministic and provider-neutral. Optional extensions now provide:

- portable integrity decision receipts
- versioned evidence bundles with independent bundle verification
- stronger source/evidence provenance metadata
- deterministic assurance/policy profiles
- observable agent activity records without private chain-of-thought
- evidence graph construction and support/contradiction queries

The roadmap for offline verification, MCP, OpenTelemetry, external anchoring, and additional adapters is documented in [docs/strategic-roadmap.md](docs/strategic-roadmap.md).

### Integrity boundary

A valid receipt or evidence bundle proves the integrity of the supplied record and the engine evaluation represented by that record. It does **not** independently prove that an external source is authentic or that a claim is true in the world.

