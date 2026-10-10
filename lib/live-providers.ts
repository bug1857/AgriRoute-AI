import { createHash,randomUUID } from "node:crypto";
import { setTimeout as pause } from "node:timers/promises";
import { LIVE_VERSION,MANDI_SOURCE,normalizePrices,normalizeRoad,normalizeWeather,type Evidence,type LiveEvidence,type LiveInput,type PriceObservation,type Road,type Weather } from "./live";

const ua="AgriRoute-Round2/0.1 (noncommercial educational prototype)";
const resource="9ef84268-d588-465a-a308-a864a43d0070";
export type Fetcher=typeof fetch;
const cache=new Map<string,{until:number;promise:Promise<Evidence<unknown>>}>();
let routeQueue:Promise<unknown>=Promise.resolve(),lastRouteStart=0;
const snapshots=new Map<string,{until:number;evidence:LiveEvidence}>();
export class ProviderError extends Error{}
export async function providerJson(url:string,fetcher:Fetcher=fetch,timeoutMs=12000):Promise<{payload:unknown;sha256:string}> {
  try{
    const response=await fetcher(url,{headers:{"User-Agent":ua,Accept:"application/json"},signal:AbortSignal.timeout(timeoutMs),redirect:"manual",cache:"no-store"});
    if(!response.ok)throw new ProviderError(response.status===429?"Provider rate limit (HTTP 429)":response.status===401||response.status===403?"Provider denied access (HTTP 401/403)":`Provider HTTP ${response.status}`);
    if(!response.body)throw new ProviderError("Empty provider response");
    const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2*1024*1024){await reader.cancel();throw new ProviderError("Provider response exceeds 2 MiB");}chunks.push(value);}
    const body=Buffer.concat(chunks);return {payload:JSON.parse(body.toString("utf8")),sha256:createHash("sha256").update(body).digest("hex")};
  }catch(e){if(e instanceof ProviderError)throw e;throw new ProviderError(e instanceof SyntaxError?"Provider returned invalid JSON":e instanceof Error&&(e.name==="TimeoutError"||e.name==="AbortError")?"Provider request timed out":"Provider network/TLS failure");}
}
async function evidence<T>(source:string,sourceUrl:string,licence:string,url:string,normalize:(raw:unknown)=>T,fetcher:Fetcher,secret?:string):Promise<Evidence<T>>{
  try{const raw=await providerJson(url,fetcher),data=normalize(raw.payload);if(secret&&JSON.stringify(data).includes(secret))throw new ProviderError("Provider response redacted");return {status:"AVAILABLE",source,sourceUrl,licence,retrievedAt:new Date().toISOString(),data,rawSha256:raw.sha256};}
  catch(e){return {status:"UNAVAILABLE",source,sourceUrl,licence,retrievedAt:new Date().toISOString(),data:null,error:e instanceof ProviderError?e.message:"Provider data failed schema/unit validation"};}
}
function cached<T>(key:string,ttl:number,run:()=>Promise<Evidence<T>>,useCache:boolean):Promise<Evidence<T>>{
  if(!useCache)return run();const existing=cache.get(key);if(existing&&existing.until>Date.now())return existing.promise as Promise<Evidence<T>>;
  if(cache.size>=32)cache.delete(cache.keys().next().value!);
  const entry={until:Date.now()+ttl,promise:run().then(data=>{if(data.status==="UNAVAILABLE")entry.until=Date.now()+60000;return data;})};cache.set(key,entry);return entry.promise;
}
export async function fetchMandi(key:string|undefined,fetcher:Fetcher=fetch,useCache=true):Promise<Evidence<PriceObservation[]>>{
  if(!key?.trim())return {status:"UNAVAILABLE",source:"OGD / AGMARKNET",sourceUrl:MANDI_SOURCE,licence:"Government Open Data License–India",retrievedAt:new Date().toISOString(),data:null,error:"OGD_API_KEY not configured; no official prices were fetched"};
  const url=new URL(`https://api.data.gov.in/resource/${resource}`);
  url.search=new URLSearchParams({"api-key":key,format:"json",limit:"100",offset:"0","filters[state]":"Rajasthan","filters[district]":"Jaipur","filters[commodity]":"Tomato"}).toString();
  return cached("mandi",30*60000,()=>evidence("OGD / AGMARKNET",MANDI_SOURCE,"Government Open Data License–India",url.toString(),raw=>{const rows=normalizePrices(raw);if(!rows.length)throw new ProviderError("No Rajasthan/Jaipur tomato observations returned");return rows;},fetcher,key),useCache);
}
export async function fetchWeather(origin:LiveInput["origin"],fetcher:Fetcher=fetch,useCache=true):Promise<Evidence<Weather>>{
  const url=new URL("https://api.open-meteo.com/v1/forecast");url.search=new URLSearchParams({latitude:String(origin.lat),longitude:String(origin.lng),hourly:"temperature_2m,rain",forecast_days:"7",timeformat:"unixtime",timezone:"GMT",temperature_unit:"celsius",precipitation_unit:"mm"}).toString();
  return cached(`weather:${JSON.stringify(origin)}`,15*60000,()=>evidence("Open-Meteo forecast",url.toString(),"CC BY 4.0; free API restricted to noncommercial use",url.toString(),raw=>normalizeWeather(raw,origin),fetcher),useCache);
}
export async function fetchRoad(origin:LiveInput["origin"],destination:LiveInput["origin"],fetcher:Fetcher=fetch,useCache=true):Promise<Evidence<Road>>{
  const url=`https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=false&generate_hints=false`;
  return cached(`road:${JSON.stringify([origin,destination])}`,6*3600000,()=>{
    const job=routeQueue.then(async()=>{await pause(Math.max(0,1001-(Date.now()-lastRouteStart)));lastRouteStart=Date.now();return evidence("OSRM / OpenStreetMap",url,"OpenStreetMap ODbL; OSRM public demo, reasonable noncommercial use, max 1 request/second",url,raw=>normalizeRoad(raw,origin,destination),fetcher);});
    routeQueue=job.then(()=>undefined,()=>undefined);return job;
  },useCache);
}
export async function collectLiveEvidence(input:LiveInput,fetcher:Fetcher=fetch,useCache=true):Promise<LiveEvidence>{
  const prices:Evidence<PriceObservation[]>={status:"UNAVAILABLE",source:"OGD / AGMARKNET",sourceUrl:MANDI_SOURCE,licence:"Government Open Data License–India",retrievedAt:new Date().toISOString(),data:null,error:"Official mandi fetching deferred at user request; reviewed manual prices required"};
  const [weather,r0,r1]=await Promise.all([fetchWeather(input.origin,fetcher,useCache),fetchRoad(input.origin,input.markets[0].point,fetcher,useCache),fetchRoad(input.origin,input.markets[1].point,fetcher,useCache)]);
  return {version:LIVE_VERSION,origin:input.origin,markets:input.markets,prices,weather,routes:{[input.markets[0].id]:r0,[input.markets[1].id]:r1} as LiveEvidence["routes"]};
}
export function rememberEvidence(evidence:LiveEvidence){for(const [id,row] of snapshots)if(row.until<=Date.now())snapshots.delete(id);if(snapshots.size>=20)snapshots.delete(snapshots.keys().next().value!);const id=randomUUID();snapshots.set(id,{evidence:structuredClone(evidence),until:Date.now()+30*60000});return id;}
export function recalledEvidence(id:unknown){if(typeof id!=="string"||!/^[-a-f0-9]{36}$/.test(id))throw new Error("Invalid evidence ID");const row=snapshots.get(id);if(!row||row.until<=Date.now())throw new Error("Evidence snapshot expired: refresh sources");return structuredClone(row.evidence);}
