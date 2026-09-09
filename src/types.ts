export const investigationClassifications = [
  "FACT",
  "LAW",
  "CLAIM",
  "INFERENCE",
  "QUESTION",
  "UNKNOWN",
  "CONTRADICTION",
] as const;

export type InvestigationClassification = typeof investigationClassifications[number];

export type EvidenceSource = {
  title: string;
  recordType: string;
  origin: string;
  location: string;
  provenanceNote: string;
};

export type RetrievedEvidence = {
  evidenceId: number | string;
  sourceId: number | string | null;
  source: EvidenceSource | null;
  label: string;
  content: string;
  locator: string | null;
  confidenceStatus: string;
  claimIds: Array<number | string>;
};

export type InvestigationFinding = {
  classification: InvestigationClassification;
  statement: string;
  supportingEvidenceIds: Array<number | string>;
  contradictingEvidenceIds: Array<number | string>;
  confidence: string;
  explanation: string;
  provenance: string;
  uncertainty: string;
};

export type InvestigationResult = {
  summary: string;
  findings: InvestigationFinding[];
  contradictions: string[];
  unknowns: string[];
};

export type ValidationStatus = "VALID" | "UNKNOWN" | "CONTRADICTION";

export type ValidationError = {
  findingIndex: number;
  evidenceId: number | string;
  reason: "UNAVAILABLE_EVIDENCE";
};
