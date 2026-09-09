import type { AuditEvent } from "./types";

export interface AuditAssessment {
  valid: boolean;
  invalidEventIds: string[];
  reasons: string[];
}

/**
 * Validates the shape of an audit trail without persisting or rewriting it.
 * The engine does not claim that an audit event is truthful; it verifies only
 * that the supplied event is structurally attributable and time-stamped.
 */
export function assessAuditTrail(events: AuditEvent[]): AuditAssessment {
  const reasons: string[] = [];
  const invalidEventIds: string[] = [];
  const seen = new Set<string>();
  let previousTimestamp: string | undefined;

  for (const event of events) {
    if (!event.id || !event.entityType || !event.entityId || !event.action || !event.timestamp) {
      invalidEventIds.push(event.id || "<missing-id>");
      continue;
    }

    if (seen.has(event.id)) {
      invalidEventIds.push(event.id);
      reasons.push(`Duplicate audit event identifier: ${event.id}.`);
    }
    seen.add(event.id);

    if (!event.summary?.trim()) {
      invalidEventIds.push(event.id);
      reasons.push(`Audit event ${event.id} has no summary.`);
    }

    const timestamp = Date.parse(event.timestamp);
    if (Number.isNaN(timestamp)) {
      invalidEventIds.push(event.id);
      reasons.push(`Audit event ${event.id} has an invalid timestamp.`);
    } else if (previousTimestamp !== undefined && timestamp < Date.parse(previousTimestamp)) {
      invalidEventIds.push(event.id);
      reasons.push(`Audit event ${event.id} is earlier than the preceding event.`);
    }

    previousTimestamp = event.timestamp;
  }

  if (invalidEventIds.length > 0 && reasons.length === 0) {
    reasons.push("One or more audit events are structurally invalid.");
  }

  return {
    valid: invalidEventIds.length === 0,
    invalidEventIds: [...new Set(invalidEventIds)],
    reasons,
  };
}
