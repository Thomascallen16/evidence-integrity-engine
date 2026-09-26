import { describe, expect, it } from "vitest";
import { assessAuditTrail, hashAuditEvent, verifyAuditChain } from "./audit";
import type { AuditEvent } from "./types";

const anchor = "anchor-001";
const event = (overrides: Partial<AuditEvent> = {}): AuditEvent => ({
  id: "a1",
  timestamp: "2026-01-01T00:00:00Z",
  action: "CREATED",
  entityType: "evidence",
  entityId: "e1",
  summary: "Evidence captured.",
  ...overrides,
});

describe("audit trail controls", () => {
  it("accepts a valid chronological audit trail", () => {
    expect(assessAuditTrail([event()]).valid).toBe(true);
  });

  it("rejects duplicate audit ids", () => {
    expect(assessAuditTrail([event(), event({ id: "a1", summary: "Duplicate." })]).valid).toBe(false);
  });

  it("rejects backward chronology", () => {
    expect(assessAuditTrail([event(), event({ id: "a2", timestamp: "2025-12-31T00:00:00Z" })]).valid).toBe(false);
  });

  it("detects a broken or altered hash chain", async () => {
    const first = event({ previousHash: anchor });
    const firstHash = await hashAuditEvent(first);
    const second = event({ id: "a2", timestamp: "2026-01-01T00:01:00Z", previousHash: firstHash });
    const secondHash = await hashAuditEvent(second);
    const sealed = [
      { ...first, eventHash: firstHash },
      { ...second, eventHash: secondHash },
    ];
    expect((await verifyAuditChain(sealed, anchor)).valid).toBe(true);
    expect((await verifyAuditChain([{ ...sealed[0], summary: "tampered" }, sealed[1]], anchor)).valid).toBe(false);
    expect((await verifyAuditChain(sealed.map((e, i) => i === 1 ? { ...e, previousHash: anchor } : e), anchor)).valid).toBe(false);
  });
});
