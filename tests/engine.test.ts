import { describe, expect, it } from "vitest";
import { emptyResult, validateInvestigationResult } from "../src/validation";
import { rankEvidence } from "../src/retrieval";
import { checkProvenance } from "../src/provenance";
import { findExplicitContradictions } from "../src/contradictions";
import type { InvestigationResult, RetrievedEvidence } from "../src/types";

const evidence = (id: number, content: string): RetrievedEvidence => ({
  evidenceId: id,
  sourceId: id,
  source: { title: `Source ${id}`, recordType: "record", origin: "primary", location: `p.${id}`, provenanceNote: "verified" },
  label: `Evidence ${id}`,
  content,
  locator: `page ${id}`,
  confidenceStatus: "verified",
  claimIds: [],
});

describe("Evidence Integrity Engine", () => {
  it("returns UNKNOWN when no evidence exists", () => {
    expect(emptyResult("What happened?").findings[0].classification).toBe("UNKNOWN");
  });

  it("accepts only evidence IDs supplied to the validator", () => {
    const result: InvestigationResult = {
      summary: "Supported",
      findings: [{ classification: "FACT", statement: "A", supportingEvidenceIds: [1], contradictingEvidenceIds: [], confidence: "high", explanation: "", provenance: "", uncertainty: "" }],
      contradictions: [],
      unknowns: [],
    };
    expect(validateInvestigationResult(result, [1]).validationStatus).toBe("VALID");
    expect(() => validateInvestigationResult(result, [2])).toThrow(/unavailable evidence/);
  });

  it("rejects unsupported classifications", () => {
    const result = { ...emptyResult("Q"), findings: [{ ...emptyResult("Q").findings[0], classification: "NOT_A_CLASSIFICATION" }] } as unknown as InvestigationResult;
    expect(() => validateInvestigationResult(result, [])).toThrow(/Unsupported investigation classification/);
  });

  it("ranks relevant evidence deterministically", () => {
    const ranked = rankEvidence("pursuit vehicle", [evidence(1, "unrelated material"), evidence(2, "vehicle pursuit record")]);
    expect(ranked.map(item => item.evidenceId)).toEqual([2, 1]);
  });

  it("detects explicit evidence conflicts between findings", () => {
    const result: InvestigationResult = {
      summary: "Conflict",
      findings: [
        { classification: "FACT", statement: "A", supportingEvidenceIds: [1], contradictingEvidenceIds: [], confidence: "high", explanation: "", provenance: "", uncertainty: "" },
        { classification: "CLAIM", statement: "B", supportingEvidenceIds: [], contradictingEvidenceIds: [1], confidence: "medium", explanation: "", provenance: "", uncertainty: "" },
      ],
      contradictions: [],
      unknowns: [],
    };
    expect(findExplicitContradictions(result)).toHaveLength(1);
  });

  it("requires traceable provenance fields", () => {
    expect(checkProvenance(evidence(1, "text")).verified).toBe(true);
    expect(checkProvenance({ ...evidence(2, ""), locator: null }).verified).toBe(false);
  });
});
