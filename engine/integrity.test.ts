import { describe, expect, it } from "vitest";
import { evaluateIntegrity } from "./integrity";
const base={question:"Did the record support the claim?",claim:{id:"c1",text:"The record supports the claim."},sources:[{id:"s1",title:"Primary record",designation:"PRIMARY" as const}],evidence:[{id:"e1",sourceId:"s1",exactText:"Exact preserved source text."}]};
describe("evaluateIntegrity",()=>{
 it("never promotes a claim when only a source exists",()=>{const r=evaluateIntegrity({...base,evidence:[]});expect(r.classification).not.toBe("FACT");expect(r.missingEvidence.length).toBeGreaterThan(0);});
 it("requires a supporting relationship before FACT",()=>{const r=evaluateIntegrity(base);expect(r.classification).toBe("CLAIM");});
 it("classifies supporting source-backed evidence as FACT",()=>{const r=evaluateIntegrity({...base,evidenceLinks:[{evidenceId:"e1",relationship:"SUPPORTING"}]});expect(r.classification).toBe("FACT");});
 it("keeps contrary evidence visible",()=>{const r=evaluateIntegrity({...base,evidence:[...base.evidence,{id:"e2",sourceId:"s1",exactText:"Contrary preserved source text."}],evidenceLinks:[{evidenceId:"e1",relationship:"SUPPORTING"},{evidenceId:"e2",relationship:"CONTRARY"}]});expect(r.classification).toBe("CONTRADICTION");expect(r.contraryEvidenceIds).toEqual(["e2"]);});
 it("returns UNKNOWN when question or claim is missing",()=>{const r=evaluateIntegrity({...base,question:"",evidenceLinks:[{evidenceId:"e1",relationship:"SUPPORTING"}]});expect(r.classification).toBe("UNKNOWN");});
 it("rejects evidence pointing to unknown source",()=>{const r=evaluateIntegrity({...base,evidence:[{id:"e9",sourceId:"missing-source",exactText:"Unanchored text"}],evidenceLinks:[{evidenceId:"e9",relationship:"SUPPORTING"}]});expect(r.classification).toBe("UNKNOWN");});
 it("does not promote contrary-only evidence",()=>{const r=evaluateIntegrity({...base,evidenceLinks:[{evidenceId:"e1",relationship:"CONTRARY"}]});expect(r.classification).toBe("CLAIM");});
 it("rejects duplicate source identifiers",()=>{const r=evaluateIntegrity({...base,sources:[...base.sources,{id:"s1",title:"Another record"}],evidenceLinks:[{evidenceId:"e1",relationship:"SUPPORTING"}]});expect(r.classification).toBe("UNKNOWN");});
 it("rejects orphaned evidence links",()=>{const r=evaluateIntegrity({...base,evidenceLinks:[{evidenceId:"missing",relationship:"SUPPORTING"}]});expect(r.classification).toBe("UNKNOWN");});
});
