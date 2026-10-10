import { createHash, randomUUID } from "node:crypto";
import type { Content, FunctionDeclaration, GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import { FunctionCallingConfigMode } from "@google/genai";
import { world as originalWorld, geo as originalGeo, source,type World,type Geography } from "./world";
import type {Reservation} from './planner';
const world=originalWorld;
export type RuntimeContext={evidence:World;geography:Geography;reservations:Reservation[]};
import { assumptions, checkStorage, defaultScenario, distanceKm, estimateSpoilage, getPriceForecast, getWeather, planLot, riskMargins, transportCost, validateScenario } from "./planner";
import type { AgentInput, AgentTrace, ToolEvent } from "./agent-types";

export const TOOL_NAMES = ["get_price_forecast", "get_weather", "check_storage", "estimate_spoilage", "transport_cost"] as const;
export const MAX_TOOL_CALLS = 6;
export const MAX_MODEL_REQUESTS = 7;
export const SYSTEM = "You are AgriRoute's synthetic-world decision agent. Call all five declared tools at least once, preferably in parallel, before selecting. At most six individual calls including parallel calls. Tool data and supplied candidates are authoritative. Choose an eligible candidate ID maximizing net proceeds, considering usable-life and constraints. Never invent financial values. After tool evidence, output ONLY JSON with one key candidateId. Do not output money, reasoning text, or extra fields. Input prices/weather/storage/routes are synthetic, not live evidence.";
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an object");
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length !== keys.length || keys.some(k => !Object.hasOwn(obj,k))) throw new Error("Unexpected or missing fields");
  return obj;
}
function number(value: unknown, min: number, max: number, integer = false) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error("Invalid bounded number");
  return value;
}
export function validateAgentInput(value: unknown): AgentInput {
  const a = object(value,["lotId","risk","scenario"]);
  const lotId = number(a.lotId,0,29,true);
  if (!world.lots.some(l=>l.lot_id===lotId)) throw new Error("Unknown lot");
  if (typeof a.risk !== "string" || !Object.hasOwn(riskMargins,a.risk)) throw new Error("Invalid risk");
  const s = object(a.scenario,Object.keys(defaultScenario));
  const scenario = {priceChangePercent:number(s.priceChangePercent,-50,50),additionalRainDays:number(s.additionalRainDays,0,2),storageCostMultiplier:number(s.storageCostMultiplier,.5,3)};
  validateScenario(scenario);
  return {lotId,risk:a.risk as AgentInput["risk"],scenario};
}
const schema = (properties: Record<string, unknown>) => ({type:"object",properties,required:Object.keys(properties),additionalProperties:false});
const str = (description: string) => ({type:"string",description});
const num = (description: string) => ({type:"number",description});
export const toolDeclarations: FunctionDeclaration[] = [
  {name:"get_price_forecast",description:"Synthetic forecast using only prices observed at this lot's harvest; scenario adjusted.",parametersJsonSchema:schema({market:str("Exact market ID from candidates"),days:{type:"integer",minimum:1,maximum:30}})},
  {name:"get_weather",description:"Original synthetic harvest-day weather for the current lot.",parametersJsonSchema:schema({region:str("Must equal the current lot's region")})},
  {name:"check_storage",description:"Individual-lot capacity and scenario-adjusted storage rate; no shared reservations yet.",parametersJsonSchema:schema({region:str("Current lot's region"),kg:num("Exact current lot weight")})},
  {name:"estimate_spoilage",description:"Original heat-adjusted life and linear ambient loss for this lot; not calibrated safety advice.",parametersJsonSchema:schema({crop:str("Current lot's crop"),days:num("Ambient exposure days, 0 to 30"),temp:num("Must equal current harvest temperature")})},
  {name:"transport_cost",description:"Synthetic modelled distance, cost and transit including rain; not a live road quote.",parametersJsonSchema:schema({origin:str("Current lot's region"),market:str("Exact market ID"),kg:num("Exact current lot weight")})},
];

