import type { Evidence, EvidenceLink, IntegrityFinding, IntegrityInput } from "./types";

function duplicateIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }

  return [...duplicates];
}

function validEvidence(input: IntegrityInput): Evidence[] {
  const sourceIds = new Set(input.sources.map((source) => source.id));
  return input.evidence.filter(
    (item) => sourceIds.has(item.sourceId) && item.exactText.trim().length > 0,
  );
}

function linkedEvidence(
  evidence: Evidence[],
  links: EvidenceLink[],
  relationship: EvidenceLink["relationship"],
): Evidence[] {
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));

  return links
    .filter((link) => link.relationship === relationship)
    .map((link) => evidenceById.get(link.evidenceId))
    .filter((item): item is Evidence => Boolean(item));
}

/**
 * Deterministic core rule:
 * a claim is never promoted to FACT merely because a source exists.
 * It requires source-backed evidence explicitly linked as SUPPORTING.
 * Contrary evidence remains visible and produces CONTRADICTION.
 *
 * This function deliberately performs no retrieval, network calls, model
 * inference, semantic judgment, or vendor-specific work.
 */
export function evaluateIntegrity(input: IntegrityInput): IntegrityFinding {
  const reasons: string[] = [];
  const unknowns: string[] = [];
  const missingEvidence: string[] = [];
  const sources = input.sources ?? [];
  const evidenceItems = input.evidence ?? [];
  const links = input.evidenceLinks ?? [];

  if (!input.question?.trim()) {
    unknowns.push("The record does not contain a specific question.");
  }

  if (!input.claim?.text?.trim()) {
    unknowns.push("The record does not contain a claim to evaluate.");
  }

  if (sources.length === 0) {
    missingEvidence.push("No source has been identified.");
  }

  const duplicateSourceIds = duplicateIds(sources.map((source) => source.id));
  const duplicateEvidenceIds = duplicateIds(evidenceItems.map((item) => item.id));
  const duplicateLinkIds = duplicateIds(links.map((link) => link.evidenceId));

  if (duplicateSourceIds.length > 0) {
    unknowns.push(`Duplicate source identifier(s): ${duplicateSourceIds.join(", ")}.`);
  }
  if (duplicateEvidenceIds.length > 0) {
    unknowns.push(`Duplicate evidence identifier(s): ${duplicateEvidenceIds.join(", ")}.`);
  }

  const sourceIds = new Set(sources.map((source) => source.id));
  const evidenceIds = new Set(evidenceItems.map((item) => item.id));

  const malformedEvidence = evidenceItems.filter(
    (item) => !sourceIds.has(item.sourceId) || !item.exactText?.trim(),
  );
  if (malformedEvidence.length > 0) {
    unknowns.push("One or more evidence items are missing a valid source anchor or preserved exact text.");
  }

  const orphanedLinks = links.filter((link) => !evidenceIds.has(link.evidenceId));
  if (orphanedLinks.length > 0) {
    unknowns.push("One or more evidence links point to evidence that is not present in the record.");
  }

  if (duplicateLinkIds.length > 0) {
    unknowns.push(`Duplicate evidence link(s): ${duplicateLinkIds.join(", ")}.`);
  }

  const evidence = validEvidence(input);
  if (evidence.length === 0) {
    missingEvidence.push("No source-backed evidence with preserved exact text is available.");
  }

  const supporting = linkedEvidence(evidence, links, "SUPPORTING");
  const contrary = linkedEvidence(evidence, links, "CONTRARY");

  if (supporting.length > 0 && contrary.length > 0) {
    reasons.push("Supporting and contrary evidence are both present; the conflict must remain visible.");
  } else if (supporting.length > 0) {
    reasons.push("At least one source-backed evidence item is explicitly linked as supporting the claim.");
  } else if (contrary.length > 0) {
    reasons.push("Contrary evidence is present, but no supporting relationship has been established.");
  } else if (evidence.length > 0) {
    reasons.push("Evidence exists, but no supporting relationship has been established.");
  }

  const base = {
    supportsClaim: supporting.length > 0,
    supportingEvidenceIds: supporting.map((item) => item.id),
    contraryEvidenceIds: contrary.map((item) => item.id),
    missingEvidence,
    unknowns,
    reasons,
  };

  if (unknowns.length > 0) {
    return { classification: "UNKNOWN", ...base, supportsClaim: false };
  }

  if (supporting.length > 0 && contrary.length > 0) {
    return { classification: "CONTRADICTION", ...base };
  }

  if (supporting.length > 0) {
    return { classification: "FACT", ...base };
  }

  return { classification: "CLAIM", ...base, supportsClaim: false };
}
