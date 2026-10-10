import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { GenerateContentResponse, GoogleGenAI, type FunctionCall, type GenerateContentParameters } from "@google/genai";
import { executeTool, MAX_TOOL_CALLS, runAgent, validateAgentInput } from "../lib/agent";
import { claimLiveRun, GEMINI_MODEL, verifyFreeTier, verifyTraceStorage } from "../lib/gemini-server";
import { saveTrace, sealTrace, verifyIntegrity, verifyTrace } from "../lib/agent-store";
import { world, geo, source } from "../lib/world";
import { defaultScenario, getWeather, planLot } from "../lib/planner";

const lot=world.lots.find(l=>l.crop==="tomato"&&planLot(world,geo,l,"balanced").best)!;
const input={lotId:lot.lot_id,risk:"balanced" as const,scenario:defaultScenario};
const plan=planLot(world,geo,lot,input.risk,input.scenario);
const weather=getWeather(world,lot.region,lot.harvest_day);
const calls:FunctionCall[]=[
  {id:"price",name:"get_price_forecast",args:{market:plan.best!.market,days:3}},
  {id:"weather",name:"get_weather",args:{region:lot.region}},
  {id:"storage",name:"check_storage",args:{region:lot.region,kg:lot.kg}},
  {id:"loss",name:"estimate_spoilage",args:{crop:lot.crop,days:plan.best!.transitHours/24,temp:weather.temp_c}},
  {id:"transport",name:"transport_cost",args:{origin:lot.region,market:plan.best!.market,kg:lot.kg}},
];
function response(parts:NonNullable<NonNullable<GenerateContentResponse["candidates"]>[number]["content"]>["parts"]) {
  const r=new GenerateContentResponse();r.candidates=[{content:{role:"model",parts}}];r.responseId="mock-response";return r;
}
const tools=(batch=calls)=>response(batch.map(functionCall=>({functionCall})));
const select=(candidateId=plan.best!.id)=>response([{text:JSON.stringify({candidateId})}]);
function mocked(sequence:GenerateContentResponse[],seen:GenerateContentParameters[]=[]) {
  return {name:"mocked-model",sdkVersion:"mocked-test",source:"mocked-test" as const,generate:async(request:GenerateContentParameters)=>{seen.push(request);const r=sequence.shift();assert.ok(r,"Unexpected extra model request");return r;}};
}
test("five actual handlers and server selection preserve financial consistency; mocks stay labelled",async()=>{
  const requests:GenerateContentParameters[]=[];
  const t=await runAgent(input,mocked([tools(),select()],requests));
  assert.equal(t.status,"success");assert.equal(t.source,"mocked-test");assert.equal(t.toolAttempts,5);
  assert.deepEqual(t.selection,plan.best);assert.equal(t.fallbackStatus,"not_used");
  assert.equal(t.datasetSha256,source.sha256);assert.match(t.contextSha256,/^[a-f0-9]{64}$/);
  assert.equal(t.tools[4].name,"transport_cost");assert.deepEqual(t.tools[4].result,executeTool("transport_cost",calls[4].args,input));
  assert.ok(t.tools.every(x=>x.startedAt&&x.finishedAt&&x.status==="ok"));
  const history=requests[1].contents as {parts: {functionResponse?:{id:string;response:unknown}}[]}[];
  assert.equal(history[2].parts.length,5);assert.equal(history[2].parts[0].functionResponse?.id,"price");
});
test("six-call cap includes each member of a parallel batch",async()=>{
  const extra={name:"get_price_forecast",args:{market:plan.best!.market,days:4}};
  const t=await runAgent(input,mocked([tools([...calls,extra,{...extra,args:{...extra.args,days:5}}])]));
  assert.equal(t.failure,"six_call_limit");assert.equal(t.toolAttempts,7);
  assert.equal(t.tools.filter(x=>x.status==="ok").length,MAX_TOOL_CALLS);assert.equal(t.tools[6].result,undefined);
  assert.equal(t.selection,null);assert.deepEqual(t.fallback,plan.best);
});
test("six legal invocations can finish; cap spans sequential model responses",async()=>{
  const extra={name:"get_price_forecast",args:{market:plan.best!.market,days:4}};
  const good=await runAgent(input,mocked([tools(calls.slice(0,2)),tools([...calls.slice(2),extra]),select()]));
  assert.equal(good.status,"success");assert.equal(good.toolAttempts,6);
  const bad=await runAgent(input,mocked([tools(calls.slice(0,2)),tools([...calls.slice(2),extra,{...extra,args:{...extra.args,days:5}}])]));
  assert.equal(bad.failure,"six_call_limit");assert.equal(bad.tools.filter(t=>t.status==="ok").length,6);
});
test("unknown tools and invalid arguments are recorded as rejected, never executed",async()=>{
  for(const call of [{name:"wire_money",args:{}},{name:"toString",args:{}},{...calls[0],args:{market:"missing",days:1}},{...calls[0],args:{market:plan.best!.market,days:31}},{...calls[1],args:{region:"another lot"}},{...calls[2],args:{region:lot.region,kg:lot.kg+1}},{...calls[3],args:{crop:lot.crop,days:-1,temp:weather.temp_c}},{...calls[4],args:{...calls[4].args,secret:"extra"}}]){
    const t=await runAgent(input,mocked([tools([call])]));assert.equal(t.status,"failed");assert.equal(t.tools[0].status,"rejected");assert.equal(t.tools[0].result,undefined);
  }
});
test("repeat attempts count against budget and fail even when argument key order differs",async()=>{
  const repeated={...calls[0],args:{days:3,market:plan.best!.market}};
  const t=await runAgent(input,mocked([tools([calls[0]]),tools([repeated])]));
  assert.equal(t.failure,"repeated_tool_call");assert.equal(t.toolAttempts,2);assert.equal(t.tools.filter(x=>x.status==="ok").length,1);
});
test("candidate hallucinations, ineligible candidates and invented financial fields fail",async()=>{
  for(const final of [select("unknown:999"),select(plan.candidates.find(c=>!c.eligible)!.id),response([{text:JSON.stringify({candidateId:plan.best!.id,net:999999})}]),response([{text:"SELL NOW"}])]){
    const t=await runAgent(input,mocked([tools(),final]));assert.equal(t.status,"failed");assert.equal(t.selection,null);assert.equal(t.fallbackStatus,"deterministic_available");
  }
});
test("model cannot finish without all five successful tools",async()=>{
  const t=await runAgent(input,mocked([tools(calls.slice(0,4)),select()]));assert.equal(t.failure,"missing_required_tools");
});
test("timeout and quota failures are explicit and provider secrets never enter trace",async()=>{
  const timeout=await runAgent(input,{...mocked([]),generate:()=>new Promise(()=>{})},5);
  assert.equal(timeout.failure,"model_timeout");assert.equal(timeout.modelRequests[0].error,"model_timeout");
  const quota=await runAgent(input,{...mocked([]),generate:async()=>{throw Object.assign(new Error("API_KEY_SECRET"),{status:429});}});
  assert.equal(quota.failure,"quota_exhausted");assert.ok(!JSON.stringify(quota).includes("API_KEY_SECRET"));assert.equal(quota.fallbackStatus,"deterministic_available");
});
test("lot and scenario validation is strict before model invocation",async()=>{
  for(const value of [{...input,lotId:30},{...input,lotId:1.5},{...input,risk:"__proto__"},{...input,scenario:{...defaultScenario,additionalRainDays:3}},{...input,scenario:{...defaultScenario,priceChangePercent:NaN}},{...input,extra:true}]){
    assert.throws(()=>validateAgentInput(value));await assert.rejects(runAgent(value,mocked([])));
  }
});
test("trace HMAC detects mutations and rejects mocked records for authentic replay",async()=>{
  const t=await runAgent(input,mocked([tools(),select()]));const key=Buffer.alloc(32,7);
  const record=sealTrace(t,key);assert.equal(verifyIntegrity(record,key),record);assert.throws(()=>verifyTrace(record,key),/provenance/);
  const altered=structuredClone(record);altered.trace.selection!.net++;assert.throws(()=>verifyIntegrity(altered,key),/integrity/);
  await assert.rejects(saveTrace(t),/authentic/);
});
test("free policy rejects paid, stale, absent and insufficient verification",()=>{
  const proof={model:GEMINI_MODEL,tier:"free",billingDisabled:true,checkedAt:new Date().toISOString(),requestsPerMinute:15,requestsPerDay:500,observedPeakRequestsPerDay:2,tokensPerMinute:250000,evidence:"Explicit user Free-tier confirmation and supplied AI Studio rate-limit screenshot"};
  assert.equal(verifyFreeTier(proof),proof);
  for(const p of [null,{...proof,tier:"paid"},{...proof,billingDisabled:false},{...proof,checkedAt:"2000-01-01"},{...proof,requestsPerMinute:5},{...proof,observedPeakRequestsPerDay:500},{...proof,tokensPerMinute:0}])assert.throws(()=>verifyFreeTier(p));
});
test("only one live claim can succeed, including concurrent and repeated requests",async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),"agriroute-claim-"));
  try{const claims=await Promise.allSettled([claimLiveRun(dir),claimLiveRun(dir)]);assert.equal(claims.filter(c=>c.status==="fulfilled").length,1);await assert.rejects(claimLiveRun(dir),/already_claimed/);}finally{await rm(dir,{recursive:true,force:true});}
});
test("official SDK wire protocol handles mocked function calls and returns real tool responses",async()=>{
  let requests=0;
  const ai=new GoogleGenAI({apiKey:"mock-key-never-real",vertexai:false,httpOptions:{retryOptions:{attempts:1},fetch:async(_url,init)=>{
    requests++;const body=JSON.parse(String(init?.body));assert.equal(body.tools[0].functionDeclarations.length,5);
    if(requests===2){assert.equal(body.contents[2].parts.length,5);assert.ok(body.contents[2].parts[0].functionResponse.response.result);}
    return new Response(JSON.stringify(requests===1?tools():select()),{status:200,headers:{"Content-Type":"application/json"}});
  }}});
  const trace=await runAgent(input,{name:GEMINI_MODEL,sdkVersion:"SDK-with-mocked-fetch",source:"mocked-test",generate:r=>ai.models.generateContent(r)});
  assert.equal(trace.status,"success");assert.equal(requests,2);assert.deepEqual(trace.selection,plan.best);
});
test("trace write failure stops further inference and reports explicit persistence failure",async()=>{
  const requests:GenerateContentParameters[]=[];
  const t=await runAgent(input,mocked([tools(),select()],requests),30000,async()=>{throw Object.assign(new Error("disk full"),{code:"ENOSPC"});});
  assert.equal(t.failure,"trace_persistence_failed");assert.equal(requests.length,1);assert.equal(t.status,"failed");assert.ok(t.modelRequests[0].response);
});
test("progress records contain actual responses/tools before the next model turn",async()=>{
  const progress:{responses:number;tools:number}[]=[];
  const t=await runAgent(input,mocked([tools(),select()]),30000,async trace=>{progress.push({responses:trace.modelRequests.filter(m=>m.response).length,tools:trace.tools.length});});
  assert.equal(t.status,"success");assert.deepEqual(progress,[{responses:1,tools:0},{responses:1,tools:5},{responses:2,tools:5}]);
});
test("trace storage checks ability to write before inference",async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),"agriroute-storage-"));
  try{await verifyTraceStorage(dir);}finally{await rm(dir,{recursive:true,force:true});}
});
