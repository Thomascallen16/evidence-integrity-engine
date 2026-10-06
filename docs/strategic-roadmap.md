# Strategic Expansion Roadmap

## Objective

Grow EIE from a deterministic evidence-classification core into a provider-neutral **evidence integrity and agent accountability layer** without turning the core into a retrieval service, database, model, or workflow platform.

The design principle is simple:

> **Keep truth evaluation deterministic. Add interoperable evidence, decision, provenance, audit, and policy interfaces around it.**

## Current strengths

- Deterministic source/evidence/claim model.
- Explicit provenance gate for FACT.
- CONTRADICTION and UNKNOWN outcomes.
- Explicit verification records.
- Tamper-evident audit-chain primitive.
- Provider/model independence.
- TypeScript implementation with automated tests and CI.
- Proof Lab demonstrating the core.

## Highest-value gaps

### 1. Verifiable decision receipts — P0
Bind a question, supplied evidence, evaluation result, and engine version into a portable receipt. This lets an upstream agent or application prove **what EIE evaluated and what EIE returned**, without claiming that the receipt proves the underlying claim true.

### 2. Portable evidence bundles — P0
Add a versioned, machine-readable bundle format containing sources, preserved evidence, claims, relationships, verification records, findings, receipts, and audit events. Support offline verification.

### 3. Stronger source provenance — P0
Extend source/evidence metadata for retrieval method, retrieval timestamp, content hash, source-authentication status, and provenance notes. A URL must never be treated as proof of authenticity.

### 4. Policy profiles — P1
Allow callers to define deterministic promotion rules and required fields without forking the engine. Examples: legal record, research, compliance, journalism, enterprise knowledge, and agent/tool evidence.

### 5. Agent/tool action records — P1
Represent an agent run and tool invocation as evidence-bearing events that can be correlated with the resulting claim. Do not turn EIE into an agent runtime; provide the integrity layer underneath it.

### 6. MCP adapter — P1
Expose EIE as a small MCP server/adapter. MCP should remain transport/discovery; EIE remains the deterministic integrity authority.

### 7. OpenTelemetry integration — P1
Emit optional trace/log correlation identifiers and structured evaluation events. Keep telemetry outside the deterministic decision path.

### 8. Offline verifier / CLI — P1
A third party should be able to verify a bundle without trusting the original application runtime.

### 9. Compliance/control mappings — P2
Map evidence/decision records to configurable controls rather than hard-coding one regulatory regime.

### 10. SDKs and integration packages — P2
Keep the core dependency-light. Provide adapters for common agent/application stacks rather than loading integrations into the core.

## Market signal

Current agent-governance work is converging on several requirements EIE can serve without becoming a giant platform:

- AI systems need AI-native observability that captures retrieval provenance, agent/tool invocations, permissions, outputs, evaluation, and policy decisions. Microsoft explicitly identifies these as production observability requirements.
- Enterprise MCP governance is adding asset registries, access control, tool-level audit trails, and security scanning.
- Emerging agent-audit standards are defining portable evidentiary records and assertions for independent review.
- Emerging MCP security research is focused on identity, tool trust, authorization, replay protection, and auditability.

The opportunity is therefore not to make EIE another agent framework.

The opportunity is to make EIE the **evidence/integrity layer that agent frameworks, MCP gateways, applications, and auditors can consume**.

## Deliberate non-goals

Do NOT put these in the deterministic core:

- Web crawling
- Search engines
- Vector databases
- LLM inference
- Authentication providers
- Payments
- UI frameworks
- Cloud-specific persistence
- Regulatory advice
- Domain-specific truth claims

Those belong in adapters, applications, or policy packages.

## Proposed architecture

```
                    Applications / Agents
                            |
             +--------------+--------------+
             |                             |
         MCP Adapter                 SDK / HTTP
             |                             |
             +--------------+--------------+
                            |
                    Evidence Integrity API
                            |
       +--------------------+--------------------+
       |                    |                    |
   Evidence Model      Decision Receipt     Audit Chain
       |                    |                    |
       +--------------------+--------------------+
                            |
                    Deterministic Engine
                            |
          FACT / CLAIM / CONTRADICTION / UNKNOWN
```

## Build order

1. Decision receipts
2. Portable evidence bundles + JSON schema
3. Source/provenance strengthening
4. Offline verifier CLI
5. Policy profiles
6. Agent/tool action correlation
7. MCP adapter
8. OpenTelemetry adapter
9. Control/compliance mappings
10. SDKs

This order increases the value of what already exists before adding infrastructure around it.
