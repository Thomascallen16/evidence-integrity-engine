import { describe, expect, it } from "vitest";
import { evaluateIntegrity } from "./integrity";

const base = {
  question: "Did the record support the claim?",
  claim: { id: "c1", text: "The record supports the claim." },
  sources: [{ id: "s1", title: "Primary record", designation: "PRIMARY" as const }],
  evidence: [{ id: "e1", sourceId: "s1", exactText: "Exact preserved source text." }],
};
const support = { evidenceLinks: [{ evidenceId: "e1", relationship: "SUPPORTING" as const }] };
const run = (x = {}) => evaluateIntegrity({ ...base, ...x });

describe("epistemic guardrails", () => {
  it("never promotes source-only records to FACT", () => expect(run({ evidence: [] }).classification).not.toBe("FACT"));
  it("requires an explicit SUPPORTING relationship", () => expect(run().classification).toBe("CLAIM"));
  it("promotes source-anchored supporting evidence to FACT", () => expect(run(support).classification).toBe("FACT"));
  it("marks support plus contrary evidence as CONTRADICTION", () => {
    const r = run({ evidence: [...base.evidence, { id: "e2", sourceId: "s1", exactText: "Contrary" }], evidenceLinks: [{ evidenceId: "e1", relationship: "SUPPORTING" }, { evidenceId: "e2", relationship: "CONTRARY" }] });
    expect(r.classification).toBe("CONTRADICTION");
    expect(r.supportingEvidenceIds).toEqual(["e1"]);
    expect(r.contraryEvidenceIds).toEqual(["e2"]);
  });
  it("does not promote contrary-only evidence", () => expect(run({ evidenceLinks: [{ evidenceId: "e1", relationship: "CONTRARY" }] }).classification).toBe("CLAIM"));
  it("returns UNKNOWN for missing question", () => expect(run({ question: "", ...support }).classification).toBe("UNKNOWN"));
  it("returns UNKNOWN for missing claim text", () => expect(run({ claim: { id: "c1", text: "" }, ...support }).classification).toBe("UNKNOWN"));
  it("returns UNKNOWN for missing claim id", () => expect(run({ claim: { id: "", text: base.claim.text }, ...support }).classification).toBe("UNKNOWN"));
});

describe("provenance and structure", () => {
  it("rejects unknown source anchors", () => expect(run({ evidence: [{ id: "e9", sourceId: "missing", exactText: "text" }], evidenceLinks: [{ evidenceId: "e9", relationship: "SUPPORTING" }] }).classification).toBe("UNKNOWN"));
  it("rejects duplicate source ids", () => expect(run({ sources: [...base.sources, { id: "s1", title: "Duplicate" }], ...support }).classification).toBe("UNKNOWN"));
  it("rejects duplicate evidence ids", () => expect(run({ evidence: [...base.evidence, { id: "e1", sourceId: "s1", exactText: "Duplicate" }], ...support }).classification).toBe("UNKNOWN"));
  it("rejects orphaned evidence links", () => expect(run({ evidenceLinks: [{ evidenceId: "missing", relationship: "SUPPORTING" }] }).classification).toBe("UNKNOWN"));
  it("rejects empty preserved evidence text", () => expect(run({ evidence: [{ id: "e1", sourceId: "s1", exactText: "" }], ...support }).classification).toBe("UNKNOWN"));
  it("rejects claims referencing absent sources", () => expect(run({ claim: { ...base.claim, sourceIds: ["missing"] }, ...support }).classification).toBe("UNKNOWN"));
  it("rejects claims referencing absent evidence", () => expect(run({ claim: { ...base.claim, evidenceIds: ["missing"] }, ...support }).classification).toBe("UNKNOWN"));
  it("does not treat PRIMARY designation alone as proof", () => expect(run().classification).toBe("CLAIM"));
  it("does not treat SECONDARY designation alone as proof", () => expect(run({ sources: [{ id: "s1", title: "Secondary", designation: "SECONDARY" }] }).classification).toBe("CLAIM"));
});

describe("verification controls", () => {
  it("excludes REJECTED supporting evidence", () => {
    const r = run({ ...support, verificationRecords: [{ id: "v1", targetId: "e1", status: "REJECTED", verifiedAt: "2026-01-02T00:00:00Z" }] });
    expect(r.classification).toBe("CLAIM");
    expect(r.rejectedEvidenceIds).toEqual(["e1"]);
  });
  it("excludes NEEDS_REVIEW supporting evidence", () => expect(run({ ...support, verificationRecords: [{ id: "v1", targetId: "e1", status: "NEEDS_REVIEW", verifiedAt: "2026-01-02T00:00:00Z" }] }).classification).toBe("CLAIM"));
  it("uses the latest verification record", () => expect(run({ ...support, verificationRecords: [{ id: "old", targetId: "e1", status: "REJECTED", verifiedAt: "2026-01-01T00:00:00Z" }, { id: "new", targetId: "e1", status: "VERIFIED", verifiedAt: "2026-01-03T00:00:00Z" }] }).classification).toBe("FACT"));
  it("does not let claim-level NEEDS_REVIEW become FACT", () => expect(run({ ...support, verificationRecords: [{ id: "v1", targetId: "c1", status: "NEEDS_REVIEW", verifiedAt: "2026-01-02T00:00:00Z" }] }).classification).toBe("UNKNOWN"));
});

describe("audit trail controls", () => {
  const audit = { auditEvents: [{ id: "a1", timestamp: "2026-01-01T00:00:00Z", action: "CREATED" as const, entityType: "evidence", entityId: "e1", summary: "Evidence captured." }] };
  it("accepts a valid chronological audit trail", () => { const r = run({ ...support, ...audit }); expect(r.classification).toBe("FACT"); expect(r.auditIssues).toEqual([]); });
  it("rejects duplicate audit event ids", () => expect(run({ ...support, auditEvents: [...audit.auditEvents, { ...audit.auditEvents[0], summary: "Duplicate" }] }).classification).toBe("UNKNOWN"));
  it("rejects unknown audit entities", () => expect(run({ ...support, auditEvents: [{ ...audit.auditEvents[0], entityId: "missing" }] }).classification).toBe("UNKNOWN"));
  it("rejects incomplete audit events", () => expect(run({ ...support, auditEvents: [{ ...audit.auditEvents[0], summary: "" }] }).classification).toBe("UNKNOWN"));
  it("rejects backward audit chronology", () => expect(run({ ...support, auditEvents: [audit.auditEvents[0], { id: "a2", timestamp: "2025-12-31T00:00:00Z", action: "UPDATED", entityType: "evidence", entityId: "e1", summary: "Edited" }] }).classification).toBe("UNKNOWN"));
});
