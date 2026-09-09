import type { Evidence, EvidenceLink, IntegrityFinding, IntegrityInput } from "./types";
function duplicateIds(ids:string[]){const seen=new Set<string>(), duplicates=new Set<string>(); for(const id of ids){if(seen.has(id))duplicates.add(id); seen.add(id);} return [...duplicates];}
function validEvidence(input:IntegrityInput):Evidence[]{const sourceIds=new Set(input.sources.map(s=>s.id)); return input.evidence.filter(e=>sourceIds.has(e.sourceId)&&e.exactText.trim().length>0);}
function linkedEvidence(evidence:Evidence[],links:EvidenceLink[],relationship:EvidenceLink["relationship"]){const byId=new Map(evidence.map(e=>[e.id,e])); return links.filter(l=>l.relationship===relationship).map(l=>byId.get(l.evidenceId)).filter((e):e is Evidence=>Boolean(e));}
/** Deterministic rule: source existence alone never promotes a claim to FACT. */
export function evaluateIntegrity(input:IntegrityInput):IntegrityFinding{
 const reasons:string[]=[],unknowns:string[]=[],missingEvidence:string[]=[],sources=input.sources??[],evidenceItems=input.evidence??[],links=input.evidenceLinks??[];
 if(!input.question?.trim())unknowns.push("The record does not contain a specific question.");
 if(!input.claim?.text?.trim())unknowns.push("The record does not contain a claim to evaluate.");
 if(sources.length===0)missingEvidence.push("No source has been identified.");
 const duplicateSourceIds=duplicateIds(sources.map(s=>s.id)),duplicateEvidenceIds=duplicateIds(evidenceItems.map(e=>e.id)),duplicateLinkIds=duplicateIds(links.map(l=>l.evidenceId));
 if(duplicateSourceIds.length)unknowns.push(`Duplicate source identifier(s): ${duplicateSourceIds.join(", ")}.`);
 if(duplicateEvidenceIds.length)unknowns.push(`Duplicate evidence identifier(s): ${duplicateEvidenceIds.join(", ")}.`);
 const sourceIds=new Set(sources.map(s=>s.id)),evidenceIds=new Set(evidenceItems.map(e=>e.id));
 const malformed=evidenceItems.filter(e=>!sourceIds.has(e.sourceId)||!e.exactText?.trim()); if(malformed.length)unknowns.push("One or more evidence items are missing a valid source anchor or preserved exact text.");
 const orphaned=links.filter(l=>!evidenceIds.has(l.evidenceId)); if(orphaned.length)unknowns.push("One or more evidence links point to evidence that is not present in the record.");
 if(duplicateLinkIds.length)unknowns.push(`Duplicate evidence link(s): ${duplicateLinkIds.join(", ")}.`);
 const evidence=validEvidence(input); if(!evidence.length)missingEvidence.push("No source-backed evidence with preserved exact text is available.");
 const supporting=linkedEvidence(evidence,links,"SUPPORTING"),contrary=linkedEvidence(evidence,links,"CONTRARY");
 if(supporting.length&&contrary.length)reasons.push("Supporting and contrary evidence are both present; the conflict must remain visible.");
 else if(supporting.length)reasons.push("At least one source-backed evidence item is explicitly linked as supporting the claim.");
 else if(contrary.length)reasons.push("Contrary evidence is present, but no supporting relationship has been established.");
 else if(evidence.length)reasons.push("Evidence exists, but no supporting relationship has been established.");
 const base={supportsClaim:supporting.length>0,supportingEvidenceIds:supporting.map(e=>e.id),contraryEvidenceIds:contrary.map(e=>e.id),missingEvidence,unknowns,reasons};
 if(unknowns.length)return {classification:"UNKNOWN",...base,supportsClaim:false};
 if(supporting.length&&contrary.length)return {classification:"CONTRADICTION",...base};
 if(supporting.length)return {classification:"FACT",...base};
 return {classification:"CLAIM",...base,supportsClaim:false};
}
