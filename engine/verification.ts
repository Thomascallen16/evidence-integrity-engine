import type { Evidence, VerificationRecord } from "./types";
export type VerificationState="VERIFIED"|"UNVERIFIED"|"REJECTED"|"NEEDS_REVIEW";
export interface VerificationAssessment{state:VerificationState;applicableRecordIds:string[];reasons:string[];}
/** Checks verification metadata structure; it does not itself verify truth. */
export function assessVerification(targetId:string,evidence:Evidence[],records:VerificationRecord[]):VerificationAssessment{
 const targetEvidence=evidence.some(e=>e.id===targetId), applicable=records.filter(r=>r.targetId===targetId);
 if(!targetEvidence)return {state:"NEEDS_REVIEW",applicableRecordIds:applicable.map(r=>r.id),reasons:["The verification target is not present in the supplied evidence record."]};
 if(!applicable.length)return {state:"UNVERIFIED",applicableRecordIds:[],reasons:["No explicit verification record has been supplied."]};
 const invalid=applicable.filter(r=>r.status==="VERIFIED"&&(!r.verifier||!r.verifiedAt||!r.method));
 if(invalid.length)return {state:"NEEDS_REVIEW",applicableRecordIds:applicable.map(r=>r.id),reasons:["A VERIFIED record is missing verifier, method, or verification timestamp."]};
 const latest=[...applicable].sort((a,b)=>a.verifiedAt.localeCompare(b.verifiedAt)).at(-1)!;
 return {state:latest.status,applicableRecordIds:applicable.map(r=>r.id),reasons:[latest.reason??`Verification state recorded as ${latest.status}.`]};
}
