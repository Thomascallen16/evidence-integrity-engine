import type { IntegrityInput } from "../engine/types";

export type AssuranceLevel = "BASELINE" | "ELEVATED" | "HIGH";

export interface EvidencePolicyProfile {
  id: string;
  name: string;
  assurance: AssuranceLevel;
  requireSourceLocator: boolean;
  requirePreservedEvidenceText: boolean;
  requireVerifiedEvidence: boolean;
  requireVerifierAndMethod: boolean;
  requireAuditChain?: boolean;
}

export interface PolicyAssessment {
  valid: boolean;
  reasons: string[];
}

export const generalEvidenceProfile: EvidencePolicyProfile = {
  id: "general-evidence",
  name: "General Evidence",
  assurance: "BASELINE",
  requireSourceLocator: true,
  requirePreservedEvidenceText: true,
  requireVerifiedEvidence: true,
  requireVerifierAndMethod: true,
};

export const highAssuranceAgentProfile: EvidencePolicyProfile = {
  id: "high-assurance-agent",
  name: "High Assurance Agent Evidence",
  assurance: "HIGH",
  requireSourceLocator: true,
  requirePreservedEvidenceText: true,
  requireVerifiedEvidence: true,
  requireVerifierAndMethod: true,
  requireAuditChain: true,
};

/**
 * Policy validation adds requirements; it never relaxes the core engine's
 * provenance gate. A profile is therefore an assurance overlay, not a second
 * truth engine.
 */
export function assessPolicy(input: IntegrityInput, profile: EvidencePolicyProfile): PolicyAssessment {
  const reasons: string[] = [];
  if (profile.requireSourceLocator && input.sources.some(s => !s.locator?.trim())) {
    reasons.push("Policy requires a source locator for every source.");
  }
  if (profile.requirePreservedEvidenceText && input.evidence.some(e => !e.exactText?.trim())) {
    reasons.push("Policy requires preserved exact evidence text.");
  }
  if (profile.requireVerifiedEvidence) {
    const verified = new Set((input.verificationRecords ?? []).filter(r => r.status === "VERIFIED").map(r => r.targetId));
    const missing = input.evidence.filter(e => !verified.has(e.id)).map(e => e.id);
    if (missing.length) reasons.push(`Policy requires VERIFIED evidence records for: ${missing.join(", ")}.`);
  }
  if (profile.requireVerifierAndMethod) {
    const malformed = (input.verificationRecords ?? []).filter(r =>
      r.status === "VERIFIED" && (!r.verifier?.trim() || !r.method?.trim())
    );
    if (malformed.length) reasons.push("Policy requires verifier and method on VERIFIED records.");
  }
  if (profile.requireAuditChain && !(input.auditEvents?.length)) {
    reasons.push("Policy requires an audit event chain.");
  }
  return { valid: reasons.length === 0, reasons };
}
