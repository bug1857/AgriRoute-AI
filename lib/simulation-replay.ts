import { latestTrace } from "./agent-store";
import { contextHash } from "./agent";
import { world,geo,source } from "./world";
import { checkStorage,defaultScenario,planLot } from "./planner";
import type { StoredTrace } from "./agent-types";
import type { Decision,PolicyContext,Policy } from "./simulator";

export function replayDecision(record:StoredTrace,context:PolicyContext):Decision {
  const t=record.trace;
  const mismatch=(reason:string):Decision=>({kind:"trace_mismatch",candidateId:null,reason,traceId:t.runId,traceSha256:record.sha256});
  if(t.source!=="google-genai"||t.version!=="agriroute.agent-trace.v1"||t.plannerVersion!=="checkpoint-1.v1"||t.toolVersion!=="checkpoint-2.v1"||t.datasetSha256!==source.sha256)return mismatch("Source, fixture or versions differ");
  if(t.input.lotId!==context.lot.lot_id||t.input.risk!==context.risk||JSON.stringify(t.input.scenario)!==JSON.stringify(defaultScenario)||JSON.stringify(context.lot)!==JSON.stringify(world.lots.find(l=>l.lot_id===t.input.lotId))||JSON.stringify(context.geography)!==JSON.stringify(geo))return mismatch("Lot, risk, scenario or geography differs");
  if(t.contextSha256!==contextHash(t.input))return mismatch("Original deterministic context no longer matches");
  const original=planLot(world,geo,context.lot,context.risk);
  if(JSON.stringify(context.plan.candidates)!==JSON.stringify(original.candidates))return mismatch("Shared-capacity candidates differ from the recorded standalone run");
  const stored=checkStorage(context.evidence,context.lot.region,context.lot.kg,context.lot.harvest_day,context.lot.harvest_day+1,context.reservations);
  const expected=checkStorage(world,context.lot.region,context.lot.kg,context.lot.harvest_day,context.lot.harvest_day+1);
  if(JSON.stringify(stored)!==JSON.stringify(expected))return mismatch("Storage evidence differs from the recorded tool context");
  if(t.status==="success"&&t.selection){return {kind:"gemini_success",candidateId:t.selection.id,traceId:t.runId,traceSha256:record.sha256};}
  return {kind:t.fallback?"fallback":"infeasible",candidateId:t.fallback?.id??null,reason:t.failure??"Recorded model failure",modelFailed:true,traceId:t.runId,traceSha256:record.sha256};
}
export async function prepareReplayPolicy() {
  // The loader verifies local HMAC and current engine context; no provider SDK calls occur here.
  const record=await latestTrace();
  const usage=record?.trace.modelRequests.reduce((n,event)=>{
    const metadata=(event.response as {usage?:{promptTokenCount?:number;candidatesTokenCount?:number}}|undefined)?.usage;
    return {modelRequests:n.modelRequests+1,inputTokens:n.inputTokens+(metadata?.promptTokenCount??0),outputTokens:n.outputTokens+(metadata?.candidatesTokenCount??0)};
  },{modelRequests:0,inputTokens:0,outputTokens:0})??{modelRequests:0,inputTokens:0,outputTokens:0};
  const policy:Policy={id:"C",name:"Gemini genuine-record replay — incomplete",choose:context=>record&&record.trace.input.lotId===context.lot.lot_id?replayDecision(record,context):{kind:"missing_trace",candidateId:null,reason:"No authentic exact-match run; inference locked"}};
  return {policy,evidence:{traceId:record?.trace.runId??null,traceSha256:record?.sha256??null,model:record?.trace.model??null,source:record?.trace.source??null,usage,inferenceCallsThisEvaluation:0,cohortComparable:false,limitation:"One isolated exact-match replay; missing lots have no assigned actions. Unknown shared-resource interactions prevent a complete cohort comparison. Missing, failed and fallback decisions are not Gemini successes."}};
}
