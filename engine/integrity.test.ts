import { describe, expect, it } from "vitest";
import { evaluateIntegrity } from "./integrity";

const source = { id: "s1", title: "Primary record", designation: "PRIMARY" as const };
const evidence = { id: "e1", sourceId: "s1", exactText: "Exact preserved source text." };
const base = { question: "Did the record support the claim?", claim: { id: "c1", text: "The record supports the claim." }, sources: [source], evidence: [evidence] };
const supporting = [{ evidenceId: "e1", relationship: "SUPPORTING" as const }];
const contrary = [{ evidenceId: "e1", relationship: "CONTRARY" as const }];

describe("evaluateIntegrity — epistemic safety", () => {
  it("never promotes a source-only claim to FACT", () => { const r = evaluateIntegrity({ ...base, evidence: [] }); expect(r.classification).not.toBe("FACT"); expect(r.supportsClaim).toBe(false); expect(r.missingEvidence.length).toBeGreaterThan(0); });
  it("requires explicit SUPPORTING before FACT", () => { const r = evaluateIntegrity(base); expect(r.classification).toBe("CLAIM"); expect(r.supportsClaim).toBe(false); });
  it("classifies source-anchored supporting evidence as FACT", () => { const r = evaluateIntegrity({ ...base, evidenceLinks: supporting }); expect(r.classification).toBe("FACT"); expect(r.supportingEvidenceIds).toEqual(["e1"]); });
  it("classifies support plus contrary evidence as CONTRADICTION", () => { const r = evaluateIntegrity({ ...base, evidence: [...base.evidence, { id: "e2", sourceId: "s1", exactText: "Contrary preserved source text." }], evidenceLinks: [...supporting, { evidenceId: "e2", relationship: "CONTRARY" }] }); expect(r.classification).toBe("CONTRADICTION"); expect(r.contraryEvidenceIds).toEqual(["e2"]); });
  it("does not promote contrary-only evidence", () => { const r = evaluateIntegrity({ ...base, evidenceLinks: contrary }); expect(r.classification).toBe("CLAIM"); expect(r.supportsClaim).toBe(false); });
  it("returns UNKNOWN when question is missing", () => { expect(evaluateIntegrity({ ...base, question: "", evidenceLinks: supporting }).classification).toBe("UNKNOWN"); });
  it("returns UNKNOWN when claim is missing", () => { expect(evaluateIntegrity({ ...base, claim: { id: "", text: "" }, evidenceLinks: supporting }).classification).toBe("UNKNOWN"); });
  it("rejects evidence pointing to an unknown source", () => { expect(evaluateIntegrity({ ...base, evidence: [{ id: "e9", sourceId: "missing-source", exactText: "Unanchored text" }], evidenceLinks: [{ evidenceId: "e9", relationship: "SUPPORTING" }] }).classification).toBe("UNKNOWN"); });
  it("rejects duplicate source identifiers", () => { expect(evaluateIntegrity({ ...base, sources: [...base.sources, { id: "s1", title: "Another record" }], evidenceLinks: supporting }).classification).toBe("UNKNOWN"); });
  it("rejects duplicate evidence identifiers", () => { expect(evaluateIntegrity({ ...base, evidence: [...base.evidence, { id: "e1", sourceId: "s1", exactText: "Duplicate evidence" }], evidenceLinks: supporting }).classification).toBe("UNKNOWN"); });
  it("rejects orphaned evidence links", () => { expect(evaluateIntegrity({ ...base, evidenceLinks: [{ evidenceId: "missing", relationship: "SUPPORTING" }] }).classification).toBe("UNKNOWN"); });
  it("does not allow empty evidence text to support a claim", () => { expect(evaluateIntegrity({ ...base, evidence: [{ id: "e1", sourceId: "s1", exactText: "   " }], evidenceLinks: supporting }).classification).not.toBe("FACT"); });
  it("does not allow an empty source identifier to anchor evidence", () => { expect(evaluateIntegrity({ ...base, sources: [{ id: "", title: "Primary record" }], evidence: [{ id: "e1", sourceId: "", exactText: "Text" }], evidenceLinks: supporting }).classification).toBe("UNKNOWN"); });
  it("does not let duplicate links manufacture stronger support", () => { const r = evaluateIntegrity({ ...base, evidenceLinks: [...supporting, ...supporting] }); expect(r.classification).toBe("FACT"); expect(r.supportingEvidenceIds).toEqual(["e1"]); });
  it("keeps source designation subordinate to explicit evidence", () => { const r = evaluateIntegrity({ ...base, evidenceLinks: supporting }); expect(r.classification).toBe("FACT"); });
});
