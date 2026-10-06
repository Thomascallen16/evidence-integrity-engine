# Architecture

## Boundary

The engine is a pure integrity layer. Applications own authentication, persistence, source acquisition, UI, payments, and model/provider calls.

```text
Application / Adapter
        |
        v
Question + Retrieved Evidence + Claims
        |
        v
+-------------------------------+
| Evidence Integrity Engine     |
|                               |
| types                         |
| relevance ranking             |
| provenance checks             |
| result validation             |
| contradiction primitives      |
| UNKNOWN fallback              |
+-------------------------------+
        |
        v
Validated finding / unknown / contradiction
```

## Trust boundary

The model is an untrusted producer of candidate analysis. The engine validates that candidate analysis stays within the evidence supplied by the caller. It does not silently add sources or evidence.

## Source verification

The engine accepts source verification as an input property from a source adapter. It does not pretend that a URL being present proves authenticity. Applications that can independently verify a source should preserve that verification and its provenance metadata.

## Retrieval

`rankEvidence()` is intentionally deterministic and dependency-free. It provides a baseline implementation; production applications may replace retrieval with full-text, vector, graph, or database-specific adapters while keeping the same evidence and validation boundary.

## Contradictions

The core contradiction helper detects explicit evidence-ID conflicts between findings. Semantic contradiction detection belongs in an adapter because it requires domain and language reasoning and should never be mistaken for deterministic proof.

## Expansion boundary

The strategic expansion is intentionally layered around the deterministic engine:

```
Applications / Agents
        |
  MCP / SDK / OTel adapters
        |
Evidence bundles / receipts / policy / agent events / graph
        |
Deterministic EIE core
        |
FACT / CLAIM / CONTRADICTION / UNKNOWN
```

Portable bundles and receipts provide interoperability and independent verification. Policy profiles add assurance requirements but cannot relax the core FACT provenance gate. Agent activity records capture observable events and tool relationships without requiring private model reasoning. Graph queries operate on explicit evidence relationships rather than inventing relationships.

External source retrieval, authentication, storage, model inference, and authorization remain outside the core.

