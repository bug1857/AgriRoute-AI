import {test,after,before} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,migrate} from '../lib/database';
import {workflow,passwordHash,login,logout,authenticate,approvedDecision,digest,type User} from '../lib/coordinator';
import {GET,POST} from '../app/api/coordinator/route';
import {POST as sessionPost} from '../app/api/session/route';
import {GET as cohortGet} from '../app/api/cohort/route';
import {planMandi,type MandiInput} from '../lib/mandi';
import {mandiData} from '../lib/mandi-data';
import {farmerRecord} from '../lib/farmer-record';
const pw='Test-only-password-834928!';
const users:User[]=[0,1,2,3].map(i=>({id:randomUUID(),tenant_id:'',role:i%2?'farmer':'coordinator',name:`Isolated test ${i}`}));
const emails=users.map(()=>`${randomUUID()}@example.invalid`);
const input:MandiInput={crop:'tomato',marketId:'all',asOf:'2026-10-10',kg:1000,lifeDays:5,risk:'balanced',holdDays:3,historyDays:30,storageRate:.3,storageCapacityKg:5000,priceChangePercent:0,extraRainDays:0};
const call=(u=users[0],b:unknown,key=randomUUID())=>workflow(u,b,key);
const req=(session:string,body?:unknown,origin='http://127.0.0.1:3010',path='/api/coordinator')=>new Request(`http://127.0.0.1:3010${path}`,{method:body?'POST':'GET',headers:{Cookie:`agriroute_session=${session}`,Origin:origin,'Content-Type':'application/json','Idempotency-Key':randomUUID()},...(body?{body:JSON.stringify(body)}:{})});
async function create(){return call(users[0],{action:'createLot',name:'Test lot',farmerId:users[1].id,input});}
async function decision(l:Record<string,unknown>){return call(users[0],{action:'createDecision',lotId:l.id,version:l.version,candidateId:planMandi(mandiData,input).best!.id});}
before(async()=>{assert.ok(process.env.DATABASE_URL,'Real PostgreSQL DATABASE_URL required; no silent skip');await migrate();for(let i=0;i<2;i++){const tenant=randomUUID();await database().query('INSERT INTO ar_tenants VALUES($1,$2)',[tenant,'Isolated integration test']);for(const j of [i*2,i*2+1]){users[j].tenant_id=tenant;await database().query('INSERT INTO ar_users(id,tenant_id,id_email,name,role,password_hash) VALUES($1,$2,$3,$4,$5,$6)',[users[j].id,tenant,emails[j],users[j].name,users[j].role,passwordHash(pw)]);}}});
after(async()=>{await database().end();});
test('real DB sign-in, cookie policy, logout, expiry, rate limit and no unauthenticated reads',async()=>{
 const s=await login(emails[0],pw);assert.deepEqual(await authenticate(req(s)),users[0]);assert.equal((await GET(req(''))).status,401);assert.equal((await cohortGet(req(''))).status,401);
 const r=await sessionPost(req('',{action:'login',email:emails[1],password:pw},undefined,'/api/session'));assert.equal(r.status,200);assert.match(r.headers.get('set-cookie')!,/HttpOnly; SameSite=Strict/);assert.ok(!JSON.stringify(await r.json()).includes(pw));
 await logout(req(s));await assert.rejects(authenticate(req(s)),/expired/);
 const expired=await login(emails[0],pw);await database().query('UPDATE ar_sessions SET expires_at=now()-interval \'1 second\' WHERE hash=$1',[digest(expired)]);await assert.rejects(authenticate(req(expired)),/expired/);
 for(let i=0;i<5;i++)await assert.rejects(login(emails[2],'wrong-password'),/Invalid/);await assert.rejects(login(emails[2],pw),/Too many/);
});
test('CSRF, strict input boundaries, tenant isolation and farmer write denial',async()=>{
 const s=await login(emails[0],pw),f=await login(emails[1],pw),l=await create();
 assert.equal((await POST(req(s,{action:'createLot'},'https://evil.invalid'))).status,403);
 assert.equal((await POST(req(s,{action:'createLot',name:'bad',farmerId:null,input:{...input,kg:NaN}}))).status,400);
 assert.equal((await POST(req(f,{action:'plan',lotId:l.id}))).status,403);
 await assert.rejects(call(users[2],{action:'updateLot',id:l.id,version:1,name:'steal',farmerId:null,input}),/unavailable/);
 await assert.rejects(call(users[0],{action:'createLot',name:'bad assignment',farmerId:users[3].id,input}),/tenant/);
 assert.equal((await POST(req(s,{action:'plan',lotId:'------------------------------------'}))).status,400);
 assert.equal((await sessionPost(req('',{action:'login',email:emails[0],password:pw,role:'coordinator'},undefined,'/api/session'))).status,400);
 assert.equal((await cohortGet(req(f))).status,403);
});
test('idempotent concurrent lot creation and updates reject payload conflicts and stale versions',async()=>{
 const key=randomUUID(),b={action:'createLot',name:'Concurrent',farmerId:null,input};const [a,z]=await Promise.all([call(users[0],b,key),call(users[0],b,key)]);assert.equal(a.id,z.id);
 await assert.rejects(call(users[0],{...b,name:'different'},key),/conflicts/);
 const updates=await Promise.allSettled([1,2].map(i=>call(users[0],{action:'updateLot',id:a.id,version:1,name:`Updated ${i}`,farmerId:null,input})));assert.equal(updates.filter(x=>x.status==='fulfilled').length,1);assert.equal(updates.filter(x=>x.status==='rejected').length,1);
});
test('immutable approval, concurrent review, stale links, exact Farmer financial projection and protected export',async()=>{
 const l=await create(),d=await decision(l);await assert.rejects(approvedDecision(users[0],d.id),/unavailable/);
 await assert.rejects(call(users[0],{action:'createDecision',lotId:l.id,version:1,candidateId:'invented'}),/eligible/);
 const reviews=await Promise.allSettled(['approved','approved'].map(status=>call(users[0],{action:'reviewDecision',id:d.id,status,sha256:d.sha256})));assert.equal(reviews.filter(x=>x.status==='fulfilled').length,1);
 const approved=(reviews.find(x=>x.status==='fulfilled') as PromiseFulfilledResult<Record<string,unknown>>).value;
 assert.equal(approved.status,'approved');
 const record=await approvedDecision(users[1],d.id),f=farmerRecord(record);assert.deepEqual(f.selected,record.snapshot.selected);assert.equal(digest(record.snapshot),record.sha256);assert.ok(!JSON.stringify(f).includes(users[0].id));assert.ok(!Object.hasOwn(f,'offer'));
 await assert.rejects(approvedDecision(users[3],d.id),/unavailable/);
 const s=await login(emails[1],pw),r=await GET(req(s,undefined,undefined,`/api/coordinator?decision=${d.id}&download=1`));assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.match(r.headers.get('content-disposition')!,/attachment/);assert.deepEqual(await r.json(),f);
 await assert.rejects(database().query('UPDATE ar_decisions SET snapshot=\'{}\' WHERE id=$1',[d.id]),/Immutable/);
 await assert.rejects(database().query('DELETE FROM ar_decisions WHERE id=$1',[d.id]),/prohibited/);
 await assert.rejects(database().query('UPDATE ar_audit SET action=\'forged\' WHERE record_id=$1',[d.id]),/Immutable/);
 await call(users[0],{action:'updateLot',id:l.id,version:1,name:'changed',farmerId:users[1].id,input});await assert.rejects(approvedDecision(users[1],d.id),/stale/);
});
test('latest approved record supersedes old reference, saved data survives independent DB connection',async()=>{
 const l=await create(),a=await decision(l),b=await decision(l);for(const d of [a,b])await call(users[0],{action:'reviewDecision',id:d.id,status:'approved',sha256:d.sha256});await assert.rejects(approvedDecision(users[0],a.id),/newer/);assert.equal((await approvedDecision(users[1],b.id)).sha256,b.sha256);
 const {Client}=await import('pg'),client=new Client({connectionString:process.env.DATABASE_URL});try{await client.connect();assert.equal((await client.query('SELECT sha256 FROM ar_decisions WHERE id=$1',[b.id])).rows[0].sha256,b.sha256);}finally{await client.end();}
});
test('persistent multilingual review, correction, human confirmation, tenant/expiry/withdrawal/tamper protection',async()=>{
 const draft=await call(users[0],{action:'extractOffer',message:'टमाटर ५०० किलो ₹३५००/क्विंटल, ग्रेड A, डिलीवरी चोमू कल, भुगतान नकद.',provider:'local'});
 const fields={crop:'tomato',quantityKg:500,pricePerKg:36,grade:'A',delivery:'Chomu tomorrow',payment:'cash',marketId:'scenario_chomu',validFrom:'2026-10-10',validUntil:'2026-10-17',maxArrivalDays:1};
 await assert.rejects(call(users[0],{action:'confirmOffer',id:draft.id,fields,acknowledged:false}),/acknowledgement/);await assert.rejects(call(users[2],{action:'confirmOffer',id:draft.id,fields,acknowledged:true}),/unavailable/);
 const c=await call(users[0],{action:'confirmOffer',id:draft.id,fields,acknowledged:true});assert.equal(c.confirmed.evidence.price.normalized,35);assert.equal(c.confirmed.fields.pricePerKg,36);assert.ok(c.confirmed.corrections.some((x:{field:string;confirmed:unknown})=>x.field==='pricePerKg'&&x.confirmed===36));
 await assert.rejects(database().query('UPDATE ar_offers SET confirmed=\'{}\' WHERE id=$1',[draft.id]),/Immutable/);
 const l=await call(users[0],{action:'createLot',name:'Buyer terms',farmerId:null,input:{...input,kg:500,marketId:'scenario_chomu'}});const plan=planMandi(mandiData,{...input,kg:500,marketId:'scenario_chomu'},c.confirmed);const d=await call(users[0],{action:'createDecision',lotId:l.id,version:1,candidateId:plan.best!.id,offerId:c.id});assert.equal(d.snapshot.selected.expectedPrice,36);
 await call(users[0],{action:'reviewDecision',id:d.id,status:'approved',sha256:d.sha256});assert.equal((await approvedDecision(users[0],d.id)).sha256,d.sha256);await call(users[0],{action:'rejectOffer',id:c.id});await assert.rejects(approvedDecision(users[0],d.id),/stale/);await assert.rejects(call(users[0],{action:'createDecision',lotId:l.id,version:1,candidateId:plan.best!.id,offerId:c.id}),/unavailable/);
 const expired=await call(users[0],{action:'manualOffer',message:'',provider:'local'});const now=Date.now;try{Date.now=()=>now()+31*60000;await assert.rejects(call(users[0],{action:'confirmOffer',id:expired.id,fields,acknowledged:true}),/expired/);}finally{Date.now=now;}
 await assert.rejects(call(users[0],{action:'extractOffer',message:'Tomato ₹35/kg 500 kg',provider:'gemini'}),/LOCKED/);assert.equal((await call(users[0],{action:'manualOffer',message:'',provider:'local'})).extraction.source,'manual-entry');
});
