export type AgentEventType =
  | "AGENT_STARTED"
  | "TOOL_AUTHORIZED"
  | "TOOL_INVOKED"
  | "TOOL_RETURNED"
  | "DECISION_RECORDED"
  | "ACTION_REQUESTED"
  | "ACTION_COMPLETED"
  | "AGENT_COMPLETED";

export interface AgentEvent {
  id: string;
  timestamp: string;
  type: AgentEventType;
  agentId: string;
  runId: string;
  toolId?: string;
  authorizationRef?: string;
  inputHash?: string;
  outputHash?: string;
  evidenceIds?: string[];
  claimIds?: string[];
  receiptId?: string;
  summary: string;
  previousEventId?: string;
}

export interface AgentEventAssessment {
  valid: boolean;
  reasons: string[];
}

/**
 * Validates observable agent activity metadata. It intentionally does not
 * capture or require private chain-of-thought.
 */
export function assessAgentEvents(events: AgentEvent[]): AgentEventAssessment {
  const reasons: string[] = [];
  const ids = new Set<string>();
  let previousTimestamp: number | undefined;

  for (const event of events) {
    if (!event.id || !event.agentId || !event.runId || !event.type || !event.timestamp || !event.summary?.trim()) {
      reasons.push(`Agent event ${event.id || "<missing-id>"} is structurally incomplete.`);
    }
    if (ids.has(event.id)) reasons.push(`Duplicate agent event identifier: ${event.id}.`);
    ids.add(event.id);

    const timestamp = Date.parse(event.timestamp);
    if (Number.isNaN(timestamp)) reasons.push(`Agent event ${event.id} has an invalid timestamp.`);
    else if (previousTimestamp !== undefined && timestamp < previousTimestamp) {
      reasons.push(`Agent event ${event.id} is earlier than the preceding event.`);
    }
    previousTimestamp = timestamp;

    if ((event.type === "TOOL_INVOKED" || event.type === "TOOL_RETURNED") && !event.toolId) {
      reasons.push(`Agent event ${event.id} is a tool event without a tool identifier.`);
    }
    if (event.type === "ACTION_COMPLETED" && !event.outputHash) {
      reasons.push(`Agent event ${event.id} records a completed action without an output hash.`);
    }
  }

  return { valid: reasons.length === 0, reasons: [...new Set(reasons)] };
}
