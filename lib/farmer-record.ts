import type {FarmerRecord} from '@/components/FarmerDecision';
import type {MandiCandidate,MandiInput} from './mandi';
// Projection deliberately excludes buyer messages, audit records and private account identifiers.
export function farmerRecord(d:{id:string;status:string;sha256:string;reviewed_at:string;snapshot:{lotName:string;plan:{input:MandiInput;assumptions:Record<string,string>};selected:MandiCandidate;offer:{warnings:string[]}|null}}):FarmerRecord{return {id:d.id,status:d.status,sha256:d.sha256,reviewed_at:new Date(d.reviewed_at).toISOString(),lotName:d.snapshot.lotName,input:d.snapshot.plan.input,selected:d.snapshot.selected,assumptions:d.snapshot.plan.assumptions,warnings:d.snapshot.offer?.warnings??[]};}
