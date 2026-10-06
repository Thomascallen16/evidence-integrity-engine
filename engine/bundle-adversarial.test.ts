import { describe, expect, it } from "vitest";
import { createIntegrityReceipt } from "./receipt";
import { createEvidenceBundle, verifyEvidenceBundle } from "./bundle";
import { evaluateIntegrity } from "./integrity";
import type { IntegrityInput } from "./types";

const input: IntegrityInput = {
  question: "Did the source support the claim?",
  claim: { id: "claim-1", text: "The record supports the claim." },
  sources: [{ id: "source-1", title: "Primary record", locator: "page:1", provenanceRef: "prov:1" }],
  evidence: [{ id: "evidence-1", sourceId: "source-1", exactText: "The record supports the claim.", provenanceRef: "prov:1" }],
  evidenceLinks: [{ evidenceId: "evidence-1", relationship: "SUPPORTING" }],
  verificationRecords: [{
    id: "verification-1",
    targetId: "evidence-1",
    status: "VERIFIED",
    verifier: "test-verifier",
    method: "direct-review",
    verifiedAt: "2026-10-05T00:00:00Z",
  }],
};

async function fixture() {
  const finding = evaluateIntegrity(input);
  const receipt = await createIntegrityReceipt(input, finding, {
    engineVersion: "0.1.0",
    receiptId: "receipt-1",
    createdAt: "2026-10-05T00:00:00Z",
  });
  return createEvidenceBundle(input, finding, receipt, {
    engineVersion: "0.1.0",
    bundleId: "bundle-1",
    createdAt: "2026-10-05T00:00:00Z",
  });
}

describe("bundle adversarial verification", () => {
  it("accepts reordered object keys because canonicalization is key-order independent", async () => {
    const bundle = await fixture();
    const reordered = JSON.parse(JSON.stringify(bundle, Object.keys(bundle).reverse()));
    expect((await verifyEvidenceBundle(reordered)).valid).toBe(true);
  });

  it("rejects mutation of important input fields", async () => {
    const bundle = await fixture();
    bundle.input.claim.text = "tampered";
    expect((await verifyEvidenceBundle(bundle)).valid).toBe(false);
  });

  it("rejects changed hashes", async () => {
    const bundle = await fixture();
    bundle.bundleHash = "0".repeat(64);
    expect((await verifyEvidenceBundle(bundle)).valid).toBe(false);
  });

  it("rejects substituted receipt schema", async () => {
    const bundle = await fixture();
    bundle.receipt.schemaVersion = "9.9" as "1.0";
    expect((await verifyEvidenceBundle(bundle)).valid).toBe(false);
  });

  it("rejects a replayed receipt against different evidence", async () => {
    const bundle = await fixture();
    const otherInput = structuredClone(bundle.input);
    otherInput.claim.text = "different claim";
    bundle.input = otherInput;
    expect((await verifyEvidenceBundle(bundle)).valid).toBe(false);
  });

  it("rejects removed provenance when the source is no longer locatable", async () => {
    const bundle = await fixture();
    bundle.input.sources[0].locator = undefined;
    bundle.input.sources[0].provenanceRef = undefined;
    expect(bundle.input.sources.every((s) => !s.locator && !s.provenanceRef)).toBe(true);
    expect((await verifyEvidenceBundle(bundle)).valid).toBe(false);
  });

  it("rejects malformed evidence", async () => {
    const bundle = await fixture();
    bundle.input.evidence[0].exactText = "";
    expect((await verifyEvidenceBundle(bundle)).valid).toBe(false);
  });

  it("rejects duplicate IDs", async () => {
    const bundle = await fixture();
    bundle.input.evidence.push({ ...bundle.input.evidence[0], id: "evidence-1" });
    expect((await verifyEvidenceBundle(bundle)).valid).toBe(false);
  });

  it("rejects contradictory records when the receipt/finding no longer matches", async () => {
    const bundle = await fixture();
    bundle.input.evidenceLinks = [
      ...(bundle.input.evidenceLinks ?? []),
      { evidenceId: "evidence-1", relationship: "CONTRARY" },
    ];
    expect((await verifyEvidenceBundle(bundle)).valid).toBe(false);
  });
});
