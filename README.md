# Evidence Integrity Engine

Provider-neutral deterministic core for source-backed evidence integrity.

## Non-negotiable rule

A source alone never becomes a `FACT`. A claim is promoted only when source-backed evidence is explicitly linked as `SUPPORTING` and the record has no unresolved structural ambiguity. Supporting plus contrary evidence yields `CONTRADICTION`.

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
