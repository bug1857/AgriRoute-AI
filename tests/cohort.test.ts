import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GenerateContentResponse} from '@google/genai';
import {simulate,type PolicyContext} from '../lib/simulator';
import {world,geo} from '../lib/world';
import {captureMock,cohortReplay,verifyCohort,persistCohortRecord,readCohortRecords} from '../lib/evaluation-capture';
import {mkdtemp,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sealTrace,latestTrace} from '../lib/agent-store';
import type {StoredTrace} from '../lib/agent-types';
import {authorizedProvider} from '../lib/provider-authorization';
const key=Buffer.alloc(32,3);
function model(c:PolicyContext,fail=false){let n=0;return {source:'mocked-test' as const,name:'mocked-model',sdkVersion:'mocked-test',generate:async()=>{if(fail)throw Object.assign(new Error('secret'),{status:429});const r=new GenerateContentResponse();r.responseId='mocked-test';r.candidates=[{content:{role:'model',parts:++n===1?[
 {functionCall:{name:'get_price_forecast',args:{market:(c.plan.best??c.plan.baseline).market,days:2}}},
 {functionCall:{name:'get_weather',args:{region:c.lot.region}}},
 {functionCall:{name:'check_storage',args:{region:c.lot.region,kg:c.lot.kg}}},
 {functionCall:{name:'estimate_spoilage',args:{crop:c.lot.crop,days:0,temp:c.plan.weather.temp_c}}},
 {functionCall:{name:'transport_cost',args:{origin:c.lot.region,market:(c.plan.best??c.plan.baseline).market,kg:c.lot.kg}}}
 ]:[{text:JSON.stringify({candidateId:c.plan.best?.id??null})}]}}];return r;}};}
test('30 sequential mock captures replay reproducibly with actual reservations, evidence boundaries and conservation',async()=>{
 const records=new Map<number,StoredTrace>();let first:PolicyContext|undefined;
 for(let index=0;index<30;index++){const state=cohortReplay(records,key,null,true),c=state.next!;assert.ok(c);first??=c;assert.ok(c.evidence.weather.every(w=>w.day<=c.lot.harvest_day));assert.ok(Object.values(c.evidence.prices).every(p=>p.length===c.lot.harvest_day+1));const t=await captureMock(c,model(c));assert.equal(t.source,'mocked-test');assert.equal(t.tools.length,5);assert.equal(t.modelRequests.length,2);records.set(c.lot.lot_id,sealTrace(t,key));}
 const a=cohortReplay(records,key,null,true),b=cohortReplay(records,key,null,true);assert.equal(a.next,null);assert.equal(a.result.status,'COMPLETE');assert.equal(a.result.classification.gemini_success,27);assert.equal(a.result.classification.gemini_infeasible,3);assert.deepEqual(a,b);assert.ok(Math.abs(a.result.totals!.massErrorKg)<1e-6);assert.ok(a.result.name.includes('MOCKED'));
 assert.throws(()=>verifyCohort(records.get(first!.lot.lot_id)!,key,first!),/mismatch/,'Mocks cannot be replayed as real evidence');
 for(const s of world.storage)assert.ok(a.result.peakReservedKg[s.region]<=s.capacity_kg);
 const damaged=structuredClone(records.get(first!.lot.lot_id)!);damaged.trace.contextSha256='tampered';assert.throws(()=>verifyCohort(damaged,key,first!,true),/integrity/);
 const changed=structuredClone(first!);changed.reservations.push({region:changed.lot.region,kg:1,fromDay:changed.lot.harvest_day,untilDay:29});assert.throws(()=>verifyCohort(records.get(first!.lot.lot_id)!,key,changed,true),/context/);
});
test('missing evidence never invents cohort totals; quota failure stays fallback and cannot be success',async()=>{
 const state=cohortReplay(new Map(),key,null,true);assert.equal(state.result.totals,null);assert.equal(state.result.evaluatedLots,0);const c=state.next!,trace=await captureMock(c,model(c,true)),record=sealTrace(trace,key);const d=verifyCohort(record,key,c,true);assert.equal(d.kind,'fallback');assert.equal(d.modelFailed,true);assert.equal(trace.failure,'quota_exhausted');assert.ok(!JSON.stringify(trace).includes('secret'));const result=cohortReplay(new Map([[c.lot.lot_id,record]]),key,null,true).result;assert.equal(result.classification.fallback,1);assert.equal(result.classification.gemini_success,undefined);assert.equal(result.status,'INCOMPLETE');
});
test('durable records survive reload, prohibit overwrite, detect corruption and reject mocks in production',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'agriroute-cohort-'));try{const c=cohortReplay(new Map(),key,null,true).next!,record=sealTrace(await captureMock(c,model(c)),key);await assert.rejects(persistCohortRecord(record),/authentic/);await persistCohortRecord(record,dir,true);assert.equal((await stat(`${dir}/lot-${c.lot.lot_id}.json`)).mode&0o777,0o600);await assert.rejects(persistCohortRecord(record,dir,true),/EEXIST/);const loaded=await readCohortRecords(dir);assert.deepEqual(loaded.records.get(c.lot.lot_id),JSON.parse(JSON.stringify(record)));assert.equal(cohortReplay(loaded.records,key,null,true).result.classification.gemini_success,1);await writeFile(`${dir}/lot-${c.lot.lot_id}.json`,'broken');const broken=await readCohortRecords(dir);assert.deepEqual(broken.invalid,[c.lot.lot_id]);assert.deepEqual(cohortReplay(broken.records,key,null,true).mismatches,[c.lot.lot_id]);}finally{await rm(dir,{recursive:true,force:true});}
});
test('existing authentic trace remains verifiable; provider authorization absent means no calls',async()=>{
 const original=await latestTrace();assert.ok(original);assert.equal(original.trace.source,'google-genai');assert.equal(original.trace.tools.length,5);assert.equal(original.trace.status,'success');const state=cohortReplay(new Map(),key,original);assert.equal(state.result.status,'INCOMPLETE');await assert.rejects(authorizedProvider('cohort',state.next!.lot.lot_id),/LOCKED/);await assert.rejects(authorizedProvider('offer'),/LOCKED/);
 assert.equal(simulate(world,geo,{id:'C',name:'Missing',choose:()=>({kind:'missing_trace',candidateId:null})}).totals,null);
});
