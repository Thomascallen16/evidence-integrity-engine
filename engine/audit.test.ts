import { describe, expect, it } from "vitest";
import { assessAuditTrail } from "./audit";

const event = (id: string, timestamp: string) => ({
  id,
  timestamp,
  action: "CREATED" as const,
  entityType: "evidence",
  entityId: "e1",
  actorRef: "human:reviewer-1",
  summary: "Evidence created.",
});

describe("assessAuditTrail", () => {
  it("accepts a structurally valid chronological trail", () => {
    const result = assessAuditTrail([
      event("a1", "2026-09-04T18:00:00Z"),
      event("a2", "2026-09-04T18:01:00Z"),
    ]);
    expect(result.valid).toBe(true);
  });

  it("rejects duplicate audit identifiers", () => {
    const result = assessAuditTrail([
      event("a1", "2026-09-04T18:00:00Z"),
      event("a1", "2026-09-04T18:01:00Z"),
    ]);
    expect(result.valid).toBe(false);
  });

  it("rejects an out-of-order event", () => {
    const result = assessAuditTrail([
      event("a1", "2026-09-04T18:02:00Z"),
      event("a2", "2026-09-04T18:01:00Z"),
    ]);
    expect(result.valid).toBe(false);
  });

  it("rejects an invalid timestamp", () => {
    const result = assessAuditTrail([event("a1", "not-a-date")]);
    expect(result.valid).toBe(false);
  });

  it("rejects an empty audit summary", () => {
    const result = assessAuditTrail([{ ...event("a1", "2026-09-04T18:00:00Z"), summary: "   " }]);
    expect(result.valid).toBe(false);
  });
});
