// Server-render checks only; this does not substitute for interactive browser verification.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { world, geo, money } from "../lib/world";
import { planLot } from "../lib/planner";

async function main() {
  const claimBefore=await readFile("private/checkpoint-2-live-run.claim");
  const base="http://127.0.0.1:3010";
  const landing=await fetch(base);
  assert.equal(landing.status,200);
  const html=await landing.text();
  assert.ok(html.includes("Every harvest."));
  assert.ok(html.includes('href="/demo"'));
  for(const lot of world.lots){
    const response=await fetch(`${base}/demo?lot=${lot.lot_id}`);
    assert.equal(response.status,200);
    const body=await response.text();
    const expected=planLot(world,geo,lot,"balanced").best;
    assert.equal(body.match(/data-testid="net-value">([^<]+)/)?.[1],expected?money(expected.net):"—");
    assert.ok(body.includes("Authentic records load from the local server"));
    assert.ok(body.includes('role="tablist" aria-label="Decision workspace"'));
    assert.match(body,/id="demo-decision-gemini-panel"[^>]*hidden/);
    assert.doesNotMatch(body,/id="demo-decision-decision-panel"[^>]*hidden/);
    assert.ok(body.includes('aria-label="Risk appetite"'));
    assert.ok(body.includes('aria-label="Market price change"'));
    assert.ok(body.includes('id="evaluation"'));
  }
  assert.equal((await fetch(`${base}/demo?lot=999`)).status,200);
  assert.equal((await fetch(`${base}/not-a-page`)).status,404);
  const live=await fetch(`${base}/live`);assert.equal(live.status,200);const liveHtml=await live.text();assert.ok(liveHtml.includes("Jaipur tomato intelligence"));assert.ok(liveHtml.includes('href="/live"'));
  const metadata=await (await fetch(`${base}/api/live`)).json();assert.equal(metadata.mode,"LIVE_ASSISTED");assert.equal(metadata.mandiDeferred,true);assert.equal(metadata.locations.markets.length,2);
  const livePost=(body:unknown,origin?:string)=>fetch(`${base}/api/live`,{method:"POST",headers:{"Content-Type":"application/json",...(origin?{Origin:origin}:{})},body:JSON.stringify(body)});
  assert.equal((await livePost({},"https://other.example")).status,403);assert.equal((await livePost({large:"x".repeat(17000)})).status,413);
  assert.equal((await fetch(`${base}/.env.local`)).status,404);assert.equal((await fetch(`${base}/private/checkpoint-4-live-example.json`)).status,404);
  const agent=await fetch(`${base}/api/agent`);assert.equal(agent.status,200);const readiness=await agent.json();
  assert.equal(readiness.model,"gemini-3.1-flash-lite");
  assert.equal(readiness.ready,false,"Inference must remain locked in Checkpoint 3");
  if(readiness.record){
    const replay=await fetch(`${base}/api/agent?trace=${readiness.record.trace.runId}`);assert.equal(replay.status,200);
    const result=await replay.json();assert.equal(result.mode,"authentic_replay");assert.equal(result.record.sha256,readiness.record.sha256);
    const t=result.record.trace;assert.equal(t.source,"google-genai");
    if(t.selection){const lot=world.lots.find(l=>l.lot_id===t.input.lotId)!;assert.deepEqual(t.selection,planLot(world,geo,lot,t.input.risk,t.input.scenario).candidates.find(c=>c.id===t.selection.id));}
  }
  assert.equal((await fetch(`${base}/api/agent?trace=../../.env.local`)).status,409);
  assert.equal((await fetch(`${base}/private/free-tier-verification.json`)).status,404);
  const post=(value:unknown,extra:Record<string,string>={})=>fetch(`${base}/api/agent`,{method:"POST",headers:{"Content-Type":"application/json",...extra},body:JSON.stringify(value)});
  assert.equal((await post({lotId:999,risk:"balanced",scenario:{priceChangePercent:0,additionalRainDays:0,storageCostMultiplier:1}})).status,400);
  assert.equal((await post({}, {Origin:"https://other-site.example"})).status,403);
  assert.equal((await post({oversized:"x".repeat(3000)})).status,413);
  if(!readiness.ready){
    const valid={lotId:1,risk:"balanced",scenario:{priceChangePercent:0,additionalRainDays:0,storageCostMultiplier:1}};
    for(let n=0;n<2;n++){const blocked=await post(valid);assert.equal(blocked.status,409);const body=await blocked.json();assert.equal(body.error,readiness.blocker);assert.equal(body.record,undefined);}
  }
  const payload=await (await fetch(`${base}/evaluation/benchmark.json`)).text();
  const manifest=await (await fetch(`${base}/evaluation/manifest.json`)).json();
  assert.equal(createHash("sha256").update(payload).digest("hex"),manifest.artifactSha256);
  assert.equal(payload,await readFile("public/evaluation/benchmark.json","utf8"));
  const evidence=JSON.parse(payload),demo=await (await fetch(`${base}/demo`)).text();
  const rupees=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
  for(const id of ["A","B"]){assert.equal(demo.match(new RegExp(`data-testid="evaluation-${id}-net">([^<]+)`))?.[1],rupees(evidence[id].totals.net));}
  assert.ok(demo.includes("INCOMPLETE"));assert.equal(evidence.C.totals,null);assert.equal(evidence.C.evidence.inferenceCallsThisEvaluation,0);
  assert.deepEqual(await readFile("private/checkpoint-2-live-run.claim"),claimBefore);
  console.log("PASS: LIVE_ASSISTED SSR/metadata/rejections/private paths, all 30 SSR quotes, frozen A/B displayed totals, downloadable artifact SHA256, Policy C incomplete, authentic trace replay, API rejection/lock and unchanged live claim. No inference performed; browser hydration/interactions not verified.");
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
