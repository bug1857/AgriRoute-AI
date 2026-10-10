import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_VERSION,calculateLive,normalizePrices,normalizeRoad,normalizeWeather,timestamp,validateLiveInput,type LiveInput,type LiveEvidence,type Point } from '../lib/live';
import { collectLiveEvidence,fetchMandi,fetchWeather,providerJson,recalledEvidence,rememberEvidence,type Fetcher } from '../lib/live-providers';
import { GET,POST } from '../app/api/live/route';

// Mock evidence exercises calculations; these are not provider observations or real quotes.
const now=Date.parse('2026-10-10T12:00:00Z'),iso=(hours=0)=>new Date(now+hours*3600000).toISOString();
const origin={lat:26.92,lng:75.78};
function input():LiveInput{
  const q={source:'Test buyer/carrier quote',reviewed:true,status:'confirmed' as const,quotedAt:iso(-1),expiresAt:iso(100)};
  return {origin:{...origin},markets:[{id:'muhana',point:{lat:26.84,lng:75.76}},{id:'chomu',point:{lat:27.17,lng:75.72}}],coordinatesReviewed:true,inputsReviewed:true,kg:1000,variety:'Local',lifeDays:5,risk:'balanced',departAt:iso(),holdDays:1,handlingHours:4,marketFeePercent:0,otherDeductions:0,carrier:{...q,rate:.035,capacityKg:1000,availableAt:iso()},storage:{...q,rate:.3,capacityKg:1000,tempC:5,maxDays:2},prices:[{...q,marketId:'muhana',perKg:20,basis:'buyer_offer'},{...q,marketId:'chomu',perKg:20,basis:'buyer_offer'}]};
}
function weatherPayload(p=origin){return {latitude:p.lat,longitude:p.lng,hourly_units:{time:'unixtime',temperature_2m:'°C',rain:'mm'},hourly:{time:Array.from({length:168},(_,i)=>(now-12*3600000+i*3600000)/1000),temperature_2m:Array(168).fill(25),rain:Array(168).fill(0)}};}
function roadPayload(a:Point,b:Point){return {code:'Ok',waypoints:[{distance:0,location:[a.lng,a.lat]},{distance:0,location:[b.lng,b.lat]}],routes:[{distance:20000,duration:3600,geometry:{type:'LineString',coordinates:[[a.lng,a.lat],[b.lng,b.lat]]}}]};}
function evidence(i=input()):LiveEvidence{
  const common={status:'AVAILABLE' as const,source:'Mocked test evidence',sourceUrl:'https://example.invalid',licence:'Test only',retrievedAt:iso()};
  const road=(id:'muhana'|'chomu')=>({...common,data:{...normalizeRoad(roadPayload(i.origin,i.markets.find(m=>m.id===id)!.point),i.origin,i.markets.find(m=>m.id===id)!.point),distanceKm:0,etaHours:0}});
  return {version:LIVE_VERSION,origin:i.origin,markets:i.markets,prices:{...common,status:'UNAVAILABLE',data:null,error:'Mock missing prices'},weather:{...common,data:normalizeWeather(weatherPayload(),origin)},routes:{muhana:road('muhana'),chomu:road('chomu')}};
}
const candidate=(r:ReturnType<typeof calculateLive>,id='muhana:0')=>r.candidates.find(c=>c.id===id)!;
const row={state:'Rajasthan',district:'Jaipur',commodity:'Tomato',market:'Jaipur (F&V)',variety:'Local',arrival_date:'10/10/2026',min_price:'1500',modal_price:'2000',max_price:'2500'};

