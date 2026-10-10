import {test} from 'node:test';
import assert from 'node:assert/strict';
import {benchmarkReservations,analyzeWhatIf} from '../lib/whatif';
import {world,geo} from '../lib/world';
import {defaultScenario,planLot} from '../lib/planner';
import {POST} from '../app/api/whatif/route';
import {simulate,plannerPolicy} from '../lib/simulator';
test('shared snapshot is exactly the observed Policy B lease state, without reoptimizing prior lots',async()=>{
 let checked=0;simulate(world,geo,{...plannerPolicy,choose:c=>{if(c.reservations.length&&checked++===0)assert.deepEqual(benchmarkReservations(c.lot.lot_id),c.reservations);return plannerPolicy.choose(c);}});assert.ok(checked>0);
 const r=await POST(new Request('http://localhost:3010/api/whatif',{method:'POST',headers:{Host:'127.0.0.1:3010',Origin:'http://127.0.0.1:3010','Content-Type':'application/json'},body:JSON.stringify({input:{lotId:0,risk:'balanced',scenario:defaultScenario},reservations:[],capacityMode:'policyB'})}));assert.equal(r.status,200);assert.match((await r.json()).scope,/Frozen Policy B/);
});
test('actual engine sensitivity matches changed financial values, tie ordering and reported transition brackets',()=>{
 for(const lot of [world.lots[0],world.lots[5],world.lots[15]]){const s={priceChangePercent:-20,additionalRainDays:1,storageCostMultiplier:1.5},a=analyzeWhatIf(lot,'adventurous',s);assert.deepEqual(a.changed,planLot(world,geo,lot,'adventurous',s).best);assert.deepEqual(a.baseline,planLot(world,geo,lot,'adventurous').best);for(const scan of [a.price,a.storage,a.rain])for(const t of scan.switches){assert.equal(planLot(world,geo,lot,'adventurous',{...s,[scan.axis]:t.from}).best?.id??null,t.before);assert.equal(planLot(world,geo,lot,'adventurous',{...s,[scan.axis]:t.to}).best?.id??null,t.after);}assert.match(a.method,/not exact continuous/);}
});
test('paise ties produce non-monotonic SELL/REROUTE reversals and each bracket matches the actual engine',()=>{
 const lot=world.lots.find(l=>l.lot_id===7)!,a=analyzeWhatIf(lot,'balanced',defaultScenario);assert.ok(a.price.switches.length>3,'Do not replace multiple tie reversals with one global binary-search threshold');assert.ok(a.price.switches.some(s=>s.beforeAction==='reroute'&&s.afterAction==='sell_now'));assert.ok(a.price.switches.some(s=>s.beforeAction==='sell_now'&&s.afterAction==='reroute'));
 for(const s of a.price.switches){assert.equal(planLot(world,geo,lot,'balanced',{...defaultScenario,priceChangePercent:s.from}).best!.id,s.before);assert.equal(planLot(world,geo,lot,'balanced',{...defaultScenario,priceChangePercent:s.to}).best!.id,s.after);assert.ok(s.to-s.from<=1e-5+1e-12);}
});
test('market restrictions, shared-capacity leases, infeasibility and bounded API validation',async()=>{
 const lot=world.lots[0],leases=[{region:lot.region,kg:world.storage.find(s=>s.region===lot.region)!.capacity_kg,fromDay:0,untilDay:30}],market=geo.markets[0].id,a=analyzeWhatIf(lot,'conservative',defaultScenario,market,leases);assert.equal(a.changed?.market??market,market);assert.equal(a.changed?.storeDays??0,0);assert.equal(a.eligibleCount,planLot(world,geo,lot,'conservative',defaultScenario,leases).candidates.filter(c=>c.market===market&&c.eligible).length);
 const call=(body:unknown)=>POST(new Request('http://127.0.0.1:3010/api/whatif',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));const input={lotId:lot.lot_id,risk:'balanced',scenario:defaultScenario};assert.equal((await call({input,market,reservations:leases})).status,200);for(const b of [{input,market:'unknown'},{input:{...input,lotId:30}},{input:{...input,scenario:{...defaultScenario,priceChangePercent:51}}},{input,reservations:[{...leases[0],kg:-1}]}])assert.equal((await call(b)).status,400);
});
