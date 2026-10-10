import { assumptions, checkStorage, defaultScenario, getWeather, planLot, shelfLeft, transportCost, type Candidate, type Reservation, type Risk } from "./planner";
import type { Geography, Lot, World } from "./world";

export const SIMULATION_VERSION="agriroute.simulation.v1";
export const SIMULATION_RULES={horizonDays:30,risk:"balanced",ordering:"harvest_day then lot_id; existing dispatches/releases before new harvests",settlement:"floor(actual arrival day), arrival must be before day 30",spoilage:"cumulative linear exposure against each day's original heat-adjusted life; cold rate 0.25; cap at initial kg",transport:"origin-region dispatch-day rain adds 24h once; origin-region weather along the journey",storage:"reserve original kg on [harvest, dispatch); bill reserved original kg until departure/expiry, release on observed expiry",baseline:"nearest-market harvest-day dispatch; ignores soft risk margin, cannot sell spoiled kg",missingPolicyC:"no invented action or full-cohort totals; resolved-lot simulation is an isolated preview"} as const;
export type Decision={kind:"baseline"|"deterministic"|"gemini_success"|"fallback"|"infeasible"|"missing_trace"|"trace_mismatch";candidateId:string|null;reason?:string;traceId?:string;traceSha256?:string;modelFailed?:boolean};
export type PolicyContext={lot:Lot;evidence:World;geography:Geography;plan:ReturnType<typeof planLot>;reservations:Reservation[];risk:Risk};
export type Policy={id:"A"|"B"|"C";name:string;choose:(context:PolicyContext)=>Decision};
export const baselinePolicy:Policy={id:"A",name:"Nearest-market immediate dispatch",choose:({plan})=>({kind:"baseline",candidateId:plan.baseline.id})};
export const plannerPolicy:Policy={id:"B",name:"Best-feasible deterministic planner",choose:({plan})=>({kind:plan.best?"deterministic":"infeasible",candidateId:plan.best?.id??null,...(plan.best?{}:{reason:"No feasible candidate under Balanced policy"})})};
export type LedgerEvent={time:number;lotId:number;type:"harvest"|"decision"|"dispatch"|"spoilage"|"settlement"|"expiry";kg?:number;rupees?:number;detail?:string};
export type Realized={status:"sold"|"spoiled"|"unsold";actualDispatchDay:number|null;arrivalDay:number|null;settlementDay:number|null;settlementPrice:number|null;soldKg:number;spoiledKg:number;unsoldKg:number;gross:number;transport:number;storage:number;net:number};
export type LotResult={lotId:number;initialKg:number;decision:Decision;predicted:Candidate|null;realized:Realized|null};
export type Totals={initialKg:number;soldKg:number;spoiledKg:number;unsoldKg:number;gross:number;transport:number;storage:number;net:number;massErrorKg:number};
export type PolicyResult={id:Policy["id"];name:string;status:"COMPLETE"|"INCOMPLETE";cohortLots:number;evaluatedLots:number;unevaluatedKg:number;classification:Record<string,number>;totals:Totals|null;previewTotals:Totals|null;lots:LotResult[];ledger:LedgerEvent[];reservations:Reservation[];peakReservedKg:Record<string,number>};
type Active={lot:Lot;result:LotResult;stage:"ambient"|"storage"|"transit"|"sold"|"spoiled";time:number;exposure:number;dispatch:number|null;arrival:number|null;settlementDay:number|null;settlementPrice:number|null;soldKg:number;gross:number;transport:number;storageRaw:number;reservation?:Reservation};
const cents=(n:number)=>Math.round(n*100)/100;
const epsilon=1e-10;

