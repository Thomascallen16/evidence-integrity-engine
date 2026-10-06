import type { IntegrityInput } from "../engine/types";

export interface EvidenceGraphNode {
  id: string;
  type: "QUESTION" | "CLAIM" | "SOURCE" | "EVIDENCE";
  label: string;
}

export interface EvidenceGraphEdge {
  from: string;
  to: string;
  relationship: "SOURCE_OF" | "SUPPORTS" | "CONTRADICTS";
}

export interface EvidenceGraph {
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
}

export function buildEvidenceGraph(input: IntegrityInput): EvidenceGraph {
  const nodes: EvidenceGraphNode[] = [
    { id: "question", type: "QUESTION", label: input.question },
    { id: input.claim.id, type: "CLAIM", label: input.claim.text },
    ...input.sources.map(s => ({ id:s.id, type:"SOURCE" as const, label:s.title })),
    ...input.evidence.map(e => ({ id:e.id, type:"EVIDENCE" as const, label:e.exactText })),
  ];
  const edges: EvidenceGraphEdge[] = [
    ...input.evidence.map(e => ({ from:e.sourceId, to:e.id, relationship:"SOURCE_OF" as const })),
    ...(input.evidenceLinks ?? []).map(l => ({
      from:l.evidenceId,
      to:input.claim.id,
      relationship:l.relationship === "SUPPORTING" ? "SUPPORTS" as const : "CONTRADICTS" as const,
    })),
  ];
  return { nodes, edges };
}

export function evidenceForClaim(input: IntegrityInput, claimId: string) {
  const evidenceIds = new Set((input.evidenceLinks ?? []).filter(l => l.relationship === "SUPPORTING").map(l => l.evidenceId));
  return input.evidence.filter(e => evidenceIds.has(e.id) && (claimId === input.claim.id));
}

export function contradictionsForClaim(input: IntegrityInput, claimId: string) {
  const evidenceIds = new Set((input.evidenceLinks ?? []).filter(l => l.relationship === "CONTRARY").map(l => l.evidenceId));
  return input.evidence.filter(e => evidenceIds.has(e.id) && claimId === input.claim.id);
}
