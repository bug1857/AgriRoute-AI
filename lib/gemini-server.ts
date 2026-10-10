import { GoogleGenAI } from "@google/genai";
import { access, mkdir, readFile, statfs, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_MODEL_REQUESTS, runAgent, validateAgentInput } from "./agent";
import { privateDir, saveTrace } from "./agent-store";

export const GEMINI_MODEL="gemini-3.1-flash-lite";
export type FreeTierVerification={model:string;checkedAt:string;billingDisabled:boolean;tier:string;requestsPerMinute:number;requestsPerDay:number;observedPeakRequestsPerDay:number;tokensPerMinute:number;evidence:string};
export function verifyFreeTier(value:unknown,now=Date.now()):FreeTierVerification {
  const p=value as FreeTierVerification;
  if(!p||p.model!==GEMINI_MODEL||p.tier!=="free"||p.billingDisabled!==true||typeof p.evidence!=="string"||p.evidence.length<10)throw new Error("Free tier and billing-disabled verification required");
  const date=Date.parse(p.checkedAt);
  if(!Number.isFinite(date)||date>now||now-date>24*60*60*1000)throw new Error("Quota verification must be less than 24 hours old");
  if(!Number.isFinite(p.requestsPerMinute)||p.requestsPerMinute<MAX_MODEL_REQUESTS||!Number.isFinite(p.requestsPerDay)||!Number.isFinite(p.observedPeakRequestsPerDay)||p.observedPeakRequestsPerDay<0||p.requestsPerDay-p.observedPeakRequestsPerDay<MAX_MODEL_REQUESTS||!Number.isFinite(p.tokensPerMinute)||p.tokensPerMinute<100000)throw new Error("Insufficient verified free quota for this bounded run");
  return p;
}
export async function agentReadiness() {
  if(!process.env.GEMINI_API_KEY)return {ready:false,model:GEMINI_MODEL,blocker:"missing_api_key"};
  try{verifyFreeTier(JSON.parse(await readFile(path.join(privateDir,"free-tier-verification.json"),"utf8")));}catch{return {ready:false,model:GEMINI_MODEL,blocker:"free_quota_unverified"};}
  try{
    await access(path.join(privateDir,"checkpoint-2-live-run.claim"));
    let blocker="one_live_run_already_claimed";
    try{await access(path.join(privateDir,"recording-failure.json"));blocker="live_run_evidence_lost";}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
    return {ready:false,model:GEMINI_MODEL,blocker};
  }catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
  return {ready:true,model:GEMINI_MODEL,blocker:null};
}
export async function claimLiveRun(dir=privateDir) {
  await mkdir(dir,{recursive:true,mode:0o700});
  try{await writeFile(path.join(dir,"checkpoint-2-live-run.claim"),new Date().toISOString(),{flag:"wx",mode:0o600});}catch(e){if((e as NodeJS.ErrnoException).code==="EEXIST")throw new Error("one_live_run_already_claimed");throw e;}
}
export async function verifyTraceStorage(dir=privateDir) {
  await mkdir(dir,{recursive:true,mode:0o700});
  const stats=await statfs(dir);if(stats.bavail*stats.bsize<16*1024*1024)throw new Error("trace_storage_unavailable");
  const probe=path.join(dir,"trace-write-probe");
  try{await writeFile(probe,Buffer.alloc(1024*1024),{mode:0o600});await unlink(probe);}catch{throw new Error("trace_storage_unavailable");}
}
export async function runGemini(value:unknown) {
  const input=validateAgentInput(value);
  const ready=await agentReadiness();if(!ready.ready)throw new Error(ready.blocker!);
  const proof=verifyFreeTier(JSON.parse(await readFile(path.join(privateDir,"free-tier-verification.json"),"utf8")));
  await verifyTraceStorage();
  const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY!,vertexai:false,httpOptions:{timeout:30000,retryOptions:{attempts:1}}});
  const model=await ai.models.get({model:GEMINI_MODEL});
  if(!model.supportedActions?.includes("generateContent"))throw new Error("model_unavailable");
  await claimLiveRun(); // No automatic retries, including after a failed or interrupted run.
  const pkg=JSON.parse(await readFile(path.join(process.cwd(),"node_modules/@google/genai/package.json"),"utf8"));
  await writeFile(path.join(privateDir,"live-run-verification.json"),JSON.stringify({verifiedAt:new Date().toISOString(),modelMetadata:model,freeTierVerification:proof},null,2),{mode:0o600});
  const trace=await runAgent(input,{name:GEMINI_MODEL,sdkVersion:pkg.version,source:"google-genai",generate:request=>ai.models.generateContent(request)},30000,t=>writeFile(path.join(privateDir,"in-progress-run.json"),JSON.stringify({partial:true,trace:t},null,2),{mode:0o600}));
  const saved=await saveTrace(trace);
  await unlink(path.join(privateDir,"in-progress-run.json")).catch(()=>{});
  return saved;
}
