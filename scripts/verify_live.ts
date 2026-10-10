import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import { calculateLive,type LiveInput,type LiveEvidence,type LiveResult } from '../lib/live';
import { assumptions } from '../lib/planner';

// One free-provider refresh; verification inputs are assumptions, never a real lot or quote.
async function main(){
  const base='http://127.0.0.1:3010',claim=await readFile('private/checkpoint-2-live-run.claim');
  const setup=await (await fetch(`${base}/api/live`)).json();assert.equal(setup.mandiDeferred,true);
  const now=Date.now(),iso=(ms:number)=>new Date(ms).toISOString();
  const q={source:'CP4 verification planning assumption, not an operational quote',reviewed:true,status:'unknown' as const,quotedAt:iso(now),expiresAt:iso(now+5*86400000)};
  const input:LiveInput={origin:setup.locations.origin,markets:setup.locations.markets.map((m:LiveInput['markets'][number])=>({id:m.id,point:m.point})),coordinatesReviewed:false,inputsReviewed:false,kg:1000,variety:'Local',lifeDays:5,risk:'balanced',departAt:iso(Math.ceil(now/3600000)*3600000),holdDays:1,handlingHours:4,marketFeePercent:1,otherDeductions:0,carrier:{...q,rate:assumptions.transportRate,capacityKg:null,availableAt:null},storage:{...q,rate:.3,capacityKg:null,maxDays:null,tempC:5},prices:[{...q,marketId:'muhana',perKg:35,basis:'manual_estimate'},{...q,marketId:'chomu',perKg:40,basis:'manual_estimate'}]};
  async function post(action:string,i:LiveInput,evidenceId?:string){const r=await fetch(`${base}/api/live`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,input:i,evidenceId}),signal:AbortSignal.timeout(45000)});assert.equal(r.status,200);return await r.json() as {evidenceId:string;evidence:LiveEvidence;result:LiveResult};}
  const bundle=await post('refresh',input);assert.equal(bundle.evidence.prices.status,'UNAVAILABLE');assert.match(bundle.evidence.prices.error!,/deferred/);
  assert.deepEqual(bundle.result,calculateLive(input,bundle.evidence,Date.parse(bundle.result.calculatedAt)));
  for(const c of bundle.result.candidates){assert.notEqual(c.status,'REVIEWED_FEASIBLE');if(c.net!==null){assert.ok(Math.abs(c.saleableKg!+c.spoiledKg!-input.kg)<1e-8);assert.ok(Math.abs(c.net-(c.gross!-c.transport!-c.storage!-c.marketFees!-c.otherDeductions))<.011);}}
  const changed=structuredClone(input);changed.prices.forEach(p=>p.perKg=p.perKg!*.9);const recalculated=await post('calculate',changed,bundle.evidenceId);
  assert.deepEqual(recalculated.evidence,bundle.evidence);assert.deepEqual(recalculated.result,calculateLive(changed,bundle.evidence,Date.parse(recalculated.result.calculatedAt)));
  for(const c of recalculated.result.candidates){const old=bundle.result.candidates.find(x=>x.id===c.id)!;if(old.gross!==null)assert.ok(c.gross!<old.gross);}
  const altered={...input,origin:{...input.origin,lat:input.origin.lat+.001}};const mismatch=await fetch(`${base}/api/live`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'calculate',input:altered,evidenceId:bundle.evidenceId})});assert.equal(mismatch.status,400);
  const artifact=JSON.stringify({label:'Authentic free weather/road responses plus declared verification inputs; not a real farmer lot, buyer offer, booking or impact measurement',bundle,recalculated},null,2)+'\n';
  for(const name of ['OGD_API_KEY','GEMINI_API_KEY'])if(process.env[name])assert.equal(artifact.includes(process.env[name]!),false,'Credential must never enter evidence');
  await writeFile('private/checkpoint-4-live-example.json',artifact,{mode:0o600});assert.deepEqual(await readFile('private/checkpoint-2-live-run.claim'),claim);
  console.log(JSON.stringify({artifactSha256:createHash('sha256').update(artifact).digest('hex'),calculatedAt:bundle.result.calculatedAt,prices:bundle.evidence.prices.status,weather:{status:bundle.evidence.weather.status,retrievedAt:bundle.evidence.weather.retrievedAt,hours:bundle.evidence.weather.data?.hours.length,error:bundle.evidence.weather.error},roads:Object.entries(bundle.evidence.routes).map(([id,e])=>({id,status:e.status,retrievedAt:e.retrievedAt,km:e.data?.distanceKm,etaHours:e.data?.etaHours,error:e.error})),candidates:bundle.result.candidates.map(c=>({id:c.id,status:c.status,net:c.net,spoiledKg:c.spoiledKg})),serverRecalculation:'PASS',geminiCalls:0},null,2));
}
void main().catch(e=>{console.error(e instanceof Error?e.message:'Verification failed');process.exitCode=1;});