test('strict inputs reject unbounded numbers, unknown fields, duplicate markets and invalid calendar dates',()=>{
  assert.equal(validateLiveInput(input(),now).kg,1000);
  for(const patch of [{kg:NaN},{kg:30001},{risk:'toString'},{departAt:iso(-1)},{surprise:1},{origin:{lat:0,lng:0}},{markets:[input().markets[0],input().markets[0]]}])assert.throws(()=>validateLiveInput({...input(),...patch},now));
  assert.throws(()=>timestamp('2026-02-30T12:00:00Z'));
  assert.throws(()=>timestamp('2026-10-10T12:00:00'));
});
test('official units, exact district/commodity, dates and conflicts are validated without fabricated history',()=>{
  const prices=normalizePrices({records:[row,row,{...row,commodity:'Onion'},{...row,district:'Alwar'}]},now);
  assert.equal(prices.length,1);assert.equal(prices[0].modalPerKg,20);assert.equal(prices[0].minPerKg,15);assert.equal(prices[0].maxPerKg,25);
  for(const patch of [{arrival_date:'11/10/2026'},{arrival_date:'30/02/2026'},{modal_price:''},{max_price:1900}])assert.throws(()=>normalizePrices({records:[{...row,...patch}]},now));
});
test('forecast units, coverage, grid identity and hourly continuity fail closed',()=>{
  const w=weatherPayload();assert.equal(normalizeWeather(w,origin).hours.length,168);
  assert.throws(()=>normalizeWeather({...w,latitude:0},origin));assert.throws(()=>normalizeWeather({...w,hourly_units:{...w.hourly_units,rain:'inch'}},origin));
  w.hourly.time[3]+=1;assert.throws(()=>normalizeWeather(w,origin));
});
test('road meters/seconds convert accurately; snap and geometry mismatches are rejected',()=>{
  const b=input().markets[0].point,p=roadPayload(origin,b),r=normalizeRoad(p,origin,b);assert.equal(r.distanceKm,20);assert.equal(r.etaHours,1);
  assert.throws(()=>normalizeRoad({...p,code:'NoRoute'},origin,b));p.waypoints[1].distance=1001;assert.throws(()=>normalizeRoad(p,origin,b));p.waypoints[1].distance=0;p.routes[0].geometry.coordinates[1]=[0,0];assert.throws(()=>normalizeRoad(p,origin,b));
});
test('independently calculated SELL and STORE reconcile paise and conserve kilograms',()=>{
  const r=calculateLive(input(),evidence(),now),sell=candidate(r),store=candidate(r,'muhana:1');
  assert.equal(sell.gross,19333.33);assert.equal(sell.net,19333.33);assert.equal(sell.remainingHours,116);
  assert.equal(store.gross,18333.33);assert.equal(store.storage,300);assert.equal(store.net,18033.33);assert.equal(store.remainingHours,110);
  for(const c of r.candidates){assert.equal(c.status,'REVIEWED_FEASIBLE');assert.ok(Math.abs(c.saleableKg!+c.spoiledKg!-1000)<1e-8);assert.ok(Math.abs(c.net!-(c.gross!-c.transport!-c.storage!-c.marketFees!-c.otherDeductions))<.011);}
  const i=input();i.marketFeePercent=1;i.otherDeductions=100;const fees=candidate(calculateLive(i,evidence(i),now));assert.equal(fees.marketFees,193.33);assert.equal(fees.net,19040);
});
test('48h/24h/0h affects eligibility without changing money or overriding capacity/expiry',()=>{
  const i=input();i.lifeDays=1.5;
  const c=candidate(calculateLive({...i,risk:'conservative'},evidence(i),now)),b=candidate(calculateLive(i,evidence(i),now)),a=candidate(calculateLive({...i,risk:'adventurous'},evidence(i),now));
  assert.equal(c.eligible,false);assert.equal(b.eligible,true);assert.equal(a.eligible,true);assert.equal(c.net,a.net);
  i.carrier.capacityKg=999;assert.ok(calculateLive({...i,risk:'adventurous'},evidence(i),now).candidates.every(c=>!c.eligible));
  i.carrier.capacityKg=1000;i.carrier.expiresAt=iso(1);assert.ok(calculateLive({...i,risk:'adventurous'},evidence(i),now).candidates.every(c=>!c.eligible));
});
test('manual review is required; unknown operations and price assumptions stay conditional',()=>{
  const i=input();i.prices[0].reviewed=false;assert.equal(candidate(calculateLive(i,evidence(i),now)).eligible,false);
  i.prices[0].reviewed=true;i.prices[0].basis='manual_estimate';assert.equal(candidate(calculateLive(i,evidence(i),now)).status,'CONDITIONAL');
  i.carrier.capacityKg=null;i.carrier.availableAt=null;i.storage.capacityKg=null;
  const r=calculateLive(i,evidence(i),now);assert.equal(r.bestReviewedId,null);assert.ok(r.conditionalBestId);assert.ok(r.candidates.every(c=>c.status==='CONDITIONAL'));
  i.storage.rate=null;assert.ok(calculateLive(i,evidence(i),now).candidates.filter(c=>c.action==='store').every(c=>!c.eligible));
});
test('official prices are reference-only, exact-variety matched, stale/conflicting observations block',()=>{
  const i=input();i.prices[0].perKg=null;const e=evidence(i);e.prices={...e.prices,status:'AVAILABLE',data:normalizePrices({records:[row]},now)};
  const c=candidate(calculateLive(i,e,now));assert.equal(c.pricePerKg,20);assert.equal(c.status,'CONDITIONAL');assert.equal(c.priceBasis,'official_reference_held_constant');
  i.variety='Hybrid';assert.equal(candidate(calculateLive(i,e,now)).eligible,false);i.variety='Local';
  e.prices.data![0].observationDate='2026-10-01';assert.equal(candidate(calculateLive(i,e,now)).eligible,false);
  e.prices.data=normalizePrices({records:[row,{...row,modal_price:2100}]},now);assert.equal(candidate(calculateLive(i,e,now)).eligible,false);
});
test('preceding-hour rain adds one modeled day; heat changes loss; unavailable/stale forecasts never substitute',()=>{
  const i=input(),e=evidence(i),base=candidate(calculateLive(i,e,now));
  e.weather.data!.hours[12].rainMm=2;assert.equal(candidate(calculateLive(i,e,now)).modeledRainDelayHours,0,'rain before dispatch must not delay this journey');
  e.weather.data!.hours[13].rainMm=1;const rain=candidate(calculateLive(i,e,now));assert.equal(rain.modeledRainDelayHours,24);assert.ok(rain.spoiledKg!>base.spoiledKg!);
  e.weather.data!.hours.forEach(h=>{h.tempC=30;h.rainMm=0;});assert.ok(candidate(calculateLive(i,e,now)).spoiledKg!>base.spoiledKg!);
  e.weather.retrievedAt=iso(-2);assert.ok(calculateLive(i,e,now).candidates.every(c=>c.net===null&&!c.eligible));
  e.weather.retrievedAt=iso();e.weather.data!.validUntil=iso(2);assert.ok(calculateLive(i,e,now).candidates.every(c=>!c.eligible));
});
test('expired produce remains unavailable even at adventurous risk; zero-duration heat is still actual forecast',()=>{
  const i=input(),e=evidence(i);i.lifeDays=.25;i.risk='adventurous';e.weather.data!.hours.forEach(h=>{h.tempC=60;h.rainMm=1;});
  const r=calculateLive(i,e,now);assert.ok(r.candidates.every(c=>!c.eligible));assert.ok(r.candidates.every(c=>c.saleableKg===0&&c.spoiledKg===1000));
  i.handlingHours=0;e.weather.data!.hours.forEach(h=>h.rainMm=0);assert.ok(Math.abs(candidate(calculateLive(i,e,now)).remainingHours!-1.2)<1e-9);
});
test('server snapshots are cloned, reject forged IDs and require exact coordinates',()=>{
  const e=evidence(),id=rememberEvidence(e);e.origin.lat=0;const stored=recalledEvidence(id);assert.equal(stored.origin.lat,26.92);
  stored.origin.lat=0;assert.equal(recalledEvidence(id).origin.lat,26.92);assert.throws(()=>recalledEvidence('../.env.local'));assert.throws(()=>recalledEvidence('00000000-0000-0000-0000-000000000000'));
  const i=input();i.origin={lat:26.93,lng:75.78};assert.throws(()=>calculateLive(i,recalledEvidence(id),now),/Coordinates changed/);
});
test('provider failures/invalid JSON/oversize/timeouts are bounded and never expose the key',async()=>{
  const f=(response:Response)=>async()=>response;
  await assert.rejects(providerJson('https://example.invalid',f(new Response('{}',{status:429}))),/rate limit/);
  await assert.rejects(providerJson('https://example.invalid',f(new Response('bad'))),/invalid JSON/);
  await assert.rejects(providerJson('https://example.invalid',f(new Response('x'.repeat(2*1024*1024+1)))),/2 MiB/);
  await assert.rejects(providerJson('https://example.invalid',async()=>{throw new DOMException('timeout','TimeoutError');}),/timed out/);
  const secret='test-secret-not-a-real-key';const result=await fetchMandi(secret,async()=>{throw new Error(secret);},false);assert.equal(result.status,'UNAVAILABLE');assert.equal(JSON.stringify(result).includes(secret),false);
  const missing=await fetchMandi(undefined,async()=>{throw new Error('must not be called');},false);assert.equal(missing.status,'UNAVAILABLE');
});
test('live refresh makes weather and two serialized road calls only; mandi remains deferred',async()=>{
  const i=input(),urls:string[]=[],starts:number[]=[];
  const f:Fetcher=async(url)=>{const s=String(url);urls.push(s);if(s.includes('open-meteo'))return Response.json(weatherPayload());starts.push(Date.now());const b=s.includes(`${i.markets[0].point.lng},${i.markets[0].point.lat}`)?i.markets[0].point:i.markets[1].point;return Response.json(roadPayload(i.origin,b));};
  const result=await collectLiveEvidence(i,f,false);assert.equal(urls.length,3);assert.ok(urls.every(u=>!u.includes('data.gov.in')));assert.ok(starts[1]-starts[0]>=1000);assert.equal(result.prices.status,'UNAVAILABLE');assert.match(result.prices.error!,/deferred/);assert.equal(result.weather.status,'AVAILABLE');assert.match(result.weather.rawSha256!,/^[a-f0-9]{64}$/);
  let calls=0;const cached:Fetcher=async()=>{calls++;return Response.json(weatherPayload());};const first=await fetchWeather(origin,cached),second=await fetchWeather(origin,cached);assert.equal(calls,1);assert.deepEqual(second,first);
});
test('local API rejects cross-origin, extra fields, oversize requests and unknown snapshots without network calls',async()=>{
  const request=(body:unknown,originHeader?:string)=>new Request('http://127.0.0.1:3010/api/live',{method:'POST',headers:{'Content-Type':'application/json',...(originHeader?{Origin:originHeader}:{})},body:JSON.stringify(body)});
  assert.equal((await GET(new Request('https://public.example/api/live'))).status,403);
  assert.equal((await POST(request({},'https://other.example'))).status,403);
  assert.equal((await POST(request({large:'x'.repeat(17000)}))).status,413);
  const i=input();i.departAt=new Date(Date.now()+3600000).toISOString();
  assert.equal((await POST(request({action:'calculate',input:i,evidenceId:'00000000-0000-0000-0000-000000000000'}))).status,400);
  assert.equal((await POST(request({action:'calculate',input:i,evidenceId:'x',injectedEvidence:evidence()}))).status,400);
  const metadata=await (await GET(new Request('http://127.0.0.1:3010/api/live'))).json();assert.equal(metadata.mandiDeferred,true);assert.equal(metadata.ogdConfigured,undefined);
});

