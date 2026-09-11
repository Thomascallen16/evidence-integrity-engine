/* Browser build of the canonical Evidence Integrity Engine.
 * Source of truth: engine/integrity.ts
 * Generated-equivalent browser artifact for the static Proof Lab.
 */
(function(global){
  function duplicateIds(ids){const seen=new Set(),duplicates=new Set();for(const id of ids){if(seen.has(id))duplicates.add(id);seen.add(id)}return [...duplicates]}
  function linkedEvidence(evidence,links,relationship){const byId=new Map(evidence.map(e=>[e.id,e]));return links.filter(l=>l.relationship===relationship).map(l=>byId.get(l.evidenceId)).filter(Boolean)}
  function latestVerification(records,targetId){return records.filter(r=>r.targetId===targetId).sort((a,b)=>String(b.verifiedAt).localeCompare(String(a.verifiedAt)))[0]}
  function validateAudit(events,knownIds){const issues=[];const dup=duplicateIds(events.map(e=>e.id));if(dup.length)issues.push(`Duplicate audit event identifier(s): ${dup.join(", ")}.`);for(const e of events){if(!e.id||!e.timestamp||!e.entityType||!e.entityId||!e.action||!String(e.summary||'').trim())issues.push(`Audit event ${e.id||'(missing id)'} is structurally incomplete.`);if(!knownIds.has(e.entityId))issues.push(`Audit event ${e.id} references unknown entity ${e.entityId}.`)}for(let i=1;i<events.length;i++){if(String(events[i].timestamp)<String(events[i-1].timestamp)){issues.push('Audit events are not in chronological order.');break}}return issues}
  function evaluateIntegrity(input){
    const reasons=[],unknowns=[],missingEvidence=[],rejectedEvidenceIds=[],reviewEvidenceIds=[],auditIssues=[];
    const sources=input.sources??[], evidenceItems=input.evidence??[], links=input.evidenceLinks??[], verifications=input.verificationRecords??[], audits=input.auditEvents??[];
    if(!input.question?.trim())unknowns.push('The record does not contain a specific question.');
    if(!input.claim?.text?.trim())unknowns.push('The record does not contain a claim to evaluate.');
    if(!input.claim?.id?.trim())unknowns.push('The claim does not contain an identifier.');
    if(sources.length===0)missingEvidence.push('No source has been identified.');
    const ds=duplicateIds(sources.map(s=>s.id)),de=duplicateIds(evidenceItems.map(e=>e.id)),dl=duplicateIds(links.map(l=>l.evidenceId));
    if(ds.length)unknowns.push(`Duplicate source identifier(s): ${ds.join(', ')}.`);if(de.length)unknowns.push(`Duplicate evidence identifier(s): ${de.join(', ')}.`);if(dl.length)unknowns.push(`Duplicate evidence link(s): ${dl.join(', ')}.`);
    const sourceIds=new Set(sources.map(s=>s.id)),evidenceIds=new Set(evidenceItems.map(e=>e.id)),knownIds=new Set([input.claim.id,...sources.map(s=>s.id),...evidenceItems.map(e=>e.id)]);
    if(evidenceItems.some(e=>!e.id||!sourceIds.has(e.sourceId)||!e.exactText?.trim()))unknowns.push('One or more evidence items are missing a valid identifier, source anchor, or preserved exact text.');
    if(links.some(l=>!evidenceIds.has(l.evidenceId)))unknowns.push('One or more evidence links point to evidence that is not present in the record.');
    if(links.some(l=>l.relationship!=='SUPPORTING'&&l.relationship!=='CONTRARY'))unknowns.push('One or more evidence links contain an invalid relationship.');
    if(input.claim.sourceIds?.some(id=>!sourceIds.has(id)))unknowns.push('The claim references a source that is not present in the record.');
    if(input.claim.evidenceIds?.some(id=>!evidenceIds.has(id)))unknowns.push('The claim references evidence that is not present in the record.');
    const evidence=evidenceItems.filter(e=>sourceIds.has(e.sourceId)&&e.exactText?.trim());if(!evidence.length)missingEvidence.push('No source-backed evidence with preserved exact text is available.');
    for(const item of evidence){const v=latestVerification(verifications,item.id);if(v?.status==='REJECTED')rejectedEvidenceIds.push(item.id);if(v?.status==='NEEDS_REVIEW')reviewEvidenceIds.push(item.id)}
    const cv=latestVerification(verifications,input.claim.id);if(cv?.status==='REJECTED')unknowns.push('The claim itself has a latest verification status of REJECTED.');if(cv?.status==='NEEDS_REVIEW')unknowns.push('The claim itself is marked NEEDS_REVIEW.');
    auditIssues.push(...validateAudit(audits,knownIds));if(auditIssues.length)unknowns.push('The audit trail contains unresolved structural issues.');
    const supporting=linkedEvidence(evidence,links,'SUPPORTING'),contrary=linkedEvidence(evidence,links,'CONTRARY');
    const usableSupporting=supporting.filter(e=>!rejectedEvidenceIds.includes(e.id)&&!reviewEvidenceIds.includes(e.id));
    if(supporting.length&&contrary.length)reasons.push('Supporting and contrary evidence are both present; the conflict remains visible.');else if(supporting.length)reasons.push('At least one source-backed evidence item is explicitly linked as supporting the claim.');else if(contrary.length)reasons.push('Contrary evidence is present, but no supporting relationship has been established.');else if(evidence.length)reasons.push('Evidence exists, but no supporting relationship has been established.');
    if(rejectedEvidenceIds.length)reasons.push('Rejected evidence is excluded from support for the claim.');if(reviewEvidenceIds.length)reasons.push('Evidence marked NEEDS_REVIEW cannot promote the claim to FACT.');if(cv?.status==='VERIFIED')reasons.push('The claim has an explicit VERIFIED verification record.');
    const base={supportsClaim:usableSupporting.length>0,supportingEvidenceIds:supporting.map(e=>e.id),contraryEvidenceIds:contrary.map(e=>e.id),missingEvidence,unknowns,reasons,rejectedEvidenceIds,reviewEvidenceIds,auditIssues};
    if(unknowns.length)return {classification:'UNKNOWN',...base,supportsClaim:false};if(supporting.length&&contrary.length)return {classification:'CONTRADICTION',...base};if(usableSupporting.length)return {classification:'FACT',...base};return {classification:'CLAIM',...base,supportsClaim:false};
  }
  global.EvidenceIntegrityEngine={evaluateIntegrity};
})(window);
