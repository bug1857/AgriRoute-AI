import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AgentTrace, StoredTrace } from "./agent-types";
import { geo, source, world } from "./world";
import { planLot } from "./planner";
import { contextHash, validateAgentInput } from "./agent";

export const privateDir=path.join(process.cwd(),"private");
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
async function signingKey(dir:string) {
  await mkdir(dir,{recursive:true,mode:0o700});
  const filename=path.join(dir,"trace-signing.key");
  try{await writeFile(filename,randomBytes(32),{flag:"wx",mode:0o600});}catch(e){if((e as NodeJS.ErrnoException).code!=="EEXIST")throw e;}
  return readFile(filename);
}
export function sealTrace(trace:AgentTrace,key:Buffer):StoredTrace {
  const payload=JSON.stringify(trace);
  return {trace,sha256:createHash("sha256").update(payload).digest("hex"),hmac:createHmac("sha256",key).update(payload).digest("hex"),integrity:"local-HMAC-SHA256"};
}
export function verifyIntegrity(envelope:StoredTrace,key:Buffer) {
  const expected=sealTrace(envelope.trace,key);
  if(envelope.integrity!==expected.integrity||envelope.sha256!==expected.sha256||!/^[a-f0-9]{64}$/.test(envelope.hmac)||!timingSafeEqual(Buffer.from(envelope.hmac,"hex"),Buffer.from(expected.hmac,"hex")))throw new Error("Trace integrity check failed");
  return envelope;
}
export function verifyTrace(envelope:StoredTrace,key:Buffer) {
  verifyIntegrity(envelope,key);
  const t=envelope.trace;
  if(t.version!=="agriroute.agent-trace.v1"||t.source!=="google-genai"||t.datasetSha256!==source.sha256)throw new Error("Trace provenance mismatch");
  const input=validateAgentInput(t.input);
  if(t.contextSha256!==contextHash(input))throw new Error("Trace context changed; replay unavailable");
  const plan=planLot(world,geo,world.lots.find(l=>l.lot_id===input.lotId)!,input.risk,input.scenario);
  if(t.selection){const candidate=plan.candidates.find(c=>c.id===t.selection!.id&&c.eligible);if(JSON.stringify(candidate)!==JSON.stringify(t.selection))throw new Error("Trace candidate no longer matches the engine");}
  if(t.fallback&&JSON.stringify(plan.best)!==JSON.stringify(t.fallback))throw new Error("Trace fallback mismatch");
  return envelope;
}
export async function saveTrace(trace:AgentTrace,dir=privateDir) {
  if(trace.source!=="google-genai"||!uuid.test(trace.runId))throw new Error("Only authentic SDK run records may be saved for replay");
  const envelope=sealTrace(trace,await signingKey(dir));
  const traces=path.join(dir,"traces");await mkdir(traces,{recursive:true,mode:0o700});
  await writeFile(path.join(traces,`${trace.runId}.json`),JSON.stringify(envelope,null,2),{flag:"wx",mode:0o600});
  return envelope;
}
export async function loadTrace(id:string,dir=privateDir) {
  if(!uuid.test(id))throw new Error("Invalid trace ID");
  const envelope=JSON.parse(await readFile(path.join(dir,"traces",`${id}.json`),"utf8")) as StoredTrace;
  if(envelope.trace.runId!==id)throw new Error("Trace identity mismatch");
  return verifyTrace(envelope,await readFile(path.join(dir,"trace-signing.key")));
}
export async function latestTrace(dir=privateDir) {
  let files:string[];try{files=await readdir(path.join(dir,"traces"));}catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return null;throw e;}
  const traces=await Promise.all(files.filter(f=>uuid.test(f.replace(/\.json$/,""))).map(f=>loadTrace(f.replace(/\.json$/,""),dir)));
  return traces.sort((a,b)=>b.trace.startedAt.localeCompare(a.trace.startedAt))[0]??null;
}
