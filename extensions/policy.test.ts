import { describe, expect, it } from "vitest";
import { assessPolicy, generalEvidenceProfile, highAssuranceAgentProfile } from "./policy";

describe("policy profiles", () => {
  const input = {
    question:"q",
    claim:{id:"c",text:"claim"},
    sources:[{id:"s",title:"source",locator:"page:1"}],
    evidence:[{id:"e",sourceId:"s",exactText:"text"}],
    evidenceLinks:[{evidenceId:"e" as const,relationship:"SUPPORTING" as const}],
    verificationRecords:[{id:"v",targetId:"e",status:"VERIFIED" as const,verifier:"v",method:"m",verifiedAt:"2026-10-06T00:00:00Z"}]
  };
  it("passes baseline requirements",()=>expect(assessPolicy(input,generalEvidenceProfile).valid).toBe(true));
  it("adds requirements without weakening the core",()=>expect(assessPolicy(input,highAssuranceAgentProfile).valid).toBe(false));
});
