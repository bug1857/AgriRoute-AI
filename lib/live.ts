import { assumptions, checkStorage, estimateSpoilage, riskEligibility, shelfLeft, type Risk, type Action } from "./planner";

export const LIVE_VERSION="agriroute.live-assisted.v1";
export const MANDI_SOURCE="https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi";
export type Point={lat:number;lng:number};
export type MarketId="muhana"|"chomu";
export type QuoteStatus="unknown"|"confirmed"|"unavailable";
export type Quote={source:string;reviewed:boolean;status:QuoteStatus;quotedAt:string|null;expiresAt:string|null};
export type Carrier=Quote&{rate:number|null;capacityKg:number|null;availableAt:string|null};
export type Storage=Quote&{rate:number|null;capacityKg:number|null;maxDays:number|null;tempC:number|null};
export type ManualPrice=Quote&{marketId:MarketId;perKg:number|null;basis:"manual_estimate"|"buyer_offer"};
export type LiveInput={origin:Point;markets:{id:MarketId;point:Point}[];coordinatesReviewed:boolean;inputsReviewed:boolean;kg:number;variety:string;lifeDays:number;risk:Risk;departAt:string;holdDays:number;handlingHours:number;marketFeePercent:number;otherDeductions:number;carrier:Carrier;storage:Storage;prices:ManualPrice[]};
export type Evidence<T>={status:"AVAILABLE"|"UNAVAILABLE";source:string;sourceUrl:string;licence:string;retrievedAt:string;data:T|null;error?:string;rawSha256?:string};
export type PriceObservation={market:string;commodity:"Tomato";variety:string;grade:string|null;observationDate:string;minPerQuintal:number|null;maxPerQuintal:number|null;modalPerQuintal:number;minPerKg:number|null;maxPerKg:number|null;modalPerKg:number};
export type Weather={requested:Point;grid:Point;kind:"FORECAST";validFrom:string;validUntil:string;hours:{time:string;tempC:number;rainMm:number}[]};
export type Road={origin:Point;destination:Point;distanceKm:number;etaHours:number;geometry:{type:"LineString";coordinates:[number,number][]};snapDistancesM:number[];profile:"car"};
export type LiveEvidence={version:typeof LIVE_VERSION;origin:Point;markets:LiveInput["markets"];prices:Evidence<PriceObservation[]>;weather:Evidence<Weather>;routes:Record<MarketId,Evidence<Road>>};
export const marketNames:Record<MarketId,string>={muhana:"Jaipur (F&V) / Muhana",chomu:"Chomu (F&V)"};
export const marketAliases:Record<MarketId,string[]>={muhana:["jaipur (f&v)","jaipur(f&v)","jaipur (f & v)","muhana"],chomu:["chomu (f&v)","chomu(f&v)","chomu (f & v)"]};
const cents=(n:number)=>Math.round(n*100)/100;
export function object(value:unknown,keys?:string[]):Record<string,unknown>{if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Expected object");const r=value as Record<string,unknown>;if(keys&&Object.keys(r).some(k=>!keys.includes(k)))throw new Error("Unexpected field");return r;}
export function numeric(value:unknown,min:number,max:number):number{if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max)throw new Error("Invalid numeric input");return value;}
function text(value:unknown,max=160){if(typeof value!=="string"||value.length>max)throw new Error("Invalid text input");return value.trim();}
function bool(value:unknown){if(typeof value!=="boolean")throw new Error("Invalid review flag");return value;}
export function timestamp(value:unknown):number{if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))throw new Error("Timestamp must include timezone");priceDate(value.slice(0,10));return Date.parse(value);}
function dateOrNull(value:unknown){if(value===null)return null;timestamp(value);return value as string;}
function numberOrNull(value:unknown,min:number,max:number){return value===null?null:numeric(value,min,max);}
export function point(value:unknown):Point{const p=object(value,["lat","lng"]);return {lat:numeric(p.lat,26,28.5),lng:numeric(p.lng,74.5,77.5)};}
function quote(value:Record<string,unknown>):Quote{if(!["unknown","confirmed","unavailable"].includes(String(value.status)))throw new Error("Invalid quote status");return {source:text(value.source),reviewed:bool(value.reviewed),status:value.status as QuoteStatus,quotedAt:dateOrNull(value.quotedAt),expiresAt:dateOrNull(value.expiresAt)};}
export function validateLiveInput(value:unknown,now=Date.now()):LiveInput{
  const r=object(value,["origin","markets","coordinatesReviewed","inputsReviewed","kg","variety","lifeDays","risk","departAt","holdDays","handlingHours","marketFeePercent","otherDeductions","carrier","storage","prices"]);
  if(!Array.isArray(r.markets)||r.markets.length!==2||!Array.isArray(r.prices)||r.prices.length!==2)throw new Error("Exactly two configured markets and price entries required");
  const markets=r.markets.map(v=>{const m=object(v,["id","point"]);if(m.id!=="muhana"&&m.id!=="chomu")throw new Error("Unknown market");return {id:m.id as MarketId,point:point(m.point)};});
  if(new Set(markets.map(m=>m.id)).size!==2)throw new Error("Duplicate market");
  const prices=r.prices.map(v=>{const p=object(v,["source","reviewed","status","quotedAt","expiresAt","marketId","perKg","basis"]);if(!markets.some(m=>m.id===p.marketId)||!["manual_estimate","buyer_offer"].includes(String(p.basis)))throw new Error("Invalid price identity");return {...quote(p),marketId:p.marketId as MarketId,perKg:numberOrNull(p.perKg,.01,1000),basis:p.basis as ManualPrice["basis"]};});
  if(new Set(prices.map(p=>p.marketId)).size!==2)throw new Error("Duplicate price market");
  const carrier=object(r.carrier,["source","reviewed","status","quotedAt","expiresAt","rate","capacityKg","availableAt"]),storage=object(r.storage,["source","reviewed","status","quotedAt","expiresAt","rate","capacityKg","maxDays","tempC"]);
  if(!["conservative","balanced","adventurous"].includes(String(r.risk)))throw new Error("Invalid risk");
  const depart=timestamp(r.departAt);if(depart<now-5*60000||depart>now+3*86400000)throw new Error("Departure must be now through three days ahead");
  return {origin:point(r.origin),markets,prices,coordinatesReviewed:bool(r.coordinatesReviewed),inputsReviewed:bool(r.inputsReviewed),kg:numeric(r.kg,1,30000),variety:text(r.variety,80),lifeDays:numeric(r.lifeDays,.25,30),risk:r.risk as Risk,departAt:r.departAt as string,holdDays:numeric(r.holdDays,.25,3),handlingHours:numeric(r.handlingHours,0,24),marketFeePercent:numeric(r.marketFeePercent,0,20),otherDeductions:numeric(r.otherDeductions,0,100000),carrier:{...quote(carrier),rate:numberOrNull(carrier.rate,0,10),capacityKg:numberOrNull(carrier.capacityKg,1,50000),availableAt:dateOrNull(carrier.availableAt)},storage:{...quote(storage),rate:numberOrNull(storage.rate,0,100),capacityKg:numberOrNull(storage.capacityKg,0,100000),maxDays:numberOrNull(storage.maxDays,0,30),tempC:numberOrNull(storage.tempC,0,40)}};
}
export function priceDate(value:unknown):string{
  if(typeof value!=="string")throw new Error("Missing observation date");
  const parts=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const iso=parts?`${parts[3]}-${parts[2]}-${parts[1]}`:value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)||!Number.isFinite(Date.parse(iso))||new Date(iso).toISOString().slice(0,10)!==iso)throw new Error("Invalid observation date");return iso;
}
export function normalizePrices(payload:unknown,now=Date.now()):PriceObservation[]{
  const p=object(payload);if(!Array.isArray(p.records)||p.records.length>500)throw new Error("Invalid OGD records");
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(now));
  const rows:PriceObservation[]=[];
  const num=(v:unknown)=>{if(typeof v!=="number"&&typeof v!=="string")throw new Error("Invalid mandi price");if(String(v).trim()==="")throw new Error("Empty mandi price");return numeric(Number(v),0,1000000);};
  const optional=(v:unknown)=>v===undefined||v===null||v==="NA"||v===""?null:num(v);
  for(const raw of p.records){
    const r=object(raw);
    if(String(r.state).trim().toLowerCase()!=="rajasthan"||String(r.district).trim().toLowerCase()!=="jaipur"||String(r.commodity).trim().toLowerCase()!=="tomato")continue;
    const date=priceDate(r.arrival_date);if(date>today)throw new Error("Future mandi observation rejected");
    const min=optional(r.min_price),max=optional(r.max_price),modal=num(r.modal_price);if(modal<=0||(min!==null&&min>modal)||(max!==null&&max<modal))throw new Error("Inconsistent mandi prices");
    const market=text(r.market,100),variety=text(r.variety,80);if(!market||!variety)throw new Error("Missing market/variety");
    rows.push({market,commodity:"Tomato",variety,grade:r.grade===undefined?null:text(r.grade,80),observationDate:date,minPerQuintal:min,maxPerQuintal:max,modalPerQuintal:modal,minPerKg:min===null?null:min/100,maxPerKg:max===null?null:max/100,modalPerKg:modal/100});
  }
  return [...new Map(rows.map(r=>[JSON.stringify(r),r])).values()].sort((a,b)=>b.observationDate.localeCompare(a.observationDate)||a.market.localeCompare(b.market)||a.variety.localeCompare(b.variety));
}
export function normalizeWeather(payload:unknown,requested:Point):Weather{
  const p=object(payload),h=object(p.hourly),u=object(p.hourly_units);
  if(u.time!=="unixtime"||u.temperature_2m!=="°C"||u.rain!=="mm")throw new Error("Unexpected weather units");
  if(!Array.isArray(h.time)||!Array.isArray(h.temperature_2m)||!Array.isArray(h.rain)||h.time.length<24||h.time.length>400||h.time.length!==h.temperature_2m.length||h.time.length!==h.rain.length)throw new Error("Invalid weather arrays");
  const temp=h.temperature_2m,rain=h.rain;
  const hours=h.time.map((t,i)=>({time:new Date(numeric(t,0,4102444800)*1000).toISOString(),tempC:numeric(temp[i],-50,70),rainMm:numeric(rain[i],0,500)}));
  for(let i=1;i<hours.length;i++)if(Date.parse(hours[i].time)-Date.parse(hours[i-1].time)!==3600000)throw new Error("Non-contiguous forecast");
  const grid={lat:numeric(p.latitude,-90,90),lng:numeric(p.longitude,-180,180)};
  if(Math.abs(grid.lat-requested.lat)>.15||Math.abs(grid.lng-requested.lng)>.15)throw new Error("Weather grid does not match pickup");
  return {requested,grid,kind:"FORECAST",hours,validFrom:hours[0].time,validUntil:hours.at(-1)!.time};
}
export function normalizeRoad(payload:unknown,origin:Point,destination:Point):Road{
  const p=object(payload);if(p.code!=="Ok"||!Array.isArray(p.routes)||!p.routes.length||!Array.isArray(p.waypoints)||p.waypoints.length!==2)throw new Error("No road route returned");
  const r=object(p.routes[0]),geometry=object(r.geometry);if(geometry.type!=="LineString"||!Array.isArray(geometry.coordinates)||geometry.coordinates.length<2||geometry.coordinates.length>20000)throw new Error("Invalid route geometry");
  const coordinates=geometry.coordinates.map(v=>{if(!Array.isArray(v)||v.length!==2)throw new Error("Invalid route point");return [numeric(v[0],-180,180),numeric(v[1],-90,90)] as [number,number];});
  const snaps=p.waypoints.map((v,i)=>{const w=object(v),target=i?destination:origin;if(!Array.isArray(w.location)||w.location.length!==2)throw new Error("Missing snapped waypoint");const lng=numeric(w.location[0],-180,180),lat=numeric(w.location[1],-90,90);const endpoint=i?coordinates.at(-1)!:coordinates[0];if(Math.abs(endpoint[0]-lng)>.0001||Math.abs(endpoint[1]-lat)>.0001||Math.abs(lng-target.lng)>.02||Math.abs(lat-target.lat)>.02)throw new Error("Route geometry does not match requested endpoints");return numeric(w.distance,0,1000);});
  if(r.distance!==0&&r.duration===0)throw new Error("Invalid road duration");
  return {origin,destination,distanceKm:numeric(r.distance,0,500000)/1000,etaHours:numeric(r.duration,0,86400)/3600,geometry:{type:"LineString",coordinates},snapDistancesM:snaps,profile:"car"};
}
export type LiveCandidate={id:string;action:Action;marketId:MarketId;destination:string;status:"REVIEWED_FEASIBLE"|"CONDITIONAL"|"UNAVAILABLE";eligible:boolean;blockers:string[];conditions:string[];dispatchAt:string;arrivalAt:string|null;pricePerKg:number|null;priceBasis:string|null;priceSource:string|null;roadKm:number|null;roadEtaHours:number|null;modeledRainDelayHours:number|null;modeledExposure:number|null;remainingHours:number|null;saleableKg:number|null;spoiledKg:number|null;gross:number|null;transport:number|null;storage:number|null;marketFees:number|null;otherDeductions:number;net:number|null};
function isFresh(e:Evidence<unknown>,now:number,maxHours:number){const t=Date.parse(e.retrievedAt);return e.status==="AVAILABLE"&&e.data!==null&&Number.isFinite(t)&&t<=now+60000&&now-t<=maxHours*3600000;}
function quoteChecks(q:Quote,end:number,now:number,label:string,hard:string[],conditions:string[]){
  if(q.status==="unavailable")hard.push(`${label}: declared unavailable`);
  if(!q.reviewed||q.status!=="confirmed")conditions.push(`${label}: operational confirmation pending`);
  if(!q.source.trim())conditions.push(`${label}: source missing`);
  if(q.quotedAt===null)conditions.push(`${label}: quote date missing`);else if(timestamp(q.quotedAt)>now+60000)hard.push(`${label}: future quote date`);
  if(q.expiresAt===null)conditions.push(`${label}: expiry missing`);else if(timestamp(q.expiresAt)<end)hard.push(`${label}: expires before required use`);
  if(q.quotedAt&&q.expiresAt&&timestamp(q.quotedAt)>timestamp(q.expiresAt))hard.push(`${label}: invalid validity interval`);
}
function ambientExposure(weather:Weather,start:number,end:number,lifeDays:number){
  if(start<Date.parse(weather.validFrom)||end>Date.parse(weather.validUntil))throw new Error("Forecast does not cover the entire handling/journey interval");
  const current=weather.hours.findLast(h=>Date.parse(h.time)<=start);
  if(!current)throw new Error("Missing dispatch temperature");
  let exposure=0,lastTemp=current.tempC,rainMm=0;
  // Open-Meteo rain is the preceding hour's sum; use the next row for [hour, hour+1).
  for(let i=0;i<weather.hours.length-1;i++){const h=weather.hours[i],at=Date.parse(h.time),duration=Math.max(0,Math.min(end,at+3600000)-Math.max(start,at))/86400000;if(duration){exposure+=estimateSpoilage(lifeDays,duration,0,h.tempC).fractionLost;rainMm+=weather.hours[i+1].rainMm*duration*24;lastTemp=h.tempC;}}
  return {exposure,rainMm,lastTemp};
}
export function calculateLive(input:LiveInput,evidence:LiveEvidence,now=Date.now()){
  validateLiveInput(input,now);
  if(evidence.version!==LIVE_VERSION||JSON.stringify(input.origin)!==JSON.stringify(evidence.origin)||JSON.stringify(input.markets)!==JSON.stringify(evidence.markets))throw new Error("Coordinates changed: refresh authoritative evidence first");
  const nearest=input.markets.filter(m=>isFresh(evidence.routes[m.id],now,6)).sort((a,b)=>evidence.routes[a.id].data!.distanceKm-evidence.routes[b.id].data!.distanceKm||a.id.localeCompare(b.id))[0]?.id;
  const candidates:LiveCandidate[]=[];
  for(const market of input.markets)for(const hold of [0,input.holdDays]){
    const action:Action=hold?"store":market.id===nearest?"sell_now":"reroute";
    const dispatch=timestamp(input.departAt)+hold*86400000;
    const c:LiveCandidate={id:`${market.id}:${hold}`,action,marketId:market.id,destination:marketNames[market.id],status:"UNAVAILABLE",eligible:false,blockers:[],conditions:[],dispatchAt:new Date(dispatch).toISOString(),arrivalAt:null,pricePerKg:null,priceBasis:null,priceSource:null,roadKm:null,roadEtaHours:null,modeledRainDelayHours:null,modeledExposure:null,remainingHours:null,saleableKg:null,spoiledKg:null,gross:null,transport:null,storage:null,marketFees:null,otherDeductions:input.otherDeductions,net:null};
    candidates.push(c);
    const hard=c.blockers,conditions=c.conditions,routeEvidence=evidence.routes[market.id],weatherEvidence=evidence.weather;
    if(!input.coordinatesReviewed)conditions.push("Pickup and market gate coordinates require human review; defaults are locality/access-road locators");
    if(!input.inputsReviewed)conditions.push("Lot weight, variety, usable-life and deductions require review");
    if(!isFresh(routeEvidence,now,6))hard.push("Road route missing or older than 6 hours");
    if(!isFresh(weatherEvidence,now,1))hard.push("Weather forecast missing or older than 1 hour");
    if(!input.variety)hard.push("Tomato variety not identified");
    const road=routeEvidence.data,weather=weatherEvidence.data;
    if(hard.length||!road||!weather)continue;
    c.roadKm=road.distanceKm;c.roadEtaHours=road.etaHours;
    const travelHours=road.etaHours+input.handlingHours;
    let ambient:ReturnType<typeof ambientExposure>;
    try{
      const initial=ambientExposure(weather,dispatch,dispatch+travelHours*3600000,input.lifeDays);
      c.modeledRainDelayHours=initial.rainMm>0?24:0;
      const arrival=dispatch+(travelHours+c.modeledRainDelayHours)*3600000;c.arrivalAt=new Date(arrival).toISOString();
      ambient=ambientExposure(weather,dispatch,arrival,input.lifeDays);
    }catch{hard.push("Forecast does not cover planned dispatch, handling and arrival");continue;}
    const arrival=timestamp(c.arrivalAt!);
    const manual=input.prices.find(p=>p.marketId===market.id)!;
    if(manual.perKg!==null){
      if(!manual.reviewed||!manual.source||!manual.quotedAt||!manual.expiresAt){hard.push("Manual price requires review, source, quote date and expiry");}
      else {quoteChecks(manual,arrival,now,"Price",hard,conditions);c.pricePerKg=manual.perKg;c.priceBasis=manual.basis;c.priceSource=manual.source;if(manual.basis==="manual_estimate")conditions.push("Human planning estimate, not a confirmed buyer offer");}
    }else{
      const records=isFresh(evidence.prices,now,1)?evidence.prices.data??[]:[];
      const matches=records.filter(p=>marketAliases[market.id].includes(p.market.toLowerCase())&&p.variety.toLowerCase()===input.variety.toLowerCase()).sort((a,b)=>b.observationDate.localeCompare(a.observationDate));
      const latest=matches[0];
      if(!latest)hard.push("No fresh official observation for this exact market and tomato variety; reviewed manual price required");
      else if(now-Date.parse(`${latest.observationDate}T00:00:00+05:30`)>3*86400000)hard.push(`Official observation ${latest.observationDate} is stale (>3 days)`);
      else if(matches.filter(p=>p.observationDate===latest.observationDate).some(p=>p.modalPerKg!==latest.modalPerKg))hard.push("Conflicting modal observations/grades; reviewed manual price required");
      else {c.pricePerKg=latest.modalPerKg;c.priceBasis="official_reference_held_constant";c.priceSource=`OGD/AGMARKNET · ${latest.market} · ${latest.variety} · ${latest.observationDate}`;conditions.push("Mandi modal is a reference, not a buyer offer or future-price forecast; held constant only for planning");}
    }
    const carrier=input.carrier;
    quoteChecks(carrier,arrival,now,"Carrier",hard,conditions);
    if(carrier.rate===null)hard.push("Carrier tariff missing (₹/kg/km)");
    if(carrier.capacityKg===null)conditions.push("Carrier load capacity unknown");else if(carrier.capacityKg<input.kg)hard.push("Carrier load capacity insufficient");
    if(carrier.availableAt===null)conditions.push("Carrier availability unknown");else if(timestamp(carrier.availableAt)>dispatch)hard.push("Carrier unavailable at requested dispatch");
    let coldExposure=0;
    if(hold){
      const storage=input.storage;quoteChecks(storage,dispatch,now,"Storage",hard,conditions);
      if(storage.rate===null||storage.tempC===null)hard.push("Storage rate and handling temperature required");
      if(storage.capacityKg===null)conditions.push("Storage capacity unknown");else if(!checkStorage({lots:[],prices:{},weather:[],storage:[{region:"live",capacity_kg:storage.capacityKg,cost_per_kg_day:storage.rate??0}]},"live",input.kg,0,hold).feasible)hard.push("Storage capacity insufficient");
      if(storage.maxDays===null)conditions.push("Storage duration availability unknown");else if(storage.maxDays<hold)hard.push("Storage duration exceeds reviewed availability");
      if(storage.tempC!==null)coldExposure=estimateSpoilage(input.lifeDays,0,hold,storage.tempC).fractionLost;
    }
    c.modeledExposure=Math.min(1,ambient.exposure+coldExposure);
    c.remainingHours=Math.max(0,shelfLeft(input.lifeDays,ambient.lastTemp)*(1-c.modeledExposure)*24);
    c.spoiledKg=input.kg*c.modeledExposure;c.saleableKg=input.kg-c.spoiledKg;
    const risk=riskEligibility(c.remainingHours,input.risk,hard);
    for(const reason of risk.reasons)if(!hard.includes(reason))hard.push(reason);
    if(c.pricePerKg!==null&&carrier.rate!==null&&(!hold||input.storage.rate!==null)){
      c.gross=cents(c.saleableKg*c.pricePerKg);c.transport=cents(road.distanceKm*input.kg*carrier.rate);c.storage=hold?cents(input.kg*input.storage.rate!*hold):0;c.marketFees=cents(c.gross*input.marketFeePercent/100);c.net=cents(c.gross-c.transport-c.storage-c.marketFees-input.otherDeductions);
    }
    c.eligible=hard.length===0&&c.net!==null;c.status=!c.eligible?"UNAVAILABLE":conditions.length?"CONDITIONAL":"REVIEWED_FEASIBLE";
  }
  candidates.sort((a,b)=>(b.net??-Infinity)-(a.net??-Infinity)||a.id.localeCompare(b.id));
  return {version:LIVE_VERSION,mode:"LIVE_ASSISTED" as const,calculatedAt:new Date(now).toISOString(),input,candidates,bestReviewedId:candidates.find(c=>c.status==="REVIEWED_FEASIBLE")?.id??null,conditionalBestId:candidates.find(c=>c.status==="CONDITIONAL")?.id??null,assumptions:{coldAgingFactor:assumptions.coldAgingFactor,rainRule:"Any forecast rain during initial origin handling/journey window adds 24 modeled hours once; not a verified road closure",weatherScope:"Origin forecast used along journey; hourly temperature held constant over each hour",routingProfile:"OSRM car route, not a truck-suitability or carrier-availability guarantee",spoilage:"Original linear heat-exposure model; uncalibrated for real tomato lots",priceRule:"No live price forecast invented; official reference held constant, or reviewed human price",transportTariffUnit:"INR/kg/km",notBooking:true,notGuaranteedEarnings:true}};
}
export type LiveResult=ReturnType<typeof calculateLive>;
