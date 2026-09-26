import type { AuditEvent } from "./types";

export interface AuditAssessment {
  valid: boolean;
  invalidEventIds: string[];
  reasons: string[];
}

export interface AuditChainAssessment extends AuditAssessment {
  anchored: boolean;
  computedEventHashes: string[];
}

/** Validates audit-trail structure without asserting that events are truthful. */
export function assessAuditTrail(events: AuditEvent[]): AuditAssessment {
  const reasons: string[] = [], invalid: string[] = [], seen = new Set<string>();
  let previous: string | undefined;
  for (const event of events) {
    if (!event.id || !event.entityType || !event.entityId || !event.action || !event.timestamp) {
      invalid.push(event.id || "<missing-id>");
      continue;
    }
    if (seen.has(event.id)) {
      invalid.push(event.id);
      reasons.push(`Duplicate audit event identifier: ${event.id}.`);
    }
    seen.add(event.id);
    if (!event.summary?.trim()) {
      invalid.push(event.id);
      reasons.push(`Audit event ${event.id} has no summary.`);
    }
    const ts = Date.parse(event.timestamp);
    if (Number.isNaN(ts)) {
      invalid.push(event.id);
      reasons.push(`Audit event ${event.id} has an invalid timestamp.`);
    } else if (previous !== undefined && ts < Date.parse(previous)) {
      invalid.push(event.id);
      reasons.push(`Audit event ${event.id} is earlier than the preceding event.`);
    }
    previous = event.timestamp;
  }
  if (invalid.length && !reasons.length) reasons.push("One or more audit events are structurally invalid.");
  return { valid: invalid.length === 0, invalidEventIds: [...new Set(invalid)], reasons };
}

function canonicalEvent(event: AuditEvent): string {
  return JSON.stringify({
    id: event.id,
    timestamp: event.timestamp,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    actorRef: event.actorRef ?? null,
    summary: event.summary,
    beforeHash: event.beforeHash ?? null,
    afterHash: event.afterHash ?? null,
    previousHash: event.previousHash ?? null,
  });
}

async function sha256Hex(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable in this runtime.");
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Computes the tamper-evident hash for one event using its previous chain hash. */
export async function hashAuditEvent(event: AuditEvent): Promise<string> {
  return sha256Hex(canonicalEvent(event));
}

/**
 * Verifies an audit-event hash chain against an external anchor.
 * The anchor must live outside the mutable event list for the chain to provide tamper evidence.
 */
export async function verifyAuditChain(events: AuditEvent[], anchorHash: string): Promise<AuditChainAssessment> {
  const structural = assessAuditTrail(events);
  const reasons = [...structural.reasons];
  const invalid = [...structural.invalidEventIds];
  const computedEventHashes: string[] = [];
  let previousHash = anchorHash.trim();

  if (!previousHash) {
    reasons.push("Audit chain verification requires an external anchor hash.");
    return { valid: false, invalidEventIds: invalid, reasons, anchored: false, computedEventHashes };
  }

  for (const event of events) {
    const expectedPrevious = event.previousHash ?? "";
    if (expectedPrevious !== previousHash) {
      invalid.push(event.id);
      reasons.push(`Audit event ${event.id} has a broken previous-hash link.`);
    }

    const computed = await hashAuditEvent(event);
    computedEventHashes.push(computed);
    if (event.eventHash !== computed) {
      invalid.push(event.id);
      reasons.push(`Audit event ${event.id} hash does not match its canonical contents.`);
    }
    previousHash = computed;
  }

  return {
    valid: invalid.length === 0 && structural.valid,
    invalidEventIds: [...new Set(invalid)],
    reasons: [...new Set(reasons)],
    anchored: true,
    computedEventHashes,
  };
}
