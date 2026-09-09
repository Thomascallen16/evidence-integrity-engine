import type { AuditEvent } from "./types";
export interface AuditAssessment{valid:boolean;invalidEventIds:string[];reasons:string[];}
/** Validates audit-trail structure without asserting that events are truthful. */
export function assessAuditTrail(events:AuditEvent[]):AuditAssessment{
 const reasons:string[]=[],invalid:string[]=[],seen=new Set<string>(); let previous:string|undefined;
 for(const event of events){
  if(!event.id||!event.entityType||!event.entityId||!event.action||!event.timestamp){invalid.push(event.id||"<missing-id>");continue;}
  if(seen.has(event.id)){invalid.push(event.id);reasons.push(`Duplicate audit event identifier: ${event.id}.`);} seen.add(event.id);
  if(!event.summary?.trim()){invalid.push(event.id);reasons.push(`Audit event ${event.id} has no summary.`);}
  const ts=Date.parse(event.timestamp); if(Number.isNaN(ts)){invalid.push(event.id);reasons.push(`Audit event ${event.id} has an invalid timestamp.`);} else if(previous!==undefined&&ts<Date.parse(previous)){invalid.push(event.id);reasons.push(`Audit event ${event.id} is earlier than the preceding event.`);} previous=event.timestamp;
 }
 if(invalid.length&&!reasons.length)reasons.push("One or more audit events are structurally invalid.");
 return {valid:invalid.length===0,invalidEventIds:[...new Set(invalid)],reasons};
}
