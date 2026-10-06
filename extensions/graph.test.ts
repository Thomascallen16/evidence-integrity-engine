import { describe, expect, it } from "vitest";
import { buildEvidenceGraph, contradictionsForClaim, evidenceForClaim } from "./graph";

describe("evidence graph", () => {
  const input = {
    question:"q",
    claim:{id:"c",text:"claim"},
    sources:[{id:"s",title:"source"}],
    evidence:[{id:"e1",sourceId:"s",exactText:"supports"},{id:"e2",sourceId:"s",exactText:"contradicts"}],
    evidenceLinks:[{evidenceId:"e1",relationship:"SUPPORTING" as const},{evidenceId:"e2",relationship:"CONTRARY" as const}]
  };
  it("builds explicit evidence relationships",()=>{
    const graph=buildEvidenceGraph(input);
    expect(graph.edges).toEqual([
      {from:"s",to:"e1",relationship:"SOURCE_OF"},
      {from:"s",to:"e2",relationship:"SOURCE_OF"},
      {from:"e1",to:"c",relationship:"SUPPORTS"},
      {from:"e2",to:"c",relationship:"CONTRADICTS"},
    ]);
  });
  it("answers support and contradiction queries",()=>{
    expect(evidenceForClaim(input,"c").map(e=>e.id)).toEqual(["e1"]);
    expect(contradictionsForClaim(input,"c").map(e=>e.id)).toEqual(["e2"]);
  });
});
