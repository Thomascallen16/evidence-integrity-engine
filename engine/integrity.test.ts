import { describe, expect, it } from "vitest";
import { evaluateIntegrity } from "./integrity";

const base = {
  question: "Did the record support the claim?",
  claim: { id: "c1", text: "The record supports the claim." },
  sources: [{ id: "s1", title: "Primary record", designation: "PRIMARY" as const }],
  evidence: [{ id: "e1", sourceId: "s1", exactText: "Exact preserved source text." }],
};

describe("evaluateIntegrity", () => {
  it("never promotes a claim when only a source exists", () => {
    const r = evaluateIntegrity({ ...base, evidence: [] });
    expect(r.classification).toBe("CLAIM");
    expect(r.missingEvidence.length).toBeGreaterThan(0);
  });

  it("requires an explicit supporting relationship before FACT", () => {
    const r = evaluateIntegrity(base);
    expect(r.classification).toBe("CLAIM");
    expect(r.supportsClaim).toBe(false);
  });

  it("classifies source-backed supporting evidence as FACT", () => {
    const r = evaluateIntegrity({ ...base, evidenceLinks: [{ evidenceId: "e1", relationship: "SUPPORTING" }] });
    expect(r.classification).toBe("FACT");
    expect(r.supportsClaim).toBe(true);
  });

  it("keeps supporting and contrary evidence as CONTRADICTION", () => {
    const r = evaluateIntegrity({
      ...base,
      evidence: [...base.evidence, { id: "e2", sourceId: "s1", exactText: "Contrary preserved source text." }],
      evidenceLinks: [
        { evidenceId: "e1", relationship: "SUPPORTING" },
        { evidenceId: "e2", relationship: "CONTRARY" },
      ],
    });
    expect(r.classification).toBe("CONTRADICTION");
    expect(r.contraryEvidenceIds).toEqual(["e2"]);
  });

  it("returns UNKNOWN when question or claim is missing", () => {
    const r = evaluateIntegrity({ ...base, question: "", evidenceLinks: [{ evidenceId: "e1", relationship: "SUPPORTING" }] });
    expect(r.classification).toBe("UNKNOWN");
  });

  it("rejects evidence pointing to an unknown source", () => {
    const r = evaluateIntegrity({
      ...base,
      evidence: [{ id: "e9", sourceId: "missing-source", exactText: "Unanchored text" }],
      evidenceLinks: [{ evidenceId: "e9", relationship: "SUPPORTING" }],
    });
    expect(r.classification).toBe("UNKNOWN");
  });

  it("does not promote contrary-only evidence", () => {
    const r = evaluateIntegrity({ ...base, evidenceLinks: [{ evidenceId: "e1", relationship: "CONTRARY" }] });
    expect(r.classification).toBe("CLAIM");
  });

  it("rejects duplicate source identifiers", () => {
    const r = evaluateIntegrity({
      ...base,
      sources: [...base.sources, { id: "s1", title: "Another record" }],
      evidenceLinks: [{ evidenceId: "e1", relationship: "SUPPORTING" }],
    });
    expect(r.classification).toBe("UNKNOWN");
  });

  it("rejects orphaned evidence links", () => {
    const r = evaluateIntegrity({ ...base, evidenceLinks: [{ evidenceId: "missing", relationship: "SUPPORTING" }] });
    expect(r.classification).toBe("UNKNOWN");
  });

  it("rejects supporting evidence marked REJECTED", () => {
    const r = evaluateIntegrity({
      ...base,
      evidenceLinks: [{ evidenceId: "e1", relationship: "SUPPORTING" }],
      verificationRecords: [{ id: "v1", targetId: "e1", status: "REJECTED", verifiedAt: "2026-09-10T12:00:00Z", reason: "Source mismatch" }],
    });
    expect(r.classification).toBe("CLAIM");
    expect(r.rejectedEvidenceIds).toEqual(["e1"]);
    expect(r.supportsClaim).toBe(false);
  });

  it("does not promote NEEDS_REVIEW evidence to FACT", () => {
    const r = evaluateIntegrity({
      ...base,
      evidenceLinks: [{ evidenceId: "e1", relationship: "SUPPORTING" }],
      verificationRecords: [{ id: "v1", targetId: "e1", status: "NEEDS_REVIEW", verifiedAt: "2026-09-10T12:00:00Z" }],
    });
    expect(r.classification).toBe("CLAIM");
    expect(r.reviewEvidenceIds).toEqual(["e1"]);
  });

  it("treats a rejected claim verification as UNKNOWN", () => {
    const r = evaluateIntegrity({
      ...base,
      evidenceLinks: [{ evidenceId: "e1", relationship: "SUPPORTING" }],
      verificationRecords: [{ id: "v1", targetId: "c1", status: "REJECTED", verifiedAt: "2026-09-10T12:00:00Z" }],
    });
    expect(r.classification).toBe("UNKNOWN");
  });

  it("rejects an invalid audit trail", () => {
    const r = evaluateIntegrity({
      ...base,
      evidenceLinks: [{ evidenceId: "e1", relationship: "SUPPORTING" }],
      auditEvents: [{ id: "a1", timestamp: "2026-09-10T12:00:00Z", action: "UPDATED", entityType: "evidence", entityId: "missing", summary: "Updated" }],
    });
    expect(r.classification).toBe("UNKNOWN");
    expect(r.auditIssues.length).toBeGreaterThan(0);
  });

  it("accepts a structurally valid audit trail", () => {
    const r = evaluateIntegrity({
      ...base,
      evidenceLinks: [{ evidenceId: "e1", relationship: "SUPPORTING" }],
      auditEvents: [{ id: "a1", timestamp: "2026-09-10T12:00:00Z", action: "LINKED", entityType: "evidence", entityId: "e1", summary: "Linked as supporting" }],
    });
    expect(r.classification).toBe("FACT");
    expect(r.auditIssues).toEqual([]);
  });
});