test('evidence snapshots expire at the 30-minute boundary',t=>{
  let clock=Date.now();t.mock.method(Date,'now',()=>clock);const id=rememberEvidence(evidence());assert.ok(recalledEvidence(id));
  clock+=30*60000;assert.throws(()=>recalledEvidence(id),/expired/);
});
test('successful local calculate response exactly matches server-owned evidence and calculator',async()=>{
  const clock=Date.now(),delta=clock-now,i=input(),e=evidence(i);
  i.departAt=new Date(clock+3600000).toISOString();i.carrier.availableAt=new Date(clock).toISOString();
  for(const q of [...i.prices,i.carrier,i.storage]){q.quotedAt=new Date(clock).toISOString();q.expiresAt=new Date(clock+100*3600000).toISOString();}
  for(const receipt of [e.prices,e.weather,...Object.values(e.routes)])receipt.retrievedAt=new Date(clock).toISOString();
  const w=e.weather.data!;for(const h of w.hours)h.time=new Date(Date.parse(h.time)+delta).toISOString();w.validFrom=w.hours[0].time;w.validUntil=w.hours.at(-1)!.time;
  const id=rememberEvidence(e),response=await POST(new Request('http://127.0.0.1:3010/api/live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'calculate',input:i,evidenceId:id})}));
  const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));assert.deepEqual(body.result,calculateLive(i,e,Date.parse(body.result.calculatedAt)));assert.deepEqual(body.evidence,e);
});
