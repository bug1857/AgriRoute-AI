"use client";
import { useEffect, useState } from "react";
import { FlaskConical, Download, Play, ShieldCheck } from "lucide-react";
import type { AgentInput, StoredTrace } from "@/lib/agent-types";
import { actionLabels } from "@/lib/planner";
import { money } from "@/lib/world";
import WorkspaceTabs from './WorkspaceTabs';

type Readiness={ready:boolean;model:string;blocker:string|null;record:StoredTrace|null};
const blockers:Record<string,string>={missing_api_key:"Gemini key is not configured.",free_quota_unverified:"Free-tier billing and available quota are not yet verified. Live calls are disabled.",one_live_run_already_claimed:"The single Checkpoint 2 live attempt has been used. Replay is available only when an authentic trace was saved.",live_run_evidence_lost:"The live attempt could not save its evidence because local storage returned ENOSPC. Its outcome is unverified; no trace or financial result has been reconstructed. Another attempt requires approval.",trace_storage_unavailable:"Local trace storage is unavailable. No inference was started.",hosted_inference_disabled:"Public demo: genuine Gemini inference is locked and private local traces are not uploaded. The 30-lot Policy C evaluation remains incomplete."};
export default function AgentPanel({input}:{input:AgentInput}) {
  const [status,setStatus]=useState<Readiness|null>(null);
  const [record,setRecord]=useState<StoredTrace|null>(null);
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    void fetch("/api/agent",{signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error("Agent evidence could not be loaded.");return r.json();}).then((s:Readiness)=>{setStatus(s);setRecord(s.record);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
    return ()=>controller.abort();
  },[]);
  async function run(){
    setBusy(true);setError("");
    try {
      const response=await fetch("/api/agent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
      const result=await response.json();
      if(!response.ok)throw new Error(blockers[result.error]??result.error??"Agent request failed.");
      setRecord(result.record);setStatus(s=>s?{...s,ready:false,blocker:"one_live_run_already_claimed"}:s);
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function download(){if(!record)return;const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`agriroute-agent-${record.trace.runId}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const trace=record?.trace;
  const matches=trace&&JSON.stringify(trace.input)===JSON.stringify(input);
  return <section className="agent-panel" aria-label="Genuine Gemini agent" data-testid="agent-panel">
    <div className="whatif-heading"><div><span className="eyebrow">04 / VERIFY THE AGENT</span><h3>Gemini, with receipts.</h3></div><FlaskConical size={20}/></div>
    <p>Five original tools. Six calls maximum. Financial values come from the deterministic engine.</p>
    <div className="agent-controls"><span className="calculation-tag">{status?.model??"Checking configuration…"}</span><button className="button-outline" onClick={run} disabled={!status?.ready||busy}><Play size={14}/>{busy?"Running verified free-tier attempt…":"Run Gemini · one free-tier attempt"}</button></div>
    <p className="agent-status" role="status">{error||(status?.blocker?blockers[status.blocker]:status?.ready?"Free-tier verification is configured. One live attempt is available.":"Checking local server…")}</p>
    {!trace&&<p className="panel-footnote">{status?"No saved AI trace or verified agent-performance result is available.":"Authentic records load from the local server."} No live inference is performed automatically.</p>}
    {trace&&<>
      <div className="agent-record-heading"><span><ShieldCheck size={15}/> Authentic SDK record · {trace.status==="success"?"GEMINI SUCCESS":"MODEL FAILURE"}</span><button className="button-outline" onClick={download}><Download size={14}/> Export trace</button></div>
      <p className="agent-context">Recorded lot {trace.input.lotId+1} · {trace.input.risk} · {trace.startedAt}<br/>{trace.tools.filter(t=>t.status==="ok").length} tools executed / {trace.toolAttempts} requests · Saved on this device’s local server.</p>
      {!matches&&<p className="constraint-warning">Historical replay for its original lot, risk and scenario. It has not been rerun or relabelled for your current controls.</p>}
      {trace.selection?<div className="agent-selection"><strong>{actionLabels[trace.selection.action]} · {trace.selection.marketName}</strong><span>{money(trace.selection.net)} estimated net · {trace.selection.remainingHours.toFixed(1)}h usable life at arrival</span><small>Gemini selected candidate {trace.selection.id}; the server revalidated its eligibility and calculated values. This is a forecast, not realized income.</small></div>:<div className="constraint-warning">Agent failed: {trace.failure}. {trace.fallback?`Deterministic fallback available: ${actionLabels[trace.fallback.action]}, ${money(trace.fallback.net)} estimated net. This is not a Gemini outcome.`:"No feasible deterministic fallback."}</div>}
      <WorkspaceTabs id="agent-receipts" label="Gemini trace inspection" tabs={[
        {id:'tools',label:`Tool receipts (${trace.tools.length})`,content:<details open className="agent-trace"><summary>Actual tool requests and results</summary>{trace.tools.length?trace.tools.map(t=><details key={t.index}><summary>#{t.index} {t.name} <span className={`trace-status ${t.status==='ok'?'ok':'failed'}`}>{t.status}</span></summary><small>{t.startedAt} → {t.finishedAt}</small><pre>{JSON.stringify({arguments:t.args,result:t.result,error:t.error},null,2)}</pre></details>):<p>No tool requests were received from the model.</p>}</details>},
        {id:'provenance',label:'Model & provenance',content:<details open className="agent-trace"><summary>Model exchanges & provenance</summary><p>Schema {trace.version} · SDK {trace.sdkVersion}<br/>Fixture {trace.datasetSha256}<br/>Record {record!.sha256}<br/>Integrity verified by the local server using HMAC-SHA256; this is not a Google signature.</p><pre>{JSON.stringify(trace.modelRequests,null,2)}</pre></details>}
      ]}/>
    </>}
  </section>;
}
