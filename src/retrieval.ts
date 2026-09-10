import type { RetrievedEvidence } from "./types.js";

function questionTokens(question: string): string[] {
  return Array.from(new Set(
    question.toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 2),
  ));
}

/**
 * Provider-neutral deterministic relevance ranking.
 * Applications can replace this with database/full-text/vector retrieval while
 * preserving the engine's evidence shape and validation boundary.
 */
export function rankEvidence(question: string, evidence: RetrievedEvidence[], limit = 20): RetrievedEvidence[] {
  const tokens = questionTokens(question);

  return evidence
    .map((item, index) => {
      const source = item.source;
      const haystack = `${item.label} ${item.content} ${source?.title ?? ""} ${source?.provenanceNote ?? ""}`.toLowerCase();
      const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
      return { item, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ item }) => item);
}
