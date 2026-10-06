import { describe, expect, it } from "vitest";
import { createEvidenceBundle, verifyEvidenceBundle } from "./bundle";
import { createIntegrityReceipt } from "./receipt";
import { evaluateIntegrity } from "./integrity";
import type { IntegrityInput } from "./types";

const input: IntegrityInput = {
  question: "Does the record establish the claim?",
  claim: { id: "claim-1", text: "The record establishes the claim." },
  sources: [{ id: "source-1", title: "Example source", locator: "page:1", designation: "PRIMARY" }],
  evidence: [{ id: "evidence-1", sourceId: "source-1", exactText: "The record establishes the claim." }],
  evidenceLinks: [{ evidenceId: "evidence-1", relationship: "SUPPORTING" }],
  verificationRecords: [{
    id: "verification-1",
    targetId: "evidence-1",
    status: "VERIFIED",
    verifier: "test-verifier",
    method: "test-method",
    verifiedAt: "2026-10-06T00:00:00Z",
  }],
};

describe("portable evidence bundles", () => {
  it("creates and independently verifies a bundle", async () => {
    const finding = evaluateIntegrity(input);
    const receipt = await createIntegrityReceipt(input, finding, {
      engineVersion: "0.1.0",
      receiptId: "receipt-1",
      createdAt: "2026-10-06T00:00:00Z",
    });
    const bundle = await createEvidenceBundle(input, finding, receipt, {
      engineVersion: "0.1.0",
      bundleId: "bundle-1",
      createdAt: "2026-10-06T00:00:00Z",
    });

    const result = await verifyEvidenceBundle(bundle);
    expect(result.valid).toBe(true);
    expect(result.receiptValid).toBe(true);
    expect(result.auditChainValid).toBeNull();
  });

  it("detects bundle tampering", async () => {
    const finding = evaluateIntegrity(input);
    const receipt = await createIntegrityReceipt(input, finding, {
      engineVersion: "0.1.0",
      receiptId: "receipt-2",
      createdAt: "2026-10-06T00:00:00Z",
    });
    const bundle = await createEvidenceBundle(input, finding, receipt, {
      engineVersion: "0.1.0",
      bundleId: "bundle-2",
      createdAt: "2026-10-06T00:00:00Z",
    });

    const altered = { ...bundle, input: { ...bundle.input, question: "Altered question" } };
    const result = await verifyEvidenceBundle(altered);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("Bundle hash does not match its canonical contents.");
    expect(result.reasons).toContain("Receipt input hash does not match the supplied input.");
  });

  it("requires an external anchor when audit events are present", async () => {
    const auditEvent = {
      id: "audit-1",
      timestamp: "2026-10-06T00:00:00Z",
      action: "CREATED" as const,
      entityType: "claim",
      entityId: "claim-1",
      summary: "Created claim",
    };
    const auditedInput = { ...input, auditEvents: [auditEvent] };
    const finding = evaluateIntegrity(auditedInput);
    const receipt = await createIntegrityReceipt(auditedInput, finding, {
      engineVersion: "0.1.0",
      receiptId: "receipt-3",
      createdAt: "2026-10-06T00:00:00Z",
    });
    const bundle = await createEvidenceBundle(auditedInput, finding, receipt, {
      engineVersion: "0.1.0",
      bundleId: "bundle-3",
      createdAt: "2026-10-06T00:00:00Z",
    });

    const result = await verifyEvidenceBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.auditChainValid).toBe(false);
  });
});
