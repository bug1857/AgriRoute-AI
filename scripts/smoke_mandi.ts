// HTTP checks only. Does not verify browser hydration or authorize any provider call.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {mandiData,mandiManifest} from '../lib/mandi-data';
import {planMandi,type MandiInput} from '../lib/mandi';
import type {ConfirmedFields,ConfirmedOffer} from '../lib/offers';
async function main(){
  const base='http://127.0.0.1:3010',input:MandiInput={crop:'tomato',marketId:'all',asOf:'2026-10-10',kg:1000,lifeDays:5,risk:'balanced',holdDays:3,historyDays:30,storageRate:.3,storageCapacityKg:5000,priceChangePercent:0,extraRainDays:0};
  const post=(path:string,body:unknown)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const html=await (await fetch(base+'/mandi')).text();assert.ok(html.includes('Synthetic Mandi Data — For Demonstration'));assert.ok(html.includes('href="/api/mandi?download=1"'));
  const meta=await (await fetch(base+'/api/mandi')).json();assert.equal(meta.provenance.sha256,mandiManifest.sha256);
  const download=await (await fetch(base+'/api/mandi?download=1')).text();assert.equal(createHash('sha256').update(download).digest('hex'),mandiManifest.sha256);assert.equal(download,await readFile('data/synthetic-mandi.json','utf8'));
  const normal=await post('/api/mandi',input);assert.equal(normal.status,200);const plan=await normal.json();assert.equal(plan.best.id,planMandi(mandiData,input).best!.id);assert.equal(plan.best.net,planMandi(mandiData,input).best!.net);assert.equal(plan.offerProvenance,null);
  const changedInput={...input,crop:'mango' as const,asOf:'2026-07-01',marketId:'scenario_bassi'},changed=await (await post('/api/mandi',changedInput)).json();assert.equal(changed.best?.id,planMandi(mandiData,changedInput).best?.id);assert.notEqual(changed.candidates[0].net,plan.candidates[0].net);assert.ok(changed.candidates.every((c:{marketId:string})=>c.marketId==='scenario_bassi'));
  assert.equal((await post('/api/mandi',{...input,asOf:'2027-01-01'})).status,400);assert.equal((await post('/api/mandi',{...input,confirmedOfferId:'fabricated'})).status,400);
  const offers=await (await fetch(base+'/api/offers')).json();assert.equal(offers.gemini,'LOCKED');
  const fields:ConfirmedFields={crop:'tomato',pricePerKg:35,quantityKg:500,grade:'A',delivery:'Chomu tomorrow',payment:'cash',marketId:'scenario_chomu',validFrom:'2026-10-10',validUntil:'2026-10-17',maxArrivalDays:1};
  const samples=['Tomato 500 kg ₹3500/quintal, grade A, delivery Chomu tomorrow, payment cash.','टमाटर ५०० किलो ₹३५००/क्विंटल, ग्रेड A, डिलीवरी चोमू कल, भुगतान नकद.','Tamatar 0.5 tonne Rs 35/kg, A grade, bhejna Chomu kal, payment cash.'];
  for(const message of samples){
    const extracted=await post('/api/offers',{action:'extract',message});assert.equal(extracted.status,200);const draft=await extracted.json();assert.equal(draft.extraction.source,'deterministic-parser');assert.equal(draft.extraction.fields.price.normalized,35);assert.equal(draft.extraction.fields.quantity.normalized,500);
    assert.equal((await post('/api/mandi',{...input,kg:500,marketId:'scenario_chomu',confirmedOfferId:draft.id})).status,400);
    const reviewed=await post('/api/offers',{action:'confirm',draftId:draft.id,fields,acknowledged:true});assert.equal(reviewed.status,200);const c:ConfirmedOffer=await reviewed.json();
    const planned=await post('/api/mandi',{...input,kg:500,marketId:fields.marketId,confirmedOfferId:c.id});assert.equal(planned.status,200,'Offer reviews must be shared across production route bundles');const result=await planned.json();assert.equal(result.best.net,planMandi(mandiData,{...input,kg:500,marketId:fields.marketId},c).best!.net);assert.equal(result.best.expectedPrice,35);assert.equal(result.offerProvenance.sha256,c.sha256);
    const rejected=await post('/api/offers',{action:'reject',draftId:draft.id});assert.equal(rejected.status,200);assert.equal((await post('/api/mandi',{...input,kg:500,marketId:fields.marketId,confirmedOfferId:c.id})).status,400);
  }
  const manual=await (await post('/api/offers',{action:'manual'})).json();assert.equal(manual.extraction.source,'manual-entry');const corrected=await post('/api/offers',{action:'confirm',draftId:manual.id,fields:{...fields,pricePerKg:36},acknowledged:true});assert.equal(corrected.status,200);const c=await corrected.json();assert.ok(c.corrections.some((r:{field:string})=>r.field==='pricePerKg'));await post('/api/offers',{action:'reject',draftId:manual.id});
  assert.equal((await post('/api/offers',{action:'gemini',message:samples[0]})).status,400);
  const live=await (await fetch(base+'/api/live')).json();assert.equal(live.mode,'LIVE_ASSISTED');assert.equal(live.mandiDeferred,true);assert.equal((await (await fetch(base+'/api/agent')).json()).ready,false);
  console.log(JSON.stringify({syntheticSample:plan.comparisons[0].latest,forecast:plan.comparisons[0].forecast.estimatePerKg,best:plan.best},null,2));
  console.log('PASS: production synthetic data/byte-exact export/hash, crop/date/destination recalculation, Hindi/English/Hinglish local extraction, confirmed-only cross-route planner use, manual correction, withdrawal, invalid IDs, Gemini lock and LIVE_ASSISTED isolation. No provider calls; browser interactions NOT VERIFIED.');
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
