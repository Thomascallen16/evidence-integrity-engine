import type { RetrievedEvidence } from "./types";

export type ProvenanceCheck = {
  evidenceId: number | string;
  verified: boolean;
  reasons: string[];
};

/**
 * Checks whether an evidence item carries the minimum provenance needed for
 * traceable use. The engine does not independently authenticate external URLs;
 * verification must be supplied by the consuming source adapter.
 */
export function checkProvenance(evidence: RetrievedEvidence): ProvenanceCheck {
  const reasons: string[] = [];
  if (!evidence.source) reasons.push("MISSING_SOURCE");
  if (!evidence.content.trim()) reasons.push("MISSING_EVIDENCE_CONTENT");
  if (!evidence.locator?.trim()) reasons.push("MISSING_LOCATOR");
  if (!evidence.source?.title?.trim()) reasons.push("MISSING_SOURCE_TITLE");
  if (!evidence.source?.origin?.trim()) reasons.push("MISSING_SOURCE_ORIGIN");
  return { evidenceId: evidence.evidenceId, verified: reasons.length === 0, reasons };
}

export function checkEvidenceSetProvenance(evidence: RetrievedEvidence[]): ProvenanceCheck[] {
  return evidence.map(checkProvenance);
}
