import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { addDays,crops,forecast,generateMandi,history,MANDI_LABEL,MANDI_SEED,planMandi,validateMandiInput,type MandiInput } from '../lib/mandi';
import { mandiData,mandiManifest } from '../lib/mandi-data';
import { POST } from '../app/api/mandi/route';
const input=():MandiInput=>({crop:'tomato',marketId:'all',asOf:'2026-10-10',kg:1000,lifeDays:5,risk:'balanced',holdDays:3,historyDays:30,storageRate:.3,storageCapacityKg:5000,priceChangePercent:0,extraRainDays:0});
test('seeded artifact is byte-reproducible and isolated from original seed-42 benchmark',async()=>{
  const generated=JSON.stringify(generateMandi(),null,2)+'\n',bytes=await readFile('data/synthetic-mandi.json','utf8');assert.equal(bytes,generated);assert.equal(createHash('sha256').update(bytes).digest('hex'),mandiManifest.sha256);assert.equal(mandiData.rows.length,4380);assert.equal(mandiData.provenance.seed,MANDI_SEED);assert.equal(mandiData.provenance.label,MANDI_LABEL);assert.equal(mandiData.weather.length,365);assert.equal(mandiData.gluts.length,36);
  assert.notDeepEqual(generateMandi(MANDI_SEED+1).rows.slice(0,5),mandiData.rows.slice(0,5));
});
test('all price spreads and ₹/quintal conversions reconcile; four crops and three markets vary',()=>{
  for(const row of mandiData.rows){assert.ok(row.minPerQuintal<=row.modalPerQuintal&&row.modalPerQuintal<=row.maxPerQuintal);assert.equal(row.modalPerKg,row.modalPerQuintal/100);assert.equal(row.minPerKg,row.minPerQuintal/100);assert.equal(row.maxPerKg,row.maxPerQuintal/100);}
  assert.equal(new Set(crops.map(c=>history(mandiData,c,'scenario_muhana','2026-10-10',1)[0].modalPerKg)).size,4);
  assert.equal(new Set(mandiData.markets.map(m=>history(mandiData,'tomato',m.id,'2026-10-10',1)[0].modalPerKg)).size,3);
});
test('history/date boundaries and insufficient evidence fail closed',()=>{
  assert.equal(history(mandiData,'tomato','scenario_muhana','2026-01-01',90).length,1);assert.equal(history(mandiData,'tomato','scenario_muhana','2026-12-31',30).length,30);
  for(const date of ['2025-12-31','2027-01-01','2026-02-30'])assert.throws(()=>history(mandiData,'tomato','scenario_muhana',date));
  const changed=structuredClone(mandiData);changed.rows=changed.rows.filter(r=>!(r.crop==='tomato'&&r.marketId==='scenario_muhana'&&r.date==='2026-10-05'));assert.throws(()=>forecast(changed,'tomato','scenario_muhana','2026-10-10',3));
  assert.equal(forecast(mandiData,'tomato','scenario_muhana','2026-01-01',1).estimatePerKg,null);assert.throws(()=>forecast(mandiData,'tomato','scenario_muhana','2026-10-10',8));
});
test('forecasts and quotes never read future generated prices or weather; horizon and uplift are bounded',()=>{
  const future=structuredClone(mandiData);for(const r of future.rows)if(r.date>'2026-10-10'){r.modalPerQuintal=90000;r.modalPerKg=900;};for(const w of future.weather)if(w.date>'2026-10-10')w.tempC=60;
  assert.deepEqual(planMandi(future,input()),planMandi(mandiData,input()));
  for(const crop of crops)for(const m of mandiData.markets)for(const ahead of [0,1,7]){const f=forecast(mandiData,crop,m.id,'2026-10-10',ahead);assert.ok(f.estimatePerKg!>=f.bounds[0]-.005&&f.estimatePerKg!<=f.bounds[1]+.005);assert.equal(f.targetDate,addDays('2026-10-10',ahead));}
});
test('independent financial calculation, all action economics and kilograms conserve mass',()=>{
  const data=structuredClone(mandiData);for(const r of data.rows){r.minPerQuintal=1900;r.modalPerQuintal=2000;r.maxPerQuintal=2100;r.minPerKg=19;r.modalPerKg=20;r.maxPerKg=21;}
  data.markets=data.markets.map(m=>({...m,lat:26.95,lng:75.80}));data.weather.find(w=>w.date==='2026-10-10')!.tempC=25;data.weather.find(w=>w.date==='2026-10-10')!.rain=false;
  const result=planMandi(data,input()),sell=result.candidates.find(c=>c.marketId==='scenario_muhana'&&c.holdDays===0)!,store=result.candidates.find(c=>c.marketId==='scenario_muhana'&&c.holdDays===1)!;
  assert.equal(sell.net,19333.33);assert.equal(store.net,18033.33);assert.equal(store.storage,300);
  for(const c of result.candidates){assert.ok(Math.abs(c.saleableKg+c.spoiledKg-1000)<1e-8);assert.ok(Math.abs(c.net!-(c.gross!-c.transport-c.storage))<.011);}
});
test('crop, date, destinations, price shock, rain and storage capacity change actual calculations',()=>{
  const initial=planMandi(mandiData,input());assert.notEqual(planMandi(mandiData,{...input(),crop:'mango'}).best?.net,initial.best?.net);assert.notEqual(planMandi(mandiData,{...input(),asOf:'2026-07-01'}).best?.net,initial.best?.net);
  const selected=planMandi(mandiData,{...input(),marketId:'scenario_bassi'});assert.ok(selected.candidates.every(c=>c.marketId==='scenario_bassi'));
  const shock=planMandi(mandiData,{...input(),priceChangePercent:-10,extraRainDays:1,storageCapacityKg:0});assert.ok(shock.candidates.filter(c=>c.holdDays>0).every(c=>!c.eligible));assert.ok(shock.candidates.find(c=>c.id===initial.candidates[0].id)!.gross!<initial.candidates[0].gross!);
  for(const patch of [{kg:0},{holdDays:8},{historyDays:100},{priceChangePercent:50},{extraRainDays:.5},{marketId:'live_agmarknet'}])assert.throws(()=>validateMandiInput({...input(),...patch}));
});
test('server quote is authoritative and rejects cross-origin/oversize requests without providers',async()=>{
  const post=(body:unknown,origin?:string)=>POST(new Request('http://127.0.0.1:3010/api/mandi',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify(body)}));
  const r=await post(input());assert.equal(r.status,200);const response=await r.json();assert.equal(response.mode,'SYNTHETIC_MANDI');assert.equal(response.best.net,planMandi(mandiData,input()).best!.net);
  assert.equal((await post(input(),'https://elsewhere.example')).status,403);assert.equal((await post({text:'x'.repeat(18000)})).status,413);assert.equal((await post({...input(),official:true})).status,400);
});

test('unit validation tolerates decimal serialization noise but rejects wrong units/nonfinite values',()=>{const data=structuredClone(mandiData);const r=data.rows.find(r=>r.crop==='tomato'&&r.marketId==='scenario_muhana'&&r.date==='2026-10-10')!;r.modalPerKg+=1e-12;assert.equal(history(data,'tomato',r.marketId,r.date,1).length,1);r.modalPerKg+=.01;assert.throws(()=>history(data,'tomato',r.marketId,r.date,1));r.modalPerKg=NaN;assert.throws(()=>history(data,'tomato',r.marketId,r.date,1));});
