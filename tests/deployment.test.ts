import test from 'node:test';
import assert from 'node:assert/strict';
import { requireLocal, isHostedRequest } from '../lib/local-api';
import { GET as agentGet, POST as agentPost } from '../app/api/agent/route';
import { POST as livePost } from '../app/api/live/route';
import { POST as offersPost } from '../app/api/offers/route';
import { POST as mandiPost } from '../app/api/mandi/route';

const local='http://127.0.0.1:3010',production='https://agri-route-ai.example.com';
function request(url:string,method='GET',origin?:string,body?:unknown,host?:string) {
 return new Request(url,{method,headers:{...(host?{Host:host}:{}),...(origin?{Origin:origin}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
test('production origin must be explicitly configured and same-origin for writes',()=>{
 const original=process.env.APP_ORIGIN,vercel=process.env.VERCEL;
 try{
  delete process.env.VERCEL;
  process.env.APP_ORIGIN=production;
  assert.doesNotThrow(()=>requireLocal(request(production+'/api/mandi')));
  assert.doesNotThrow(()=>requireLocal(request(production+'/api/mandi','POST',production,{})));
  assert.throws(()=>requireLocal(request(production+'/api/mandi','POST',undefined,{})));
  assert.throws(()=>requireLocal(request(production+'/api/mandi','POST','https://evil.example',{})));
  assert.throws(()=>requireLocal(request('https://evil.example/api/mandi')));
  assert.equal(isHostedRequest(request(local)),true);
  assert.throws(()=>requireLocal(request(local)));
  process.env.APP_ORIGIN='http://untrusted.example';
  assert.throws(()=>requireLocal(request('http://untrusted.example/api/mandi')));
  process.env.APP_ORIGIN=production;
  process.env.VERCEL='1';
  assert.throws(()=>requireLocal(request(local)));
 }finally{
  if(original===undefined)delete process.env.APP_ORIGIN;else process.env.APP_ORIGIN=original;
  if(vercel===undefined)delete process.env.VERCEL;else process.env.VERCEL=vercel;
 }
});
test('hosted Gemini remains inaccessible without provider access or local trace data',async()=>{
 const original=process.env.APP_ORIGIN,vercel=process.env.VERCEL;
 try{
  process.env.APP_ORIGIN=production;process.env.VERCEL='1';
  const get=await agentGet(request(production+'/api/agent'));assert.equal(get.status,200);
  const readiness=await get.json();assert.equal(readiness.ready,false);assert.equal(readiness.record,null);
  const post=await agentPost(request(production+'/api/agent','POST',production,{}));assert.equal(post.status,423);
  assert.equal((await livePost(request(production+'/api/live','POST',production,{}))).status,423);
  assert.equal((await offersPost(request(production+'/api/offers','POST',production,{}))).status,423);
  assert.equal((await agentPost(request(local+'/api/agent','POST',local,{}))).status,403);
  // Public, synthetic-only market planning must remain functional while volatile/private actions are gated.
  const synthetic={crop:'tomato',marketId:'all',asOf:'2026-10-10',kg:1000,lifeDays:5,risk:'balanced',holdDays:3,historyDays:30,storageRate:.3,storageCapacityKg:5000,priceChangePercent:0,extraRainDays:0};
  const mandi=await mandiPost(request(production+'/api/mandi','POST',production,synthetic));
  assert.equal(mandi.status,200);
  assert.equal((await mandi.json()).mode,'SYNTHETIC_MANDI');
  assert.equal((await mandiPost(request(production+'/api/mandi','POST','https://evil.example',synthetic))).status,403);

 }finally{
  if(original===undefined)delete process.env.APP_ORIGIN;else process.env.APP_ORIGIN=original;
  if(vercel===undefined)delete process.env.VERCEL;else process.env.VERCEL=vercel;
 }
});
