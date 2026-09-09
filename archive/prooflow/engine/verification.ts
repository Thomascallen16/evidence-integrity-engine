import type { Evidence, VerificationRecord } from "./types";

export type VerificationState = "VERIFIED" | "UNVERIFIED" | "REJECTED" | "NEEDS_REVIEW";

export interface VerificationAssessment {
  state: VerificationState;
  applicableRecordIds: string[];
  reasons: string[];
}

/**
 * Verification is explicit metadata, not a claim about objective truth.
 * The engine only checks whether a verification record is structurally complete;
 * it never performs the verification itself.
 */
export function assessVerification(
  targetId: string,
  evidence: Evidence[],
  records: VerificationRecord[],
): VerificationAssessment {
  const targetEvidence = evidence.some((item) => item.id === targetId);
  const applicable = records.filter((record) => record.targetId === targetId);

  if (!targetEvidence) {
    return {
      state: "NEEDS_REVIEW",
      applicableRecordIds: applicable.map((record) => record.id),
      reasons: ["The verification target is not present in the supplied evidence record."],
    };
  }

  if (applicable.length === 0) {
    return {
      state: "UNVERIFIED",
      applicableRecordIds: [],
      reasons: ["No explicit verification record has been supplied."],
    };
  }

  const invalid = applicable.filter(
    (record) =>
      record.status === "VERIFIED" &&
      (!record.verifier || !record.verifiedAt || !record.method),
  );

  if (invalid.length > 0) {
    return {
      state: "NEEDS_REVIEW",
      applicableRecordIds: applicable.map((record) => record.id),
      reasons: ["A VERIFIED record is missing verifier, method, or verification timestamp."],
    };
  }

  const latest = [...applicable].sort((a, b) => a.verifiedAt.localeCompare(b.verifiedAt)).at(-1)!;
  return {
    state: latest.status,
    applicableRecordIds: applicable.map((record) => record.id),
    reasons: [latest.reason ?? `Verification state recorded as ${latest.status}.`],
  };
}