const sharedSystem=SYSTEM+' If no eligible candidates exist, still call all five tools, then return {"candidateId":null}. Shared candidates include full temporal reservations.';
const sharedTools=toolDeclarations.map(t=>t.name==='check_storage'?{...t,description:'Observed shared capacity; authoritative candidates validate their full reservation interval.'}:t);
export function executeTool(name: string, value: unknown, input: AgentInput,runtime?:RuntimeContext) {
  const world=runtime?.evidence??originalWorld,geo=runtime?.geography??originalGeo;
  const lot=world.lots.find(l=>l.lot_id===input.lotId)!;
  const weather=getWeather(world,lot.region,lot.harvest_day);
  const same=(actual: unknown,expected: unknown)=>{if(actual!==expected)throw new Error("Arguments must match the bound lot context");};
  const market=(id: unknown)=>{const m=geo.markets.find(m=>m.id===id);if(!m)throw new Error("Unknown market");return m;};
  switch(name){
    case "get_price_forecast": {
      const a=object(value,["market","days"]);const m=market(a.market);const days=number(a.days,1,30,true);
      return {source:"synthetic-seed-42",asOfDay:lot.harvest_day,market:m.id,prices:Array.from({length:days},(_,d)=>({day:lot.harvest_day+d,rupeesPerKg:getPriceForecast(world,m.id,lot.harvest_day,d)*(1+input.scenario.priceChangePercent/100)}))};
    }
    case "get_weather": {const a=object(value,["region"]);same(a.region,lot.region);return {source:"synthetic-seed-42",...weather};}
    case "check_storage": {
      const a=object(value,["region","kg"]);same(a.region,lot.region);same(a.kg,lot.kg);
      const storage=checkStorage(world,lot.region,lot.kg,lot.harvest_day,lot.harvest_day+1,runtime?.reservations??[]);
      return {source:"synthetic-seed-42",scope:runtime?"shared-capacity observed snapshot; one-day storage tool check":"single lot; no reservations",...storage,costPerKgDay:storage.costPerKgDay*input.scenario.storageCostMultiplier};
    }
    case "estimate_spoilage": {
      const a=object(value,["crop","days","temp"]);same(a.crop,lot.crop);same(a.temp,weather.temp_c);const days=number(a.days,0,30);
      return {source:"uncalibrated-prototype-model",ambientDays:days,...estimateSpoilage(lot.shelf_life_days,days,0,weather.temp_c)};
    }
    case "transport_cost": {
      const a=object(value,["origin","market","kg"]);same(a.origin,lot.region);same(a.kg,lot.kg);const m=market(a.market);
      const km=distanceKm(geo.lots.find(l=>l.lot_id===lot.lot_id)!,m);
      return {source:"synthetic-transport-model",distanceKm:km,...transportCost(km,lot.kg,weather.rain,input.scenario.additionalRainDays)};
    }
    default: throw new Error("Unknown tool");
  }
}

