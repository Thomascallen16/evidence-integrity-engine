import { describe, expect, it } from "vitest";
import { assessAgentEvents } from "./agent";

describe("agent activity evidence", () => {
  it("accepts observable tool activity without requiring chain-of-thought", () => {
    expect(assessAgentEvents([
      { id:"1", timestamp:"2026-10-06T00:00:00Z", type:"AGENT_STARTED", agentId:"a", runId:"r", summary:"started" },
      { id:"2", timestamp:"2026-10-06T00:00:01Z", type:"TOOL_INVOKED", agentId:"a", runId:"r", toolId:"search", summary:"invoked search" },
      { id:"3", timestamp:"2026-10-06T00:00:02Z", type:"TOOL_RETURNED", agentId:"a", runId:"r", toolId:"search", outputHash:"abc", summary:"returned result" },
    ]).valid).toBe(true);
  });

  it("rejects malformed or reversed events", () => {
    const result = assessAgentEvents([
      { id:"1", timestamp:"2026-10-06T00:00:02Z", type:"TOOL_INVOKED", agentId:"a", runId:"r", summary:"missing tool" },
      { id:"2", timestamp:"2026-10-06T00:00:01Z", type:"ACTION_COMPLETED", agentId:"a", runId:"r", summary:"missing output hash" },
    ]);
    expect(result.valid).toBe(false);
    expect(result.reasons.some(r => r.includes("tool identifier"))).toBe(true);
    expect(result.reasons.some(r => r.includes("output hash"))).toBe(true);
    expect(result.reasons.some(r => r.includes("earlier"))).toBe(true);
  });
});
