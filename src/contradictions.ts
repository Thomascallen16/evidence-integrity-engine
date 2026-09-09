import type { InvestigationFinding, InvestigationResult, RetrievedEvidence } from "./types";

export type ContradictionPair = {
  leftFindingIndex: number;
  rightFindingIndex: number;
  leftEvidenceIds: Array<number | string>;
  rightEvidenceIds: Array<number | string>;
};

/**
 * Finds explicit structural conflicts between findings. This does not infer
 * semantic contradiction from prose; applications can add domain-specific
 * comparison adapters without changing the core.
 */
export function findExplicitContradictions(result: InvestigationResult): ContradictionPair[] {
  const pairs: ContradictionPair[] = [];
  const findings = result.findings;

  for (let i = 0; i < findings.length; i++) {
    for (let j = i + 1; j < findings.length; j++) {
      const left = findings[i];
      const right = findings[j];
      const leftContradictsRight = left.contradictingEvidenceIds.some(id => right.supportingEvidenceIds.includes(id));
      const rightContradictsLeft = right.contradictingEvidenceIds.some(id => left.supportingEvidenceIds.includes(id));
      if (leftContradictsRight || rightContradictsLeft) {
        pairs.push({
          leftFindingIndex: i,
          rightFindingIndex: j,
          leftEvidenceIds: [...left.supportingEvidenceIds, ...left.contradictingEvidenceIds],
          rightEvidenceIds: [...right.supportingEvidenceIds, ...right.contradictingEvidenceIds],
        });
      }
    }
  }
  return pairs;
}

/** Return only evidence actually cited by a finding. */
export function evidenceForFinding(finding: InvestigationFinding, evidence: RetrievedEvidence[]): RetrievedEvidence[] {
  const ids = new Set([...finding.supportingEvidenceIds, ...finding.contradictingEvidenceIds]);
  return evidence.filter(item => ids.has(item.evidenceId));
}
