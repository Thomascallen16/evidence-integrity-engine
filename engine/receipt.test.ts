import { describe, expect, it } from "vitest";
import { createIntegrityReceipt, verifyIntegrityReceipt } from "./receipt";
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

describe("integrity receipts", () => {
  it("binds the supplied input and finding", async () => {
    const finding = evaluateIntegrity(input);
    const receipt = await createIntegrityReceipt(input, finding, {
      engineVersion: "0.1.0",
      receiptId: "receipt-1",
      createdAt: "2026-10-06T00:00:00Z",
    });

    expect((await verifyIntegrityReceipt(receipt, input, finding)).valid).toBe(true);
  });

  it("detects changed input", async () => {
    const finding = evaluateIntegrity(input);
    const receipt = await createIntegrityReceipt(input, finding, {
      engineVersion: "0.1.0",
      receiptId: "receipt-2",
      createdAt: "2026-10-06T00:00:00Z",
    });
    const changed = { ...input, question: "A different question?" };

    const result = await verifyIntegrityReceipt(receipt, changed, finding);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("Receipt input hash does not match the supplied input.");
  });

  it("detects altered receipt contents", async () => {
    const finding = evaluateIntegrity(input);
    const receipt = await createIntegrityReceipt(input, finding, {
      engineVersion: "0.1.0",
      receiptId: "receipt-3",
      createdAt: "2026-10-06T00:00:00Z",
    });

    const altered = { ...receipt, engineVersion: "9.9.9" };
    const result = await verifyIntegrityReceipt(altered, input, finding);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("Receipt hash does not match its canonical contents.");
  });
});