export function evidenceAt(w:World,day:number):World {
  return {lots:w.lots.map(l=>({...l})),storage:w.storage.map(s=>({...s})),prices:Object.fromEntries(Object.entries(w.prices).map(([k,p])=>[k,p.slice(0,day+1)])),weather:w.weather.filter(r=>r.day<=day).map(r=>({...r}))};
}
export function summarize(lots:LotResult[]):Totals {
  const rows=lots.filter((r):r is LotResult&{realized:Realized}=>r.realized!==null);
  const sum=(field:"soldKg"|"spoiledKg"|"unsoldKg")=>rows.reduce((n,r)=>n+r.realized[field],0);
  const money=(field:"gross"|"transport"|"storage"|"net")=>rows.reduce((n,r)=>n+Math.round(r.realized[field]*100),0)/100;
  const initialKg=rows.reduce((n,r)=>n+r.initialKg,0),soldKg=sum("soldKg"),spoiledKg=sum("spoiledKg"),unsoldKg=sum("unsoldKg");
  return {initialKg,soldKg,spoiledKg,unsoldKg,gross:money("gross"),transport:money("transport"),storage:money("storage"),net:money("net"),massErrorKg:initialKg-soldKg-spoiledKg-unsoldKg};
}
function validateWorld(w:World,g:Geography) {
  const ids=new Set<number>();
  for(const lot of w.lots){if(ids.has(lot.lot_id)||!Number.isInteger(lot.lot_id)||!Number.isInteger(lot.harvest_day)||lot.harvest_day<0||lot.harvest_day>=30||!Number.isFinite(lot.kg)||lot.kg<=0||!Number.isFinite(lot.shelf_life_days)||lot.shelf_life_days<=0)throw new Error("Invalid or duplicate simulation lot");ids.add(lot.lot_id);}
  const markets=new Set(g.markets.map(m=>m.id));if(!markets.size||markets.size!==g.markets.length)throw new Error("Invalid market identities");
  for(const market of markets){if(!w.prices[market]||w.prices[market].length<30||w.prices[market].slice(0,30).some(p=>!Number.isFinite(p)||p<=0))throw new Error("Invalid settlement prices");}
  for(const region of new Set(w.lots.map(l=>l.region))){
    checkStorage(w,region,1,0,1);
    for(let day=0;day<30;day++){if(w.weather.filter(r=>r.region===region&&r.day===day).length!==1)throw new Error("Missing or duplicate weather");const weather=getWeather(w,region,day);if(typeof weather.rain!=="boolean")throw new Error("Invalid rain observation");}
  }
}

