import { describe, expect, it } from "vitest";
import { emptyResult, rankEvidence, validateInvestigationResult, type RetrievedEvidence } from "../src/index";

describe("evidence integrity engine", () => {
  it("returns UNKNOWN when no evidence establishes an answer", () => {
    const result = emptyResult("What happened?");
    expect(result.findings[0]?.classification).toBe("UNKNOWN");
    expect(result.unknowns).toHaveLength(1);
  });

  it("preserves explicit contradictions", () => {
    const result = {
      summary: "Conflict",
      findings: [{
        classification: "CONTRADICTION" as const,
        statement: "Sources conflict",
        supportingEvidenceIds: [1],
        contradictingEvidenceIds: [2],
        confidence: "medium",
        explanation: "The excerpts disagree.",
        provenance: "Evidence 1 and 2",
        uncertainty: "The record does not resolve the conflict.",
      }],
      contradictions: ["Sources conflict"],
      unknowns: [],
    };
    expect(validateInvestigationResult(result, [1, 2]).validationStatus).toBe("CONTRADICTION");
  });

  it("rejects evidence IDs that were not supplied to the validator", () => {
    const result = emptyResult("Question");
    result.findings[0]!.supportingEvidenceIds = [99];
    expect(() => validateInvestigationResult(result, [1])).toThrow(/unavailable evidence/);
  });

  it("ranks evidence deterministically from the question", () => {
    const evidence: RetrievedEvidence[] = [
      { evidenceId: 1, sourceId: 1, source: { title: "Order", recordType: "order", origin: "Court", location: "court.example", provenanceNote: "Official filing" }, label: "Unrelated", content: "A different topic", locator: null, confidenceStatus: "PRIMARY-RECORD", claimIds: [] },
      { evidenceId: 2, sourceId: 2, source: { title: "Hearing order", recordType: "order", origin: "Court", location: "court.example", provenanceNote: "Official filing" }, label: "Hearing date", content: "The hearing date is stated here", locator: "p. 4", confidenceStatus: "PRIMARY-RECORD", claimIds: [] },
    ];
    expect(rankEvidence("hearing date", evidence)[0]?.evidenceId).toBe(2);
  });
});
