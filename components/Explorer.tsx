"use client";
import WhatIfAnalysis from './WhatIfAnalysis';
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Check, ChevronDown, CloudRain, CloudSun, Download, FlaskConical, Info, Leaf, MapPin, RotateCcw, Route, ShieldCheck, SlidersHorizontal, Snowflake, Sprout, Timer, Wheat } from "lucide-react";
import LotMap from "./LotMap";
import AgentPanel from "./AgentPanel";
import WorkspaceTabs from "./WorkspaceTabs";
import { world,geo,cropLabels,money,quantity,source } from "@/lib/world";
import { planLot,actionLabels,riskMargins,shelfLeft,getWeather,defaultScenario,type Risk,type Action,type Candidate } from "@/lib/planner";

const risks:Risk[]=["conservative","balanced","adventurous"];
const riskNames={conservative:"Conservative",balanced:"Balanced",adventurous:"Adventurous"};
const actions:Action[]=["sell_now","store","reroute"];
const actionIcons={sell_now:Sprout,store:Snowflake,reroute:Route};
const cropIcons={tomato:"◉",onion:"◍",mango:"◆",potato:"●"};
const initialLot=world.lots.find(l=>l.crop==="tomato"&&planLot(world,geo,l,"balanced").best)??world.lots.find(l=>planLot(world,geo,l,"balanced").best)!;

