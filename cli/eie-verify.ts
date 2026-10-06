import { readFile } from "node:fs/promises";
import { createEvidenceBundle, verifyEvidenceBundle } from "../engine/bundle";
import type { EvidenceBundle } from "../engine/bundle";
import { evaluateIntegrity } from "../engine/integrity";

function usage(): never {
  console.error("Usage: eie-verify <evidence-bundle.json>");
  process.exit(2);
}

function schemaReasons(value: unknown): string[] {
  const reasons: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["Bundle must be a JSON object."];
  const b = value as Record<string, unknown>;
  if (b.schemaVersion !== "1.0") reasons.push("Unsupported bundle schema version.");
  for (const key of ["bundleId", "createdAt", "engineVersion", "input", "finding", "receipt", "bundleHash"]) {
    if (!(key in b)) reasons.push(`Missing required field: ${key}.`);
  }
  if (!b.input || typeof b.input !== "object" || Array.isArray(b.input)) reasons.push("input must be an object.");
  if (!b.finding || typeof b.finding !== "object" || Array.isArray(b.finding)) reasons.push("finding must be an object.");
  if (!b.receipt || typeof b.receipt !== "object" || Array.isArray(b.receipt)) reasons.push("receipt must be an object.");
  if (typeof b.bundleHash !== "string" || !/^[0-9a-f]{64}$/.test(b.bundleHash)) reasons.push("bundleHash must be a SHA-256 hex digest.");
  return reasons;
}

function line(label: string, value: string): void {
  console.log(`${label.padEnd(22, ".")} ${value}`);
}

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) usage();

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    console.error(`Unable to read/parse bundle: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  const schema = schemaReasons(parsed);
  if (schema.length) {
    line("BUNDLE", "INVALID");
    line("SCHEMA", "INVALID");
    for (const reason of schema) console.error(`- ${reason}`);
    process.exit(1);
  }

  const bundle = parsed as EvidenceBundle;
  const result = await verifyEvidenceBundle(bundle);
  const evidenceValid = (() => {
    try {
      const evaluated = evaluateIntegrity(bundle.input);
      return JSON.stringify(evaluated) === JSON.stringify(bundle.finding);
    } catch {
      return false;
    }
  })();

  line("BUNDLE", result.valid ? "VALID" : "INVALID");
  line("SCHEMA", "VALID");
  line("CONTENT HASH", result.valid || !result.reasons.some((r) => r.includes("Bundle hash")) ? "VALID" : "INVALID");
  line("RECEIPT", result.receiptValid ? "VALID" : "INVALID");
  line("EVIDENCE", evidenceValid ? "VALID" : "INVALID");
  line("PROVENANCE", bundle.input.sources.every((s) => Boolean(s.locator || s.provenanceRef)) ? "COMPLETE" : "INCOMPLETE");
  line("AUDIT CHAIN", result.auditChainValid === null ? "NOT PRESENT" : result.auditChainValid ? "VALID" : "INVALID");
  line("CONTRADICTIONS", String(bundle.finding.contraryEvidenceIds.length));
  line("FINDING", bundle.finding.classification);

  if (result.reasons.length) {
    console.error("\nVerification reasons:");
    for (const reason of result.reasons) console.error(`- ${reason}`);
  }

  process.exit(result.valid && evidenceValid ? 0 : 1);
}

void main();
