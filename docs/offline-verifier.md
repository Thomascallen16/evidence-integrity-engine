# Offline verifier

EIE evidence bundles are portable records that can be checked outside the application that created them.

## Build

```bash
pnpm install
pnpm verify:build
```

This produces `dist/eie-verify.mjs`.

## Verify

```bash
node dist/eie-verify.mjs evidence-bundle.json
```

Or:

```bash
pnpm verify -- evidence-bundle.json
```

The verifier performs local checks only. It does not contact the originating EIE application, model provider, source provider, or database.

It reports bundle integrity, schema shape, canonical content hash, receipt binding, deterministic re-evaluation of the supplied input/finding, provenance status, audit-chain status when present, contradiction count, and the final epistemic finding.

A valid bundle means the portable record is internally consistent with the deterministic EIE evaluation. It does not prove that an external source is authentic or that a claim is true in the world.

## Adversarial validation

The bundle test suite attacks field mutation, object reordering, hash substitution, receipt schema substitution, receipt replay against different input, removed provenance, malformed evidence, duplicate IDs, and contradictory evidence changes.
