import { test } from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import fixtureText from '../data/world-source';
import { world, geo } from "../lib/world";
import { checkStorage, defaultScenario, estimateSpoilage, getPriceForecast, planLot, riskEligibility, shelfLeft, transportCost, type Risk } from "../lib/planner";

test("48h / 24h / 0h risk boundaries enforce eligibility, including just below thresholds", () => {
  for (const [risk, margin] of [["conservative",48],["balanced",24]] as const) {
    assert.equal(riskEligibility(margin, risk).eligible, true);
    assert.equal(riskEligibility(margin-.00001, risk).eligible, false);
  }
  assert.equal(riskEligibility(.001,"adventurous").eligible, true);
  assert.equal(riskEligibility(0,"adventurous").eligible, false);
  assert.equal(riskEligibility(100,"adventurous",["Storage unavailable"]).eligible,false);
});
test("original heat rule and biological loss conserve weight", () => {
  assert.equal(shelfLeft(5,25),5);
  assert.equal(shelfLeft(5,30),2.5);
  assert.equal(shelfLeft(5,60),1);
  assert.deepEqual(estimateSpoilage(5,1,0,25), { fractionLost:.2, remainingHours:96 });
  assert.equal(estimateSpoilage(5,0,4,25).fractionLost,.2);
  assert.equal(estimateSpoilage(5,20,0,25).fractionLost,1);
});
test("transport uses dimensioned rupees/kg/km and rainy journeys add a day", () => {
  assert.equal(transportCost(100,1000,false).cost,3500);
  assert.equal(transportCost(100,1000,true).hours - transportCost(100,1000,false).hours,24);
  assert.equal(transportCost(100,1000,false,2).hours - transportCost(100,1000,false).hours,48);
});
test("capacity accounts for simultaneous reservations but not non-overlapping ones", () => {
  const a = {region:"North",kg:6000,fromDay:0,untilDay:2};
  assert.equal(checkStorage(world,"North",3000,1,3,[a]).feasible,false);
  assert.equal(checkStorage(world,"North",3000,2,3,[a]).feasible,true);
  const b = {region:"North",kg:6000,fromDay:2,untilDay:4};
  assert.equal(checkStorage(world,"North",2000,0,4,[a,b]).feasible,true);
});
test("forecasts cannot see future prices", () => {
  const changed = structuredClone(world);
  for (const prices of Object.values(changed.prices)) prices.fill(99999,5);
  assert.equal(getPriceForecast(world,"market_0",4,10),getPriceForecast(changed,"market_0",4,10));
  assert.equal(getPriceForecast(world,"market_0",0,10),world.prices.market_0[0]);
});
test("all 30 lots conserve kilograms and reconcile net amounts; nearest baseline is immediate dispatch", () => {
  for (const lot of world.lots) {
    const p = planLot(world,geo,lot,"balanced");
    assert.equal(p.baseline.action,"sell_now");
    assert.equal(p.baseline.storeDays,0);
    for (const c of p.candidates) {
      assert.ok(Math.abs(c.saleableKg+c.spoiledKg-lot.kg)<1e-8);
      assert.ok(Math.abs(c.net-(c.gross-c.transport-c.storage))<.011);
      if (c.eligible) { assert.ok(c.remainingHours>=24-1e-9); assert.ok(c.arrivalDay<30); assert.equal(c.hardReasons.length,0); }
    }
    const eligible = p.candidates.filter(c=>c.eligible);
    assert.equal(p.best?.net ?? null,eligible.length ? Math.max(...eligible.map(c=>c.net)) : null);
  }
});
test("higher appetite expands eligibility without changing quoted money or hard constraints", () => {
  for (const lot of world.lots) {
    const conservative=planLot(world,geo,lot,"conservative");
    const balanced=planLot(world,geo,lot,"balanced");
    const adventurous=planLot(world,geo,lot,"adventurous");
    const balancedIds = new Set(balanced.candidates.filter(c=>c.eligible).map(c=>c.id));
    const adventurousIds = new Set(adventurous.candidates.filter(c=>c.eligible).map(c=>c.id));
    for (const c of conservative.candidates.filter(c=>c.eligible)) assert.ok(balancedIds.has(c.id));
    for (const c of balanced.candidates.filter(c=>c.eligible)) assert.ok(adventurousIds.has(c.id));
    assert.deepEqual(conservative.candidates.map(c=>c.net),adventurous.candidates.map(c=>c.net));
  }
});
test("price, storage-cost and delay shocks change calculations rather than cached decisions", () => {
  const lot=world.lots.find(l=>l.crop==="onion")!;
  const before=planLot(world,geo,lot,"balanced");
  const after=planLot(world,geo,lot,"balanced",{...defaultScenario,priceChangePercent:-10,additionalRainDays:2,storageCostMultiplier:2});
  assert.ok(after.baseline.gross<before.baseline.gross);
  assert.ok(after.baseline.remainingHours<before.baseline.remainingHours);
  const storedBefore=before.candidates.find(c=>c.storeDays===1)!;
  const storedAfter=after.candidates.find(c=>c.id===storedBefore.id)!;
  assert.equal(storedAfter.storage,storedBefore.storage*2);
});
test("invalid inputs fail rather than becoming recommendations", () => {
  assert.throws(()=>planLot(world,geo,{...world.lots[0],kg:NaN},"balanced"));
  assert.throws(()=>planLot(world,geo,world.lots[0],"balanced",{...defaultScenario,priceChangePercent:-101}));
  assert.throws(()=>getPriceForecast(world,"unknown",0,1));
  assert.throws(()=>shelfLeft(5,NaN));
  assert.throws(()=>riskEligibility(100,"toString" as Risk));
});
test("exact fixture dimensions and independently observed seed-42 totals", () => {
  assert.equal(fixtureText,readFileSync('data/world.json','utf8'));
  assert.equal(createHash('sha256').update(fixtureText).digest('hex'),'a6df67a925f9e4de968c9baa455bcad67baa47e46b1fffca210c7d6c07961659');
  assert.deepEqual(world,JSON.parse(fixtureText));
  assert.equal(world.lots.length,30); assert.equal(world.lots.reduce((s,l)=>s+l.kg,0),97509);
  assert.equal(Object.keys(world.prices).length,5); assert.equal(world.weather.length,480);
  for(const series of Object.values(world.prices)) assert.equal(series.length,120);
});
test("independently hand-calculated zero-distance sale and one-day storage quotes", () => {
  const w = structuredClone(world);
  const lot={...w.lots[0],kg:1000,harvest_day:0,shelf_life_days:5};
  w.weather.find(r=>r.region===lot.region&&r.day===0)!.temp_c=25;
  w.weather.find(r=>r.region===lot.region&&r.day===0)!.rain=false;
  w.prices.market_0.fill(20);
  w.storage.find(s=>s.region===lot.region)!.cost_per_kg_day=.3;
  const g={...geo,markets:[{id:"market_0",name:"Market A",lat:0,lng:0}],lots:[{lot_id:lot.lot_id,lat:0,lng:0}]};
  const p=planLot(w,g,lot,"balanced");
  const sell=p.candidates.find(c=>c.storeDays===0)!;
  const store=p.candidates.find(c=>c.storeDays===1)!;
  assert.equal(sell.transport,0);assert.equal(sell.storage,0);
  assert.equal(sell.gross,19333.33);assert.equal(sell.net,19333.33);
  assert.ok(Math.abs(sell.remainingHours-116)<1e-9);
  assert.equal(store.storage,300);assert.equal(store.gross,18333.33);assert.equal(store.net,18033.33);
  assert.ok(Math.abs(store.remainingHours-110)<1e-9);
});
test("late arrival cannot be legalized by Adventurous risk", () => {
  const w=structuredClone(world);
  const lot={...w.lots[0],harvest_day:29,shelf_life_days:40};
  w.weather.find(r=>r.region===lot.region&&r.day===29)!.rain=true;
  const p=planLot(w,geo,lot,"adventurous");
  assert.equal(p.best,null);
  assert.ok(p.candidates.every(c=>!c.eligible&&c.hardReasons.includes("Arrives after the 30-day simulation ends")));
});
test("an exhausted world returns no plan, preserving explicit failure instead of unsafe output", () => {
  const w=structuredClone(world);
  const lot={...w.lots[0],shelf_life_days:1};
  const row=w.weather.find(r=>r.region===lot.region&&r.day===lot.harvest_day)!;
  row.temp_c=40;row.rain=true;
  for(const risk of ["conservative","balanced","adventurous"] as const) assert.equal(planLot(w,geo,lot,risk).best,null);
});
test("insufficient shared storage excludes every STORE option under all risk settings", () => {
  const lot=world.lots.find(l=>l.crop==="potato")!;
  const reservation={region:lot.region,kg:10000,fromDay:0,untilDay:30};
  for(const risk of ["conservative","balanced","adventurous"] as const){
    const p=planLot(world,geo,lot,risk,defaultScenario,[reservation]);
    assert.ok(p.candidates.filter(c=>c.action==="store").every(c=>!c.eligible&&c.hardReasons.some(r=>r.startsWith("Storage needs"))));
  }
});
