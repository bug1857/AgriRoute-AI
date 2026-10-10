import { checkStorage,distanceKm,estimateSpoilage,riskEligibility,transportCost,type Risk,type Action } from './planner';
import { numeric,object,priceDate } from './live';
import type { Crop,World } from './world';
import type { ConfirmedOffer } from './offers';

export const MANDI_LABEL='Synthetic Mandi Data — For Demonstration';
export const GENERATOR_VERSION='agriroute.synthetic-mandi.v1';
export const MANDI_SEED=20261010;
export const crops:Crop[]=['tomato','potato','onion','mango'];
export const markets=[{id:'scenario_muhana',name:'Muhana-inspired scenario',lat:26.84,lng:75.76},{id:'scenario_chomu',name:'Chomu-inspired scenario',lat:27.17,lng:75.72},{id:'scenario_bassi',name:'Bassi-inspired scenario',lat:26.84,lng:76.05}];
export type PriceRow={crop:Crop;marketId:string;date:string;minPerQuintal:number;modalPerQuintal:number;maxPerQuintal:number;minPerKg:number;modalPerKg:number;maxPerKg:number};
export type MandiDataset={provenance:{kind:'SYNTHETIC';label:string;generatorVersion:string;seed:number;startDate:string;endDate:string;days:number;assumptions:string[]};markets:typeof markets;rows:PriceRow[];weather:{date:string;tempC:number;rain:boolean}[];gluts:{crop:Crop;marketId:string;startDate:string;endDate:string;multiplier:number}[]};
const dayMs=86400000,round=(v:number)=>Math.round(v*100)/100;
export function addDays(date:string,n:number){priceDate(date);if(!Number.isInteger(n))throw new Error('Days must be integers');return new Date(Date.parse(date)+n*dayMs).toISOString().slice(0,10);}
function random(seed:number){let x=seed>>>0;return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function generateMandi(seed=MANDI_SEED):MandiDataset{
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new Error('Invalid seed');
  const rand=random(seed),start='2026-01-01',days=365;
  const result:MandiDataset={provenance:{kind:'SYNTHETIC',label:MANDI_LABEL,generatorVersion:GENERATOR_VERSION,seed,startDate:start,endDate:addDays(start,days-1),days,assumptions:['Invented price ranges and seasonal phases; no official observations or agronomic calibration','Deterministic daily fluctuations, seven-day cycles, annual seasonality and seeded 4–9 day glut discounts','Fictional scenario locations; modeled distance is haversine × 1.3, not genuine road routing','Weather is generated independently; storage/usable-life inputs are declared prototype assumptions']},markets:structuredClone(markets),rows:[],weather:[],gluts:[]};
  const base:Record<Crop,number>={tomato:2500,potato:1600,onion:2200,mango:6500};
  for(const [ci,crop] of crops.entries())for(const [mi,market] of markets.entries()){
    const events=Array.from({length:3},(_,i)=>{const from=20+i*110+Math.floor(rand()*55),length=4+Math.floor(rand()*6);return {from,until:from+length,multiplier:.55+rand()*.25};});
    events.forEach(e=>result.gluts.push({crop,marketId:market.id,startDate:addDays(start,e.from),endDate:addDays(start,e.until-1),multiplier:e.multiplier}));
    let noise=0;
    for(let d=0;d<days;d++){
      noise=.65*noise+(rand()-.5)*.13;
      const season=1+.23*Math.sin(2*Math.PI*d/365+ci*.9),weekly=1+.035*Math.sin(2*Math.PI*d/7+mi),glut=events.filter(e=>d>=e.from&&d<e.until).reduce((a,e)=>a*e.multiplier,1);
      const modal=round(Math.max(100,base[crop]*(1+mi*.045)*season*weekly*(1+noise)*glut));
      const min=round(modal*(.88+rand()*.06)),max=round(modal*(1.05+rand()*.1));
      result.rows.push({crop,marketId:market.id,date:addDays(start,d),minPerQuintal:min,modalPerQuintal:modal,maxPerQuintal:max,minPerKg:min/100,modalPerKg:modal/100,maxPerKg:max/100});
    }
  }
  for(let d=0;d<days;d++)result.weather.push({date:addDays(start,d),tempC:round(25+9*Math.sin(2*Math.PI*(d-65)/365)+(rand()-.5)*4),rain:rand()<(d>=150&&d<=255?.23:.05)});
  return result;
}
export function history(data:MandiDataset,crop:Crop,marketId:string,asOf:string,days=30){
  priceDate(asOf);if(!crops.includes(crop)||!data.markets.some(m=>m.id===marketId))throw new Error('Unknown crop/market');
  if(asOf<data.provenance.startDate||asOf>data.provenance.endDate)throw new Error('Date outside synthetic dataset');
  numeric(days,1,365);if(!Number.isInteger(days))throw new Error('History window must be integer days');
  const from=addDays(asOf,1-days);const rows=data.rows.filter(r=>r.crop===crop&&r.marketId===marketId&&r.date>=from&&r.date<=asOf).sort((a,b)=>a.date.localeCompare(b.date));
  if(!rows.length||rows.at(-1)!.date!==asOf||rows[0].date!==(from<data.provenance.startDate?data.provenance.startDate:from))throw new Error('Missing daily observation');
  for(let i=0;i<rows.length;i++){const r=rows[i];if(i&&r.date!==addDays(rows[i-1].date,1))throw new Error('Missing/duplicate daily observation');for(const v of [r.minPerQuintal,r.modalPerQuintal,r.maxPerQuintal])numeric(v,.01,1000000);if(r.minPerQuintal>r.modalPerQuintal||r.modalPerQuintal>r.maxPerQuintal)throw new Error('Invalid price spread');
    // JSON bundling may shorten decimal literals; accept only sub-paisa representation noise.
    for(const [kg,quintal] of [[r.minPerKg,r.minPerQuintal],[r.modalPerKg,r.modalPerQuintal],[r.maxPerKg,r.maxPerQuintal]])if(Math.abs(numeric(kg,.0001,10000)-quintal/100)>1e-9)throw new Error('Invalid price units');}
  return rows;
}
export function forecast(data:MandiDataset,crop:Crop,marketId:string,asOf:string,ahead:number){
  numeric(ahead,0,7);if(!Number.isInteger(ahead))throw new Error('Forecast horizon must be integer days');
  const rows=history(data,crop,marketId,asOf,14),latest=rows.at(-1)!.modalPerKg;
  const sample=rows.slice(-7),mean=sample.reduce((s,r)=>s+r.modalPerKg,0)/sample.length;
  const trend=sample.length>1?(sample.at(-1)!.modalPerKg-sample[0].modalPerKg)/(sample.length-1):null;
  const estimate=ahead===0?latest:rows.length<3?null:round(Math.max(latest*.65,Math.min(latest*1.35,mean+trend!*ahead)));
  return {asOf,targetDate:addDays(asOf,ahead),ahead,latestPerKg:latest,estimatePerKg:estimate,meanPerKg:mean,trendPerKgDay:trend,changePercent:trend===null?null:(latest/sample[0].modalPerKg-1)*100,historyDays:sample.length,bounds:[latest*.65,latest*1.35],method:'Trailing seven-day mean + slope, ±35% of latest, maximum seven-day horizon; uncalibrated'};
}
export type MandiInput={crop:Crop;marketId:string;asOf:string;kg:number;lifeDays:number;risk:Risk;holdDays:number;historyDays:number;storageRate:number;storageCapacityKg:number;priceChangePercent:number;extraRainDays:number};
export function validateMandiInput(value:unknown):MandiInput{
  const r=object(value,['crop','marketId','asOf','kg','lifeDays','risk','holdDays','historyDays','storageRate','storageCapacityKg','priceChangePercent','extraRainDays']);
  if(!crops.includes(r.crop as Crop)||!(r.marketId==='all'||markets.some(m=>m.id===r.marketId))||!['conservative','balanced','adventurous'].includes(String(r.risk)))throw new Error('Unknown crop, market or risk');
  const date=priceDate(r.asOf);if(date<'2026-01-01'||date>'2026-12-31')throw new Error('Date outside synthetic dataset');
  const hold=numeric(r.holdDays,0,7),window=numeric(r.historyDays,1,90),rain=numeric(r.extraRainDays,0,2);if(![hold,window,rain].every(Number.isInteger))throw new Error('Day controls must be integers');
  return {crop:r.crop as Crop,marketId:String(r.marketId),asOf:date,kg:numeric(r.kg,1,30000),lifeDays:numeric(r.lifeDays,.25,60),risk:r.risk as Risk,holdDays:hold,historyDays:window,storageRate:numeric(r.storageRate,0,100),storageCapacityKg:numeric(r.storageCapacityKg,0,100000),priceChangePercent:numeric(r.priceChangePercent,-30,30),extraRainDays:rain};
}
export type MandiCandidate={id:string;action:Action;marketId:string;marketName:string;holdDays:number;arrivalDate:string;arrivalDays:number;expectedPrice:number|null;priceBasis:string;distanceKm:number;transitHours:number;remainingHours:number;saleableKg:number;spoiledKg:number;gross:number|null;transport:number;storage:number;net:number|null;eligible:boolean;reasons:string[]};
export function planMandi(data:MandiDataset,input:MandiInput,offer?:ConfirmedOffer){
  if(offer&&(offer.status!=='HUMAN_CONFIRMED_FOR_PLANNING'||offer.fields.crop!==input.crop||offer.fields.quantityKg!==input.kg||(input.marketId!=='all'&&input.marketId!==offer.fields.marketId)))throw new Error('Confirmed offer does not match crop, quantity or destination; correct inputs or detach it');
  validateMandiInput(input);const weather=data.weather.find(w=>w.date===input.asOf);if(!weather)throw new Error('Synthetic weather missing');numeric(weather.tempC,-50,70);if(typeof weather.rain!=='boolean')throw new Error('Invalid synthetic weather');
  const origin={lat:26.95,lng:75.80},destinations=data.markets.map(m=>({...m,km:distanceKm(origin,m)})).sort((a,b)=>a.km-b.km||a.id.localeCompare(b.id));
  const storageWorld:World={lots:[],prices:{},weather:[],storage:[{region:'scenario',capacity_kg:input.storageCapacityKg,cost_per_kg_day:input.storageRate}]};
  const candidates:MandiCandidate[]=[];
  for(const m of destinations.filter(m=>(input.marketId==='all'||m.id===input.marketId)&&(!offer||m.id===offer.fields.marketId)))for(let hold=0;hold<=input.holdDays;hold++){
    const travel=transportCost(m.km,input.kg,weather.rain,input.extraRainDays),arrival=hold+travel.hours/24,ahead=Math.floor(arrival),hard:string[]=[];
    const f=offer?null:ahead<=7?forecast(data,input.crop,m.id,input.asOf,ahead):null;if(!offer&&(!f||f.estimatePerKg===null))hard.push('Insufficient history or arrival beyond seven-day forecast horizon');
    if(offer&&(input.asOf<offer.fields.validFrom||addDays(input.asOf,ahead)>offer.fields.validUntil))hard.push('Buyer offer outside human-confirmed validity window');
    if(offer&&offer.fields.maxArrivalDays!==null&&ahead>offer.fields.maxArrivalDays)hard.push('Arrival exceeds human-confirmed delivery deadline');
    const shelf=estimateSpoilage(input.lifeDays,travel.hours/24,hold,weather.tempC),capacity=checkStorage(storageWorld,'scenario',input.kg,0,hold);
    if(hold&&!capacity.feasible)hard.push('Storage capacity insufficient');const eligible=riskEligibility(shelf.remainingHours,input.risk,hard);
    const reference=offer?.fields.pricePerKg??f?.estimatePerKg??null;const price=reference===null?null:reference*(1+input.priceChangePercent/100),saleable=input.kg*(1-shelf.fractionLost),storage=round(input.kg*input.storageRate*hold),gross=price===null?null:round(saleable*price);
    candidates.push({id:`${m.id}:${hold}`,action:hold?'store':m.id===destinations[0].id?'sell_now':'reroute',marketId:m.id,marketName:m.name,holdDays:hold,arrivalDate:addDays(input.asOf,ahead),arrivalDays:arrival,expectedPrice:price,priceBasis:offer?(input.priceChangePercent?'human_confirmed_offer_with_scenario_shock':'human_confirmed_offer'):'synthetic_bounded_forecast',distanceKm:m.km,transitHours:travel.hours,remainingHours:shelf.remainingHours,saleableKg:saleable,spoiledKg:input.kg-saleable,gross,transport:travel.cost,storage,net:gross===null?null:round(gross-travel.cost-storage),eligible:eligible.eligible&&gross!==null,reasons:eligible.reasons});
  }
  candidates.sort((a,b)=>(b.net??-Infinity)-(a.net??-Infinity)||a.holdDays-b.holdDays||a.id.localeCompare(b.id));
  return {mode:'SYNTHETIC_MANDI' as const,label:MANDI_LABEL,offerProvenance:offer?{id:offer.id,confirmedAt:offer.confirmedAt,sha256:offer.sha256,warnings:offer.warnings,scope:'Human-entered scenario terms applied to a simulated date, not historically verified evidence'}:null,input,weather,candidates,best:candidates.find(c=>c.eligible)??null,comparisons:data.markets.map(m=>({market:m,latest:history(data,input.crop,m.id,input.asOf,1)[0],forecast:forecast(data,input.crop,m.id,input.asOf,7),history:history(data,input.crop,m.id,input.asOf,input.historyDays)})),assumptions:{origin:'Fictional Jaipur-area farm point',road:'Haversine × 1.3, 40 km/h, four-hour handling; not actual road routing',rain:'Synthetic as-of rain adds 24h; extra-delay control adds 0–2 days',storage:'Declared cost/capacity, cold aging 25%; no shared reservations in this workspace',weather:'As-of temperature held constant; future generated weather hidden from decisions',forecast:'Seven-day maximum, ±35% bound; no future observations used',spoilage:'Uncalibrated original linear heat model',financial:'Gross − transport − storage; estimates, not realized benefits'}};
}