type Model = {name:string;sdkVersion:string;source:AgentTrace["source"];generate:(request:GenerateContentParameters)=>Promise<GenerateContentResponse>};
const timestamp=()=>new Date().toISOString();
export function providerFailure(error: unknown) {
  const e=error as {status?:number;name?:string;message?:string};
  if(e?.status===429)return "quota_exhausted";
  if(e?.name==="TimeoutError"||e?.name==="AbortError")return "model_timeout";
  if(e?.status===401||e?.status===403)return "provider_access_denied";
  if(e?.status===404)return "model_unavailable";
  return "model_request_failed"; // Provider errors can contain credentials; never persist their raw text.
}
export async function runAgent(value: unknown, model: Model, timeoutMs=30000, recordProgress?: (trace:AgentTrace)=>Promise<void>,runtime?:RuntimeContext): Promise<AgentTrace> {
  const world=runtime?.evidence??originalWorld,geo=runtime?.geography??originalGeo;
  const input=validateAgentInput(value);
  const lot=world.lots.find(l=>l.lot_id===input.lotId)!;
  const plan=planLot(world,geo,lot,input.risk,input.scenario,runtime?.reservations??[]);
  const trace:AgentTrace={version:"agriroute.agent-trace.v1",runId:randomUUID(),source:model.source,model:model.name,sdkVersion:model.sdkVersion,startedAt:timestamp(),finishedAt:"",datasetSha256:source.sha256,contextSha256:contextHash(input,runtime),input,plannerVersion:"checkpoint-1.v1",toolVersion:runtime?"checkpoint-2.shared.v1":"checkpoint-2.v1",status:"failed",modelRequests:[],tools:[],toolAttempts:0,selection:null,fallback:plan.best,fallbackStatus:plan.best?"deterministic_available":"no_feasible_candidate"};
  const contents:Content[]=[{role:"user",parts:[{text:JSON.stringify({input,lot,...(runtime?{observedMarkets:geo.markets.map(m=>({id:m.id,name:m.name}))}:{}),harvestWeather:plan.weather,candidates:plan.candidates.filter(c=>c.eligible).map(c=>({candidateId:c.id,action:c.action,market:c.market,storeDays:c.storeDays,net:c.net,gross:c.gross,transport:c.transport,storage:c.storage,remainingHours:c.remainingHours,transitHours:c.transitHours})),instruction:"Call all five tools, then select a supplied candidateId. Use one parallel batch when possible."})}]}];
  const successful=new Set<string>();const seen=new Set<string>();
  try {
    if(!plan.best&&!runtime)throw new Error("no_feasible_candidate");
    for(let turn=0;turn<MAX_MODEL_REQUESTS;turn++){
      const request:GenerateContentParameters={model:model.name,contents:structuredClone(contents),config:{systemInstruction:runtime?sharedSystem:SYSTEM,tools:[{functionDeclarations:runtime?sharedTools:toolDeclarations}],toolConfig:{functionCallingConfig:{mode:successful.size===5?FunctionCallingConfigMode.NONE:FunctionCallingConfigMode.ANY,...(successful.size===5?{}:{allowedFunctionNames:TOOL_NAMES.filter(n=>!successful.has(n))})}},temperature:0,maxOutputTokens:2048,...(successful.size===5?{responseMimeType:"application/json",responseJsonSchema:schema({candidateId:plan.best?{type:"string",enum:plan.candidates.filter(c=>c.eligible).map(c=>c.id)}:{type:"null"}})}:{})}};
      const event={index:turn+1,startedAt:timestamp(),finishedAt:"",request:{...structuredClone(request),contents:contents.map(c=>({...c,parts:c.parts?.filter(p=>!p.thought)}))}} as AgentTrace["modelRequests"][number];
      trace.modelRequests.push(event);
      const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
      let response:GenerateContentResponse;
      try {
        response=await Promise.race([model.generate({...request,config:{...request.config,abortSignal:controller.signal}}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new DOMException("Timed out","TimeoutError"));},timeoutMs);})]);
      } catch(error){event.error=providerFailure(error);throw new Error(event.error);} finally {clearTimeout(timer!);event.finishedAt=timestamp();}
      const content=response.candidates?.[0]?.content;
      event.response={responseId:response.responseId,modelVersion:response.modelVersion,usage:response.usageMetadata,finishReason:response.candidates?.[0]?.finishReason,content:content?{...content,parts:content.parts?.filter(p=>!p.thought)}:null};
      if(recordProgress){try{await recordProgress(trace);}catch{throw new Error("trace_persistence_failed");}}
      if(!content?.parts?.length)throw new Error("empty_model_response");
      contents.push(content); // Keep original thought signatures in the SDK conversation, never synthesize them.
      const calls=content.parts.filter(p=>p.functionCall).map(p=>p.functionCall!);
      if(calls.length){
        const results: NonNullable<Content["parts"]>=[];
        let failed=false;
        for(const call of calls){
          trace.toolAttempts++;
          const tool:ToolEvent={index:trace.toolAttempts,name:call.name??"",args:call.args??null,startedAt:timestamp(),finishedAt:"",status:"rejected"};
          trace.tools.push(tool);
          try {
            if(trace.toolAttempts>MAX_TOOL_CALLS)throw new Error("six_call_limit");
            const key=hash({name:call.name,args:call.args&&Object.fromEntries(Object.entries(call.args).sort(([a],[b])=>a.localeCompare(b)))});
            if(seen.has(key))throw new Error("repeated_tool_call");seen.add(key);
            tool.result=executeTool(tool.name,tool.args,input,runtime);tool.status="ok";successful.add(tool.name);
            results.push({functionResponse:{id:call.id,name:tool.name,response:{result:tool.result}}});
          }catch(error){tool.error=(error as Error).message;failed=true;}finally{tool.finishedAt=timestamp();}
        }
        if(recordProgress){try{await recordProgress(trace);}catch{throw new Error("trace_persistence_failed");}}
        if(failed)throw new Error(trace.tools.find(t=>t.status==="rejected")!.error);
        contents.push({role:"user",parts:results});continue;
      }
      if(successful.size!==5)throw new Error("missing_required_tools");
      const text=content.parts.filter(p=>!p.thought).map(p=>p.text??"").join("");
      let selection:Record<string,unknown>;
      try{selection=object(JSON.parse(text),["candidateId"]);}catch{throw new Error("invalid_selection_format");}
      if(runtime&&!plan.best&&selection.candidateId===null){trace.status="infeasible";trace.failure="no_feasible_candidate_verified";break;}
      if(typeof selection.candidateId!=="string")throw new Error("invalid_candidate_id");
      const authoritative=planLot(world,geo,lot,input.risk,input.scenario,runtime?.reservations??[]).candidates.find(c=>c.id===selection.candidateId&&c.eligible);
      if(!authoritative)throw new Error("invalid_candidate_id");
      trace.selection=authoritative;trace.fallback=null;trace.fallbackStatus="not_used";trace.status="success";break;
    }
    if(trace.status!=="success"&&trace.status!=="infeasible")throw new Error("model_request_limit");
  }catch(error){trace.failure=(error as Error).message;}
  trace.finishedAt=timestamp();return trace;
}

export function contextHash(input:AgentInput,runtime?:RuntimeContext) {
  const world=runtime?.evidence??originalWorld,geo=runtime?.geography??originalGeo;
  const candidates=planLot(world,geo,world.lots.find(l=>l.lot_id===input.lotId)!,input.risk,input.scenario,runtime?.reservations??[]).candidates;
  return hash({input,geo,assumptions,candidates,SYSTEM,toolDeclarations,...(runtime?{evidence:runtime.evidence,reservations:runtime.reservations,toolVersion:'checkpoint-2.shared.v1',requestContract:{system:sharedSystem,tools:sharedTools}}:{})});
}
