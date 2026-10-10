import { test } from "node:test";
import assert from "node:assert/strict";
import { world,geo,type World,type Geography } from "../lib/world";
import { baselinePolicy,plannerPolicy,simulate,type Policy } from "../lib/simulator";
import { latestTrace } from "../lib/agent-store";
import { prepareReplayPolicy,replayDecision } from "../lib/simulation-replay";
import { defaultScenario,planLot } from "../lib/planner";

function fixture(count=1){
  const w:World=structuredClone(world);
  w.lots=Array.from({length:count},(_,lot_id)=>({...w.lots[0],lot_id,kg:1000,harvest_day:0,shelf_life_days:5}));
  for(const r of w.weather){r.temp_c=25;r.rain=false;}
  for(const p of Object.values(w.prices))p.fill(20);
  for(const s of w.storage){s.capacity_kg=1000;s.cost_per_kg_day=.3;}
  const g:Geography={...geo,markets:[{id:"market_0",name:"Market A",lat:0,lng:0}],lots:w.lots.map(l=>({lot_id:l.lot_id,lat:0,lng:0}))};
  return {w,g};
}
const store=(days:number):Policy=>({id:"B",name:"Test fixed hold",choose:({plan})=>({kind:"deterministic",candidateId:plan.candidates.find(c=>c.storeDays===days&&c.eligible)?.id??plan.best?.id??null})});
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test("independent hand calculation: immediate four-hour sale settles once and conserves kilograms",()=>{
  const {w,g}=fixture();const r=simulate(w,g,baselinePolicy),lot=r.lots[0].realized!;
  close(lot.soldKg,1000*(1-1/30));close(lot.spoiledKg,1000/30);
  assert.equal(lot.gross,19333.33);assert.equal(lot.net,19333.33);assert.equal(lot.unsoldKg,0);
  assert.equal(lot.settlementDay,0);assert.equal(r.ledger.filter(e=>e.type==="settlement").length,1);
  close(r.ledger.filter(e=>e.type==="spoilage").reduce((n,e)=>n+e.kg!,0),lot.spoiledKg);
});
test("future prices and weather change settlement, never the earlier decision or quote",()=>{
  const {w,g}=fixture();w.weather.find(r=>r.region===w.lots[0].region&&r.day===0)!.rain=true;
  const changed=structuredClone(w);changed.prices.market_0.fill(30,1);
  for(const r of changed.weather.filter(r=>r.day>=1))r.temp_c=30;
  let observed=false;
  const inspect:Policy={...plannerPolicy,choose:ctx=>{assert.equal(ctx.evidence.prices.market_0.length,1);assert.ok(ctx.evidence.weather.every(r=>r.day===0));observed=true;return plannerPolicy.choose(ctx);}};
  const original=simulate(w,g,inspect),after=simulate(changed,g,inspect);
  assert.ok(observed);assert.deepEqual(original.lots[0].predicted,after.lots[0].predicted);
  assert.deepEqual(original.lots[0].decision,after.lots[0].decision);
  assert.equal(after.lots[0].realized!.settlementPrice,30);assert.equal(after.lots[0].realized!.settlementDay,1);
  close(after.lots[0].realized!.spoiledKg,1000*(1/5+(1/6)/2.5));
  assert.notEqual(original.lots[0].realized!.gross,after.lots[0].realized!.gross);
});
test("same-day fixed ordering prevents overlapping storage overbooking",()=>{
  const {w,g}=fixture(2);w.lots.reverse();const r=simulate(w,g,store(1));
  assert.equal(r.lots[0].predicted!.storeDays,1);assert.equal(r.lots[1].predicted!.storeDays,0);
  assert.equal(r.peakReservedKg[w.lots[0].region],1000);
  assert.equal(r.reservations.length,1);assert.equal(r.lots[0].realized!.storage,300);
  close(r.lots[0].realized!.soldKg,1000*(1-.25/5-(1/6)/5));
});
test("capacity releases at departure before a harvest at the identical instant",()=>{
  const {w,g}=fixture(2);w.lots[1].harvest_day=1;const r=simulate(w,g,store(1));
  assert.equal(r.reservations.length,2);assert.equal(r.peakReservedKg[w.lots[0].region],1000);
  assert.deepEqual(r.reservations.map(l=>[l.fromDay,l.untilDay]),[[0,1],[1,2]]);
});
test("observed heat can expire a stored lot: no resurrection, transport or double counting",()=>{
  const {w,g}=fixture();w.lots[0].shelf_life_days=2.5;
  for(const r of w.weather.filter(r=>r.day>=1&&r.day<=3))r.temp_c=40;
  const r=simulate(w,g,store(5)),lot=r.lots[0].realized!;
  assert.equal(r.lots[0].predicted!.storeDays,5);assert.equal(lot.status,"spoiled");
  close(r.reservations[0].untilDay,2.8);assert.equal(lot.storage,840);
  assert.equal(lot.spoiledKg,1000);assert.equal(lot.soldKg,0);assert.equal(lot.unsoldKg,0);
  assert.equal(lot.transport,0);assert.equal(lot.net,-840);assert.equal(lot.actualDispatchDay,null);
  assert.equal(r.ledger.filter(e=>e.type==="expiry").length,1);assert.equal(r.ledger.filter(e=>e.type==="settlement").length,0);
  close(r.ledger.filter(e=>e.type==="spoilage").reduce((n,e)=>n+e.kg!,0),1000);
});
test("unexpected dispatch rain beyond horizon retains living inventory without fabricated proceeds",()=>{
  const {w,g}=fixture();w.lots[0].shelf_life_days=200;w.lots[0].harvest_day=28;
  w.weather.find(r=>r.region===w.lots[0].region&&r.day===29)!.rain=true;
  const r=simulate(w,g,store(1)),lot=r.lots[0].realized!;
  assert.ok(lot.arrivalDay!>=30);assert.equal(lot.status,"unsold");assert.equal(lot.gross,0);
  assert.equal(lot.settlementDay,null);assert.equal(lot.storage,300);assert.equal(lot.net,-300);
  close(lot.unsoldKg+lot.spoiledKg,1000);assert.ok(lot.unsoldKg>0);
});
test("infeasible and invalid candidates remain failures; missing Gemini results stay unmeasured",()=>{
  const {w,g}=fixture();w.lots[0].shelf_life_days=.01;
  const r=simulate(w,g,plannerPolicy);assert.equal(r.classification.infeasible,1);assert.equal(r.lots[0].realized!.spoiledKg,1000);
  const invalid=simulate(w,g,{id:"B",name:"Invalid",choose:()=>({kind:"deterministic",candidateId:"invented"})});
  assert.equal(invalid.classification.infeasible,1);assert.equal(invalid.lots[0].predicted,null);
  const c=simulate(w,g,{id:"C",name:"Missing",choose:()=>({kind:"missing_trace",candidateId:null})});
  assert.equal(c.status,"INCOMPLETE");assert.equal(c.totals,null);assert.equal(c.evaluatedLots,0);assert.equal(c.unevaluatedKg,1000);assert.equal(c.lots[0].realized,null);
});
test("fallback and model failures are distinct from successful Gemini decisions",()=>{
  const {w,g}=fixture();const r=simulate(w,g,{id:"C",name:"Recorded failure",choose:({plan})=>({kind:"fallback",modelFailed:true,candidateId:plan.best!.id,reason:"Recorded timeout"})});
  assert.equal(r.classification.fallback,1);assert.equal(r.classification.model_failed,1);
  assert.equal(r.classification.gemini_success,undefined);
});
test("all frozen 30 lots reproduce across independent worlds with mass, money and capacity invariants",()=>{
  const before=JSON.stringify({world,geo});
  for(const policy of [baselinePolicy,plannerPolicy]){
    const r=simulate(world,geo,policy);assert.deepEqual(r,simulate(world,geo,policy));assert.equal(r.status,"COMPLETE");assert.equal(r.evaluatedLots,30);assert.equal(r.totals!.initialKg,97509);
    close(r.totals!.soldKg+r.totals!.spoiledKg+r.totals!.unsoldKg,97509);
    assert.equal(Math.round((r.totals!.gross-r.totals!.transport-r.totals!.storage)*100),Math.round(r.totals!.net*100));
    for(const s of world.storage)assert.ok(r.peakReservedKg[s.region]<=s.capacity_kg);
    for(const row of r.lots){close(row.initialKg,row.realized!.soldKg+row.realized!.spoiledKg+row.realized!.unsoldKg);assert.ok(r.ledger.filter(e=>e.type==="settlement"&&e.lotId===row.lotId).length<=1);}
    if(policy.id==="A")for(const row of r.lots)assert.equal(row.predicted!.storeDays,0);
  }
  assert.equal(JSON.stringify({world,geo}),before);
});
test("malformed worlds fail closed before simulation",()=>{
  const {w,g}=fixture();w.lots.push({...w.lots[0]});assert.throws(()=>simulate(w,g,baselinePolicy),/duplicate/);
  w.lots.pop();w.prices.market_0[10]=NaN;assert.throws(()=>simulate(w,g,baselinePolicy),/prices/);
  w.prices.market_0[10]=20;w.weather.push({...w.weather[0]});assert.throws(()=>simulate(w,g,baselinePolicy),/duplicate weather/);
});
test("authentic local replay is exact-match only and performs no inference",async t=>{
  const network=t.mock.method(globalThis,"fetch",async()=>{throw new Error("Replay must not make network calls");});
  const record=await latestTrace();if(!record){t.skip("No local authentic trace; integration replay gate requires Checkpoint 2 evidence");return;}
  const replay=await prepareReplayPolicy(),result=simulate(world,geo,replay.policy);
  assert.equal(replay.evidence.inferenceCallsThisEvaluation,0);assert.equal(result.status,"INCOMPLETE");assert.equal(result.evaluatedLots,1);assert.equal(result.classification.gemini_success,1);assert.equal(result.classification.missing_trace,29);assert.equal(result.totals,null);
  const lot=world.lots.find(l=>l.lot_id===record.trace.input.lotId)!;
  const context={lot,evidence:world,geography:geo,plan:planLot(world,geo,lot,"balanced"),reservations:[],risk:"balanced" as const};
  assert.equal(replayDecision(record,context).kind,"gemini_success");
  assert.equal(replayDecision(record,{...context,risk:"conservative"}).kind,"trace_mismatch");
  const leases=[{region:lot.region,kg:1,fromDay:lot.harvest_day,untilDay:lot.harvest_day+1}];
  assert.equal(replayDecision(record,{...context,reservations:leases}).kind,"trace_mismatch");
  assert.equal(replayDecision({...record,trace:{...record.trace,input:{...record.trace.input,scenario:{...defaultScenario,additionalRainDays:1}}}},context).kind,"trace_mismatch");
  assert.equal(network.mock.callCount(),0);
});
