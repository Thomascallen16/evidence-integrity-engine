import type { AuditEvent, Evidence, EvidenceLink, IntegrityFinding, IntegrityInput, VerificationRecord } from "./types";

function duplicateIds(ids: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
}

function linkedEvidence(evidence: Evidence[], links: EvidenceLink[], relationship: EvidenceLink["relationship"]) {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  return links.filter((l) => l.relationship === relationship).map((l) => byId.get(l.evidenceId)).filter((e): e is Evidence => Boolean(e));
}

function latestVerification(records: VerificationRecord[], targetId: string) {
  return records.filter((r) => r.targetId === targetId && r.id && r.verifiedAt && r.status).sort((a, b) => String(b.verifiedAt).localeCompare(String(a.verifiedAt)))[0];
}

function validateAudit(events: AuditEvent[], knownIds: Set<string>) {
  const issues: string[] = [];
  const duplicateEventIds = duplicateIds(events.map((e) => e.id));
  if (duplicateEventIds.length) issues.push(`Duplicate audit event identifier(s): ${duplicateEventIds.join(", ")}.`);
  for (const event of events) {
    if (!event.id || !event.timestamp || !event.entityType || !event.entityId || !event.action || !event.summary?.trim()) issues.push(`Audit event ${event.id || "(missing id)"} is structurally incomplete.`);
    if (event.entityId && !knownIds.has(event.entityId)) issues.push(`Audit event ${event.id} references unknown entity ${event.entityId}.`);
  }
  for (let i = 1; i < events.length; i++) {
    if (String(events[i].timestamp) < String(events[i - 1].timestamp)) { issues.push("Audit events are not in chronological order."); break; }
  }
  return issues;
}

export function evaluateIntegrity(input: IntegrityInput): IntegrityFinding {
  const reasons: string[] = [], unknowns: string[] = [], missingEvidence: string[] = [], rejectedEvidenceIds: string[] = [], reviewEvidenceIds: string[] = [], auditIssues: string[] = [];
  const sources = input.sources ?? [], evidenceItems = input.evidence ?? [], links = input.evidenceLinks ?? [], verifications = input.verificationRecords ?? [], audits = input.auditEvents ?? [];

  if (!input.question?.trim()) unknowns.push("The record does not contain a specific question.");
  if (!input.claim?.text?.trim()) unknowns.push("The record does not contain a claim to evaluate.");
  if (!input.claim?.id?.trim()) unknowns.push("The claim does not contain an identifier.");
  if (sources.length === 0) missingEvidence.push("No source has been identified.");

  if (sources.some((s) => !s.id?.trim() || !s.title?.trim())) unknowns.push("One or more sources are missing a valid identifier or title.");
  const duplicateSourceIds = duplicateIds(sources.map((s) => s.id)), duplicateEvidenceIds = duplicateIds(evidenceItems.map((e) => e.id)), duplicateLinkIds = duplicateIds(links.map((l) => l.evidenceId));
  if (duplicateSourceIds.length) unknowns.push(`Duplicate source identifier(s): ${duplicateSourceIds.join(", ")}.`);
  if (duplicateEvidenceIds.length) unknowns.push(`Duplicate evidence identifier(s): ${duplicateEvidenceIds.join(", ")}.`);
  if (duplicateLinkIds.length) unknowns.push(`Duplicate evidence link(s): ${duplicateLinkIds.join(", ")}.`);

  const sourceIds = new Set(sources.map((s) => s.id)), evidenceIds = new Set(evidenceItems.map((e) => e.id));
  const knownEntityIds = new Set<string>([input.claim.id, ...sources.map((s) => s.id), ...evidenceItems.map((e) => e.id)]);
  if (evidenceItems.some((e) => !e.id?.trim() || !e.sourceId?.trim() || !sourceIds.has(e.sourceId) || !e.exactText?.trim())) unknowns.push("One or more evidence items are missing a valid identifier, source anchor, or preserved exact text.");
  if (links.some((l) => !evidenceIds.has(l.evidenceId))) unknowns.push("One or more evidence links point to evidence that is not present in the record.");
  if (links.some((l) => l.relationship !== "SUPPORTING" && l.relationship !== "CONTRARY")) unknowns.push("One or more evidence links contain an invalid relationship.");
  if (input.claim.sourceIds?.some((id) => !id?.trim() || !sourceIds.has(id))) unknowns.push("The claim references a source that is not present in the record.");
  if (input.claim.evidenceIds?.some((id) => !id?.trim() || !evidenceIds.has(id))) unknowns.push("The claim references evidence that is not present in the record.");

  const evidence = evidenceItems.filter((e) => sourceIds.has(e.sourceId) && e.exactText?.trim());
  if (!evidence.length) missingEvidence.push("No source-backed evidence with preserved exact text is available.");
  for (const item of evidence) {
    const verification = latestVerification(verifications, item.id);
    if (verification?.status === "REJECTED") rejectedEvidenceIds.push(item.id);
    if (verification?.status === "NEEDS_REVIEW") reviewEvidenceIds.push(item.id);
  }
  const claimVerification = latestVerification(verifications, input.claim.id);
  if (claimVerification?.status === "REJECTED") unknowns.push("The claim itself has a latest verification status of REJECTED.");
  if (claimVerification?.status === "NEEDS_REVIEW") unknowns.push("The claim itself is marked NEEDS_REVIEW.");

  auditIssues.push(...validateAudit(audits, knownEntityIds));
  if (auditIssues.length) unknowns.push("The audit trail contains unresolved structural issues.");

  const supporting = linkedEvidence(evidence, links, "SUPPORTING"), contrary = linkedEvidence(evidence, links, "CONTRARY");
  const usableSupporting = supporting.filter((e) => !rejectedEvidenceIds.includes(e.id) && !reviewEvidenceIds.includes(e.id));
  if (supporting.length && contrary.length) reasons.push("Supporting and contrary evidence are both present; the conflict remains visible.");
  else if (supporting.length) reasons.push("At least one source-backed evidence item is explicitly linked as supporting the claim.");
  else if (contrary.length) reasons.push("Contrary evidence is present, but no supporting relationship has been established.");
  else if (evidence.length) reasons.push("Evidence exists, but no supporting relationship has been established.");
  if (rejectedEvidenceIds.length) reasons.push("Rejected evidence is excluded from support for the claim.");
  if (reviewEvidenceIds.length) reasons.push("Evidence marked NEEDS_REVIEW cannot promote the claim to FACT.");
  if (claimVerification?.status === "VERIFIED") reasons.push("The claim has an explicit VERIFIED verification record.");

  const base = { supportsClaim: usableSupporting.length > 0, supportingEvidenceIds: supporting.map((e) => e.id), contraryEvidenceIds: contrary.map((e) => e.id), missingEvidence, unknowns, reasons, rejectedEvidenceIds, reviewEvidenceIds, auditIssues };
  if (unknowns.length) return { classification: "UNKNOWN", ...base, supportsClaim: false };
  if (supporting.length && contrary.length) return { classification: "CONTRADICTION", ...base };
  if (usableSupporting.length) return { classification: "FACT", ...base };
  return { classification: "CLAIM", ...base, supportsClaim: false };
}