export function simulate(w:World,g:Geography,policy:Policy,risk:Risk="balanced"):PolicyResult {
  validateWorld(w,g);
  const ordered=[...w.lots].sort((a,b)=>a.harvest_day-b.harvest_day||a.lot_id-b.lot_id);
  const reservations:Reservation[]=[],active:Active[]=[],lots:LotResult[]=[],ledger:LedgerEvent[]=[];
  const classifications:Record<string,number>={};
  const event=(s:Active,type:LedgerEvent["type"],values:Omit<LedgerEvent,"type"|"lotId"|"time">={})=>ledger.push({time:s.time,lotId:s.lot.lot_id,type,...values});
  function dispatch(s:Active){
    const candidate=s.result.predicted!;
    const weather=getWeather(w,s.lot.region,Math.floor(s.time));
    const travel=transportCost(candidate.distanceKm,s.lot.kg,weather.rain);
    s.stage="transit";s.dispatch=s.time;s.arrival=s.time+travel.hours/24;s.transport=travel.cost;
    event(s,"dispatch",{kg:s.lot.kg*(1-s.exposure),rupees:travel.cost,detail:`${candidate.market}; arrival ${s.arrival}; dispatch rain ${weather.rain}`});
  }
  function advance(s:Active,target:number){
    while(s.time<=target+epsilon&&s.stage!=="sold"&&s.stage!=="spoiled"){
      if(s.stage==="storage"&&s.time+epsilon>=s.result.predicted!.dispatchDay&&s.time<30){dispatch(s);continue;}
      if(s.stage==="transit"&&s.time+epsilon>=s.arrival!&&s.arrival!<30){
        s.time=s.arrival!;s.settlementDay=Math.floor(s.time);s.settlementPrice=w.prices[s.result.predicted!.market][s.settlementDay];
        s.soldKg=s.lot.kg*Math.max(0,1-s.exposure);s.gross=cents(s.soldKg*s.settlementPrice);s.stage="sold";
        event(s,"settlement",{kg:s.soldKg,rupees:s.gross,detail:`day ${s.settlementDay}; ${s.settlementPrice}/kg`});break;
      }
      if(s.time>=target-epsilon)break;
      const day=Math.floor(s.time),weather=getWeather(w,s.lot.region,day);
      const rate=(s.stage==="storage"?assumptions.coldAgingFactor:1)/shelfLeft(s.lot.shelf_life_days,weather.temp_c);
      const scheduled=s.stage==="storage"?s.result.predicted!.dispatchDay:s.stage==="transit"?s.arrival!:Infinity;
      const until=Math.min(target,day+1,scheduled),dt=until-s.time;
      if(dt<=0)throw new Error("Simulation clock did not advance");
      const duration=Math.min(dt,Math.max(0,1-s.exposure)/rate);
      if(s.stage==="storage")s.storageRaw+=s.lot.kg*w.storage.find(x=>x.region===s.lot.region)!.cost_per_kg_day*duration;
      const old=s.exposure;s.exposure=Math.min(1,old+duration*rate);s.time+=duration;
      if(s.exposure>=1-epsilon)s.exposure=1;
      event(s,"spoilage",{kg:s.lot.kg*(s.exposure-old),detail:`observed day ${day}; ${weather.temp_c}C; ${s.stage}`});
      if(s.exposure===1){s.stage="spoiled";if(s.reservation)s.reservation.untilDay=Math.min(s.reservation.untilDay,s.time);event(s,"expiry",{detail:"All initial mass has already been recorded as spoilage"});break;}
      s.time=until;
    }
  }
  for(let day=0;day<30;day++){
    // Prior observed expiry/departure releases capacity before harvests at the same instant.
    for(const s of active)advance(s,day);
    for(const lot of ordered.filter(l=>l.harvest_day===day)){
      const evidence=evidenceAt(w,day),leases=reservations.map(r=>({...r}));
      const plan=planLot(evidence,g,lot,risk,defaultScenario,leases);
      let decision:Decision;
      try{decision=policy.choose({lot:{...lot},evidence,geography:g,plan,reservations:leases,risk});}catch{decision={kind:"infeasible",candidateId:null,reason:"Policy decision failed"};}
      let candidate=decision.candidateId?plan.candidates.find(c=>c.id===decision.candidateId)??null:null;
      if(candidate&&(candidate.hardReasons.length||(policy.id!=="A"&&!candidate.eligible))){decision={...decision,kind:"infeasible",candidateId:null,reason:"Selected candidate violates constraints"};candidate=null;}
      if(decision.candidateId&&!candidate){decision={...decision,kind:"infeasible",candidateId:null,reason:"Unknown or infeasible candidate ID"};}
      const result:LotResult={lotId:lot.lot_id,initialKg:lot.kg,decision,predicted:candidate,realized:null};lots.push(result);
      classifications[decision.kind]=(classifications[decision.kind]??0)+1;
      if(decision.modelFailed)classifications.model_failed=(classifications.model_failed??0)+1;
      ledger.push({time:day,lotId:lot.lot_id,type:"harvest",kg:lot.kg},{time:day,lotId:lot.lot_id,type:"decision",detail:JSON.stringify(decision)});
      if(decision.kind==="missing_trace"||decision.kind==="trace_mismatch")continue;
      const s:Active={lot,result,stage:candidate?.storeDays?"storage":"ambient",time:day,exposure:0,dispatch:null,arrival:null,settlementDay:null,settlementPrice:null,soldKg:0,gross:0,transport:0,storageRaw:0};
      if(candidate?.storeDays){
        const reservation={region:lot.region,kg:lot.kg,fromDay:day,untilDay:candidate.dispatchDay};
        if(!checkStorage(w,lot.region,lot.kg,day,candidate.dispatchDay,reservations).feasible)throw new Error("Storage overbooking");
        reservations.push(reservation);s.reservation=reservation;
      }else if(candidate)dispatch(s);
      active.push(s);
    }
  }
  for(const s of active){
    advance(s,30);
    const spoiledKg=s.lot.kg*s.exposure,unsoldKg=s.stage==="sold"||s.stage==="spoiled"?0:Math.max(0,s.lot.kg-spoiledKg-s.soldKg),storage=cents(s.storageRaw);
    s.result.realized={status:s.stage==="sold"?"sold":s.stage==="spoiled"?"spoiled":"unsold",actualDispatchDay:s.dispatch,arrivalDay:s.arrival,settlementDay:s.settlementDay,settlementPrice:s.settlementPrice,soldKg:s.soldKg,spoiledKg,unsoldKg,gross:s.gross,transport:s.transport,storage,net:cents(s.gross-s.transport-storage)};
  }
  const peakReservedKg:Record<string,number>={};
  for(const store of w.storage){const events=[...new Set(reservations.filter(r=>r.region===store.region).flatMap(r=>[r.fromDay,r.untilDay]))];const peak=Math.max(0,...events.map(t=>reservations.filter(r=>r.region===store.region&&r.fromDay<=t&&r.untilDay>t).reduce((n,r)=>n+r.kg,0)));if(peak>store.capacity_kg+epsilon)throw new Error("Capacity invariant failed");peakReservedKg[store.region]=peak;}
  const totals=summarize(lots),complete=active.length===lots.length;
  if(Math.abs(totals.massErrorKg)>1e-6||cents(totals.gross-totals.transport-totals.storage)!==totals.net)throw new Error("Conservation/financial invariant failed");
  ledger.sort((a,b)=>a.time-b.time||a.lotId-b.lotId);lots.sort((a,b)=>a.lotId-b.lotId);
  return {id:policy.id,name:policy.name,status:complete?"COMPLETE":"INCOMPLETE",cohortLots:lots.length,evaluatedLots:active.length,unevaluatedKg:lots.filter(l=>!l.realized).reduce((n,l)=>n+l.initialKg,0),classification:classifications,totals:complete?totals:null,previewTotals:complete?null:totals,lots,ledger,reservations,peakReservedKg};
}
