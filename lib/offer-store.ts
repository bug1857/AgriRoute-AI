import { createHash,randomUUID } from 'node:crypto';
import { OFFER_VERSION,parseOffer,validateConfirmedFields,type ConfirmedOffer,type OfferExtraction } from './offers';
type Draft={id:string;status:'pending'|'confirmed'|'rejected';extraction:OfferExtraction;expiresAt:string;confirmed:ConfirmedOffer|null};
// Shared across Next route bundles; ephemeral local reviews expire after 30 minutes.
const local=globalThis as typeof globalThis & {agriRouteOfferDrafts?:Map<string,Draft>};
const drafts=local.agriRouteOfferDrafts??=new Map<string,Draft>();
function draft(id:unknown){if(typeof id!=='string')throw new Error('Invalid draft ID');const d=drafts.get(id);if(!d||Date.parse(d.expiresAt)<=Date.now())throw new Error('Review expired or unknown; create a new draft');return d;}
export function createOfferDraft(message:unknown,manual=false){for(const [id,d] of drafts)if(Date.parse(d.expiresAt)<=Date.now())drafts.delete(id);if(drafts.size>=50)drafts.delete(drafts.keys().next().value!);const d:Draft={id:randomUUID(),status:'pending',extraction:parseOffer(message,manual),expiresAt:new Date(Date.now()+30*60000).toISOString(),confirmed:null};drafts.set(d.id,d);return structuredClone(d);}
export function confirmOffer(id:unknown,fields:unknown,acknowledged:unknown){
  if(acknowledged!==true)throw new Error('Explicit human review acknowledgement required');const d=draft(id);if(d.status==='rejected')throw new Error('Rejected drafts cannot enter the planner');const checked=validateConfirmedFields(fields);
  if(d.confirmed){if(JSON.stringify(d.confirmed.fields)!==JSON.stringify(checked))throw new Error('Confirmed draft is immutable; create a new review');return structuredClone(d.confirmed);}
  const extracted={crop:d.extraction.fields.crop?.value??null,pricePerKg:d.extraction.fields.price?.normalized??null,quantityKg:d.extraction.fields.quantity?.normalized??null,grade:d.extraction.fields.grade?.value??null,delivery:d.extraction.fields.delivery?.value??null,payment:d.extraction.fields.payment?.value??null};
  const corrections=Object.entries(checked).filter(([key,value])=>!(key in extracted)||extracted[key as keyof typeof extracted]!==value).map(([key,value])=>({field:key,extracted:extracted[key as keyof typeof extracted]??null,confirmed:value}));
  const warnings=[...d.extraction.warnings,'Human confirmation for planning, not a verified buyer commitment, booking or guaranteed income','Synthetic weather/routing/storage assumptions remain separate from these human-entered terms','Quantity is loaded lot weight; surviving-weight settlement assumes partial delivery is accepted, not a verified minimum purchase','Payment cash-flow and grade rejection are not priced by this prototype',...(checked.maxArrivalDays===null?['Delivery deadline unknown; conditional planning only']:[])];
  const raw={id:randomUUID(),draftId:d.id,version:OFFER_VERSION as typeof OFFER_VERSION,status:'HUMAN_CONFIRMED_FOR_PLANNING' as const,source:d.extraction.source,message:d.extraction.message,fields:checked,confirmedAt:new Date().toISOString(),corrections,evidence:d.extraction.fields,warnings};
  d.confirmed={...raw,sha256:createHash('sha256').update(JSON.stringify(raw)).digest('hex')};d.status='confirmed';return structuredClone(d.confirmed);
}
export function rejectOffer(id:unknown){const d=draft(id);d.status='rejected';return {id:d.id,status:d.status};}
export function confirmedOffer(id:unknown){if(typeof id!=='string')throw new Error('Invalid confirmed offer ID');const d=[...drafts.values()].find(d=>d.confirmed?.id===id);if(!d||d.status!=='confirmed'||Date.parse(d.expiresAt)<=Date.now())throw new Error('Offer is unconfirmed, rejected or expired');return structuredClone(d.confirmed!);}
