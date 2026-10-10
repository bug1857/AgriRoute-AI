import {planLot,defaultScenario,type Reservation,type Risk,type Scenario} from './planner';
import {world,geo,type Lot} from './world';
import {simulate,plannerPolicy} from './simulator';
export function benchmarkReservations(lotId:number){let leases:Reservation[]=[];simulate(world,geo,{...plannerPolicy,choose:c=>{if(c.lot.lot_id===lotId)leases=structuredClone(c.reservations);return plannerPolicy.choose(c);}});return leases;}
export function analyzeWhatIf(lot:Lot,risk:Risk,scenario:Scenario,market='all',reservations:Reservation[]=[]){
 const select=(s:Scenario)=>{const p=planLot(world,geo,lot,risk,s,reservations);return {...p,best:p.candidates.find(c=>c.eligible&&(market==='all'||c.market===market))??null};};
 const baseline=select(defaultScenario),changed=select(scenario);
 const scan=(axis:keyof Scenario,min:number,max:number,step:number)=>{
  const switches:{from:number;to:number;before:string|null;after:string|null;beforeAction:string|null;afterAction:string|null}[]=[],points=new Set<number>(Array.from({length:Math.round((max-min)/step)+1},(_,i)=>Number((min+i*step).toFixed(4))));
  if(axis!=='additionalRainDays'){
   const low=select({...scenario,[axis]:min}).candidates.filter(c=>c.eligible&&(market==='all'||c.market===market)),high=select({...scenario,[axis]:max}).candidates;
   const raw=(c:typeof low[number],value:number)=>axis==='priceChangePercent'?c.saleableKg*c.expectedPrice-c.transport-c.storage:c.gross-c.transport-lot.kg*world.storage.find(s=>s.region===lot.region)!.cost_per_kg_day*c.storeDays*value;
   const lines=low.map(c=>{const end=high.find(x=>x.id===c.id)!;return {start:raw(c,min),slope:(raw(end,max)-raw(c,min))/(max-min)};});
   // All engine-derived pair crossings and rounding bands supplement the grid, including narrow/non-monotonic alternatives.
   for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
    const slope=lines[i].slope-lines[j].slope;if(Math.abs(slope)<1e-12)continue;const cross=min+(lines[j].start-lines[i].start)/slope,band=.021/Math.abs(slope);if(cross+band<min||cross-band>max)continue;
    const center=Math.min(max,Math.max(min,cross)),profit=lines[i].start+lines[i].slope*(center-min),highest=Math.max(...lines.map(l=>l.start+l.slope*(center-min)));if(highest-profit>.042)continue;
    const left=Math.max(min,cross-band),right=Math.min(max,cross+band);for(const p of [left,center,right])points.add(p);
    // Enumerate paise-rounding events near competitive crossings; a single binary search misses repeated tie reversals.
    for(let k=0;k<lines.length;k++){
     const c=low[k],rate=lot.kg*world.storage.find(s=>s.region===lot.region)!.cost_per_kg_day*c.storeDays,base=axis==='priceChangePercent'?lines[k].start+c.transport+c.storage:rate*min,derivative=axis==='priceChangePercent'?lines[k].slope:rate;if(derivative<=0)continue;
     const first=Math.ceil((base+derivative*(left-min))*100-.5),last=Math.floor((base+derivative*(right-min))*100-.5);if(last-first>200000)throw new Error('Rounding-sensitive analysis exceeds bounded work; choose a narrower market comparison');
     for(let cent=first;cent<=last;cent++){const p=min+((cent+.5)/100-base)/derivative;for(const offset of [-1e-9,0,1e-9])points.add(Math.min(max,Math.max(min,p+offset)));}
    }
   }
  }
  const sorted=[...points].sort((a,b)=>a-b),samples=axis==='additionalRainDays'?sorted:sorted.flatMap((p,i)=>i?[ (sorted[i-1]+p)/2,p]:[p]);let previous=select({...scenario,[axis]:min}).best,from=min;
  for(const v of samples.slice(1)){const next=select({...scenario,[axis]:v}).best;if(next?.id!==previous?.id){const before=previous;let left=from,right=v,after=next;if(axis!=='additionalRainDays')while(right-left>1e-5){const mid=(left+right)/2,m=select({...scenario,[axis]:mid}).best;if(m?.id===before?.id)left=mid;else{right=mid;after=m;}}switches.push({from:left,to:right,before:before?.id??null,after:after?.id??null,beforeAction:before?.action??null,afterAction:after?.action??null});}previous=next;from=v;}
  return {axis,min,max,resolution:axis==='additionalRainDays'?1:1e-5,switches};
 };
 return {kind:'deterministic_estimated_sensitivity',baseline:baseline.best,changed:changed.best,deltaNet:baseline.best&&changed.best?Math.round((changed.best.net-baseline.best.net)*100)/100:null,deltaSpoiledKg:baseline.best&&changed.best?changed.best.spoiledKg-baseline.best.spoiledKg:null,eligibleCount:changed.candidates.filter(c=>c.eligible&&(market==='all'||c.market===market)).length,price:scan('priceChangePercent',-50,50,.1),storage:scan('storageCostMultiplier',.5,3,.05),rain:scan('additionalRainDays',0,2,1),scope:reservations.length?'Includes supplied synthetic regional reservations':'Single-lot estimate; no competing reservations',method:'Engine-evaluated brackets, competitive pair crossings and enumerated paise-rounding events; refined to stated resolution. Ties use existing candidate ordering; brackets are not exact continuous thresholds. No provider calls or realized-benefit claims.'};
}
