// Explicit single live attempt; the persistent server claim prevents any repeat.
import { loadEnvConfig } from "@next/env";
import { agentReadiness, runGemini } from "../lib/gemini-server";
import { defaultScenario } from "../lib/planner";
async function main(){
  loadEnvConfig(process.cwd());
  const ready=await agentReadiness();if(!ready.ready){console.log(JSON.stringify({liveRun:"blocked",blocker:ready.blocker}));return;}
  const record=await runGemini({lotId:1,risk:"balanced",scenario:defaultScenario});
  const t=record.trace;
  console.log(JSON.stringify({liveRun:t.status,runId:t.runId,model:t.model,sdkVersion:t.sdkVersion,requests:t.modelRequests.length,tools:t.tools.map(x=>({name:x.name,status:x.status})),selectedCandidate:t.selection?.id,selectedAction:t.selection?.action,net:t.selection?.net,failure:t.failure,traceSha256:record.sha256},null,2));
}
void main().catch((e:unknown)=>{const error=e as Error&{status?:number};console.error(JSON.stringify({error:"Live verification failed before a saved outcome",name:error.name,status:error.status,location:error.stack?.split("\n").find(line=>line.includes("/AgriRoute-Round2/"))?.trim()}));process.exitCode=1;});