export default function Explorer({initialId}: {initialId?:number}) {
  const [id,setId]=useState(initialId??initialLot.lot_id);
  const [crop,setCrop]=useState("all");const [region,setRegion]=useState("all");
  const [risk,setRisk]=useState<Risk>("balanced");
  const [price,setPrice]=useState(0);const [rain,setRain]=useState(0);const [storage,setStorage]=useState(1);
  const [inspectedAction,setInspectedAction]=useState<Action|null>(null);
  const [exportStatus,setExportStatus]=useState("");
  const lot=world.lots.find(l=>l.lot_id===id)!;
  const visible=useMemo(()=>world.lots.filter(l=>(crop==="all"||l.crop===crop)&&(region==="all"||l.region===region)),[crop,region]);
  const scenario=useMemo(()=>({priceChangePercent:price,additionalRainDays:rain,storageCostMultiplier:storage}),[price,rain,storage]);
  const plan=useMemo(()=>planLot(world,geo,lot,risk,scenario),[lot,risk,scenario]);
  const balanced=useMemo(()=>planLot(world,geo,lot,"balanced",scenario),[lot,scenario]);
  const unmodified=useMemo(()=>planLot(world,geo,lot,risk,defaultScenario),[lot,risk]);
  const eligible=plan.candidates.filter(c=>c.eligible);
  const marginExcluded=plan.candidates.filter(c=>!c.eligible&&!c.hardReasons.length&&c.remainingHours>0);
  const urgencyHours=shelfLeft(lot.shelf_life_days,plan.weather.temp_c)*24;
  const urgentCount=visible.filter(l=>shelfLeft(l.shelf_life_days,getWeather(world,l.region,l.harvest_day).temp_c)*24<=48).length;
  const balancedIds=new Set(balanced.candidates.filter(c=>c.eligible).map(c=>c.id));
  const added=eligible.filter(c=>!balancedIds.has(c.id)).length;
  const removed=balanced.candidates.filter(c=>c.eligible&&!eligible.some(a=>a.id===c.id)).length;
  const options=actions.map(action=>plan.candidates.find(c=>c.action===action&&c.eligible)??plan.candidates.find(c=>c.action===action)!);
  const inspected=inspectedAction?options.find(c=>c.action===inspectedAction)!:plan.best??options[0];
  const shocked=price!==0||rain!==0||storage!==1;
  function selectLot(nextId:number){setId(nextId);setInspectedAction(null);setExportStatus("");}
  function filter(nextCrop:string,nextRegion:string){setCrop(nextCrop);setRegion(nextRegion);const matches=world.lots.filter(l=>(nextCrop==="all"||l.crop===nextCrop)&&(nextRegion==="all"||l.region===nextRegion));if(matches.length&&!matches.some(l=>l.lot_id===id))selectLot(matches[0].lot_id);}
  function reset(){setCrop("all");setRegion("all");setRisk("balanced");setPrice(0);setRain(0);setStorage(1);selectLot(initialLot.lot_id);}
  function exportQuote(){
    const evidence={kind:"synthetic_deterministic_quote",notRealizedBenefits:true,aiStatus:"not_used_in_this_quote",datasetSha256:source.sha256,lot,risk,scenario,recommendation:plan.best,candidates:plan.candidates};
    const url=URL.createObjectURL(new Blob([JSON.stringify(evidence,null,2)],{type:"application/json"}));
    const anchor=document.createElement("a");anchor.href=url;anchor.download=`agriroute-lot-${id+1}-quote.json`;anchor.click();URL.revokeObjectURL(url);setExportStatus("Quote downloaded; no record was saved to the cloud.");
  }
  return <div className="explorer-shell">
    <div className="demo-title"><div><span className="eyebrow">THE DEMO LAB <span className="eyebrow-line"/> ORIGINAL PROJECT 1</span><h1>Your harvest. <em>Your next move.</em></h1><p>Explore the trade-offs. Follow the numbers. Choose with clarity.</p></div><div className="demo-title-actions"><Link href="/live" className="button-outline">Live assisted ↗</Link><Link href="/mandi" className="button-outline">Synthetic mandi ↗</Link><span className="synthetic-badge"><FlaskConical size={14}/> Synthetic world · seed 42</span><button className="button-outline" onClick={reset}><RotateCcw size={15}/> Reset demo</button></div></div>
    <div className="lab-overview"><div><Wheat size={20}/><span><strong>{visible.length}</strong> lots in view</span></div><div><Leaf size={20}/><span><strong>{quantity(visible.reduce((s,l)=>s+l.kg,0))}</strong> kg harvested</span></div><div><Timer size={20}/><span><strong>{urgentCount}</strong> lots within 48h usable life</span></div><span className="overview-caption">Harvest-day snapshots · fictional Jaipur-area locations</span></div>
    <div className="explorer-grid">
      <section className="harvest-panel" aria-label="Harvest lot selection"><div className="panel-heading"><div><span className="eyebrow">01 / EXPLORE</span><h2>The harvest landscape</h2></div><MapPin size={21}/></div>
        <div className="filters"><label>Crop<select aria-label="Crop filter" value={crop} onChange={e=>filter(e.target.value,region)}><option value="all">All crops</option>{Object.entries(cropLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>Region<select aria-label="Region filter" value={region} onChange={e=>filter(crop,e.target.value)}><option value="all">All regions</option>{["North","South","East","West"].map(r=><option key={r}>{r}</option>)}</select></label></div>
        <div className="map-frame"><LotMap lots={visible} selectedId={id} onSelect={selectLot}/><div className="map-caption"><span><i className="legend-dot urgent"/> ≤48h</span><span><i className="legend-dot"/> &gt;48h</span><span>At each lot’s harvest</span></div></div>
        <div className="lot-list-heading"><span>HARVEST LOTS</span><span>CLICK A LOT TO EXPLORE</span></div>
        <div className="lot-list" aria-label="Lot list">{visible.length?visible.map(l=>{
          const hours=shelfLeft(l.shelf_life_days,getWeather(world,l.region,l.harvest_day).temp_c)*24;
          return <button key={l.lot_id} onClick={()=>selectLot(l.lot_id)} className={`lot-row ${l.lot_id===id?"active":""}`} aria-pressed={l.lot_id===id} aria-label={`Open ${cropLabels[l.crop]} lot ${l.lot_id+1}`}><span className={`crop-symbol ${l.crop}`}>{cropIcons[l.crop]}</span><span className="lot-row-title"><strong>{cropLabels[l.crop]} <small>#{String(l.lot_id+1).padStart(2,"0")}</small></strong><small>{l.region} · {quantity(l.kg)} kg · Day {l.harvest_day}</small></span><span className={`life-tag ${hours<=48?"urgent":""}`}>{(hours/24).toFixed(1)}d left</span><ArrowUpRight size={16}/></button>;
        }):<div className="empty-state">No lots match these filters. Choose another crop or region.</div>}</div>
        <p className="panel-footnote"><Info size={13}/> Original synthetic prices are shared across crops. Map locations and transport assumptions are illustrative.</p>
      </section>
      <section className="decision-column" aria-label="Decision and calculations">
        <div className="selected-lot-heading"><div><span className="eyebrow">02 / DECIDE</span><h2>{cropLabels[lot.crop]} <span>Lot {String(id+1).padStart(2,"0")}</span></h2></div><span className={`life-tag ${urgencyHours<=48?"urgent":""}`}><Timer size={13}/> {(urgencyHours/24).toFixed(1)} days usable at harvest</span></div>
        <div className="lot-context"><span><MapPin size={14}/>{lot.region} region</span><span>{quantity(lot.kg)} kg</span><span>Harvest day {lot.harvest_day}</span><span>{plan.weather.rain?<CloudRain size={16}/>:<CloudSun size={16}/>} {plan.weather.temp_c.toFixed(1)}°C {plan.weather.rain?"· rain":"· dry"}</span></div>
        <WorkspaceTabs id="demo-decision" label="Decision workspace" tabs={[{id:"decision",label:"Decision",content:<>
        <div className={`recommendation ${plan.best?"":"no-plan"}`} data-testid="recommendation"><div className="recommendation-top"><span><span className="live-dot"/> DETERMINISTIC PLANNER</span><span><ShieldCheck size={13}/>{plan.best?"Constraints checked":"No eligible plan"}</span></div>
          <div className="recommendation-main"><div><small>BEST ELIGIBLE OPTION</small><h3>{plan.best?actionLabels[plan.best.action]:"REVIEW REQUIRED"}</h3><p>{plan.best?`${plan.best.marketName} · ${plan.best.storeDays?`store ${plan.best.storeDays} day${plan.best.storeDays===1?"":"s"}, then dispatch`:"dispatch on harvest day"}`:"Your current policy excludes every candidate."}</p></div><div className="net-value"><small>ESTIMATED NET PROCEEDS</small><strong data-testid="net-value">{plan.best?money(plan.best.net):"—"}</strong><span>Forecast quote · not realized income</span></div></div>
          <div className="recommendation-details"><span><small>MODELLED DISTANCE</small><b>{plan.best?`${plan.best.distanceKm.toFixed(1)} km`:"—"}</b></span><span><small>TRANSIT + HANDLING</small><b>{plan.best?`${plan.best.transitHours.toFixed(1)} hours`:"—"}</b></span><span><small>LIFE LEFT AT ARRIVAL</small><b>{plan.best?`${plan.best.remainingHours.toFixed(1)} hours`:"—"}</b></span></div>
        </div>
        <div className="risk-panel"><div className="risk-heading"><span><SlidersHorizontal size={17}/> Your risk appetite</span><strong>{riskNames[risk]}</strong></div><input type="range" aria-label="Risk appetite" min="0" max="2" step="1" value={risks.indexOf(risk)} onChange={e=>{setRisk(risks[Number(e.target.value)]);setInspectedAction(null);}}/><div className="risk-labels"><span>Conservative · 48h</span><span>Balanced · 24h</span><span>Adventurous · 0h</span></div><p data-testid="risk-summary"><b>{eligible.length}</b> eligible options · <b>{marginExcluded.length}</b> excluded by the {riskMargins[risk]}h margin{risk!=="balanced"?` · ${added?`${added} added`:`${removed} removed`} vs Balanced`:""}</p><small>Prototype usable-life margins, not calibrated safety limits. Hard constraints always apply.</small></div>
        <div className="alternatives-heading"><h3>Three paths. Every trade-off.</h3><span>Select to inspect the calculation</span></div><div className="option-grid">{options.map(c=>{const Icon=actionIcons[c.action];return <button key={c.action} className={`option ${inspected.id===c.id?"selected":""} ${!c.eligible?"excluded":""}`} onClick={()=>setInspectedAction(c.action)} aria-pressed={inspected.id===c.id}><div><Icon size={18}/>{plan.best?.id===c.id?<span className="best-label">BEST</span>:!c.eligible?<span className="excluded-label">EXCLUDED</span>:null}</div><h4>{actionLabels[c.action]}</h4><strong>{money(c.net)}</strong><small>{c.marketName} · {c.storeDays?`${c.storeDays}d storage`:`${c.distanceKm.toFixed(1)} km`}</small><span className="option-life">{c.remainingHours.toFixed(1)}h at arrival</span></button>;})}</div>
        <Calculation candidate={inspected}/>
        <WhatIfAnalysis input={{lotId:id,risk,scenario}}/>
        <div className="whatif-panel"><div className="whatif-heading"><div><span className="eyebrow">03 / STRESS-TEST</span><h3>What if things change?</h3></div><span className="recalculated"><Check size={13}/> Recalculates instantly</span></div><div className="whatif-controls"><label><span>Market prices <b>{price>0?"+":""}{price}%</b></span><input aria-label="Market price change" type="range" min="-30" max="30" step="5" value={price} onChange={e=>setPrice(Number(e.target.value))}/></label><label>Additional rain delay<select aria-label="Additional rain delay" value={rain} onChange={e=>setRain(Number(e.target.value))}><option value="0">No extra delay</option><option value="1">+ 1 day</option><option value="2">+ 2 days</option></select></label><label>Storage cost<select aria-label="Storage cost multiplier" value={storage} onChange={e=>setStorage(Number(e.target.value))}><option value="1">Original cost</option><option value="1.5">1.5 × cost</option><option value="2">2 × cost</option></select></label></div>{shocked&&<p className="scenario-change" role="status">{plan.best&&unmodified.best?`Estimated best net changed by ${money(plan.best.net-unmodified.best.net)} vs the unmodified scenario.`:"This scenario changes eligibility; review the available options above."}</p>}</div>
        <div className="evidence-panel"><div><FlaskConical size={20}/><span><strong>Calculation evidence, without the guesswork.</strong><small>This export contains deterministic calculations, separate from any Gemini run.</small></span></div><button className="button-outline" onClick={exportQuote}><Download size={15}/> Export quote</button></div><p className="export-status" role="status">{exportStatus}</p>
        <details className="assumptions"><summary>Sources & model assumptions <ChevronDown size={16}/></summary><div><p><b>Dataset:</b> supplied Project 1, seed 42; 30 lots, five markets, 120 days. Verified against the original DOCX code.</p><p><b>Transport:</b> straight-line distance × 1.3, ₹0.035/kg/km, 40 km/h, 4h handling, 24h delay if the synthetic harvest-day weather is rainy. Not real road routing.</p><p><b>Spoilage:</b> original heat-adjusted shelf life; linear cumulative exposure, using harvest-day temperature throughout this quote. Cold storage ages at 25% of the ambient rate. These are uncalibrated synthetic assumptions.</p><p><b>Forecast:</b> trailing seven-day mean plus trend (trend capped at seven days of extrapolation); day zero uses the observed price. Future generated prices are hidden from planning.</p><p><b>Capacity:</b> individual-lot feasibility with no existing reservations in this explorer. The frozen shared-capacity 30-day A/B experiment appears below; these explorer controls do not change that benchmark.</p><p><b>Risk:</b> minimum usable-life margin at arrival of 48h / 24h / 0h. Expired stock, capacity failures and arrivals after day 29 remain excluded under every setting.</p><p><b>Evidence:</b> estimated quotes are not saved benefits or realized income. No authenticated cloud persistence. Fixture SHA256: <code>{source.sha256}</code></p></div></details>
        </>},{id:"gemini",label:"Gemini",content:<AgentPanel input={{lotId:id,risk,scenario}}/>}]}/>
      </section>
    </div><footer className="lab-footer"><span><Sprout size={16}/> AgriRoute AI · transparent harvest intelligence</span><span>Original Project 1 · synthetic demonstration · no paid API calls</span></footer>
  </div>;
}

function Calculation({candidate:c}: {candidate:Candidate}) {
  const max=Math.max(c.gross,c.transport+c.storage,1);
  return <section className="calculation"><div className="calculation-heading"><h3>The rupees, explained <span>{actionLabels[c.action]} · {c.marketName}</span></h3><span className="calculation-tag">DETERMINISTIC QUOTE</span></div>{!c.eligible&&<p className="constraint-warning"><Info size={15}/>{c.reasons.join(" · ")}</p>}<div className="money-waterfall"><div><span>Estimated sale value</span><div className="bar-track"><i style={{width:`${c.gross/max*100}%`}}/></div><b>{money(c.gross)}</b></div><div><span>Transport cost</span><div className="bar-track cost"><i style={{width:`${c.transport/max*100}%`}}/></div><b>− {money(c.transport)}</b></div><div><span>Storage cost</span><div className="bar-track cost"><i style={{width:`${c.storage/max*100}%`}}/></div><b>− {money(c.storage)}</b></div></div><div className="calculation-total"><span>Estimated net proceeds</span><strong>{money(c.net)}</strong></div><div className="weight-equation"><span>{quantity(c.saleableKg)} kg saleable</span><span><ArrowDownRight size={13}/>{quantity(c.spoiledKg)} kg modelled loss</span><span>₹{c.expectedPrice.toFixed(2)}/kg forecast</span></div></section>;
}
