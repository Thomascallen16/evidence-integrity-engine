import type {
  InvestigationResult,
  ValidationError,
  ValidationStatus,
} from "./types";

export function emptyResult(question: string): InvestigationResult {
  return {
    summary: `No stored evidence currently establishes an answer to: ${question}`,
    findings: [{
      classification: "UNKNOWN",
      statement: "The available record does not establish an answer.",
      supportingEvidenceIds: [],
      contradictingEvidenceIds: [],
      confidence: "none",
      explanation: "No source-backed evidence was available for this investigation.",
      provenance: "No retrieved evidence.",
      uncertainty: "Additional source material is required.",
    }],
    contradictions: [],
    unknowns: ["No source-backed evidence was available for this question."],
  };
}

/**
 * Validate the structural integrity of an AI- or application-produced finding.
 * The engine never treats the model as the source of truth. Every referenced
 * evidence ID must belong to the evidence set supplied to the validator.
 */
export function validateInvestigationResult(
  result: InvestigationResult,
  evidenceIds: Array<number | string>,
): { result: InvestigationResult; validationStatus: ValidationStatus; errors: ValidationError[] } {
  const allowed = new Set(evidenceIds);
  const errors: ValidationError[] = [];

  result.findings.forEach((finding, findingIndex) => {
    for (const evidenceId of [...finding.supportingEvidenceIds, ...finding.contradictingEvidenceIds]) {
      if (!allowed.has(evidenceId)) {
        errors.push({ findingIndex, evidenceId, reason: "UNAVAILABLE_EVIDENCE" });
      }
    }
  });

  if (errors.length > 0) {
    throw new Error(`Finding references unavailable evidence: ${errors.map(e => String(e.evidenceId)).join(", ")}`);
  }

  const hasContradiction = result.findings.some(f => f.classification === "CONTRADICTION") || result.contradictions.length > 0;
  const hasUnknown = result.findings.some(f => f.classification === "UNKNOWN") || result.unknowns.length > 0;
  const validationStatus: ValidationStatus = hasContradiction ? "CONTRADICTION" : hasUnknown ? "UNKNOWN" : "VALID";

  return { result, validationStatus, errors };
}
