import { ArrowDownToLine, FlaskConical } from "lucide-react";
import benchmark from "@/public/evaluation/benchmark.json";
import manifest from "@/public/evaluation/manifest.json";
import ComparisonChart from './ComparisonChart';

const rupees=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const kg=(n:number)=>new Intl.NumberFormat("en-IN",{maximumFractionDigits:2}).format(n);
export default function Evaluation(){
  const a=benchmark.A.totals!,b=benchmark.B.totals!,delta=benchmark.delta;
  const counts:Record<string,number>=benchmark.C.classification;
  return <section id="evaluation" className="explorer-shell evaluation" aria-labelledby="evaluation-title">
    <div className="demo-title"><div><span className="eyebrow"><FlaskConical size={14}/> FROZEN SYNTHETIC EXPERIMENT</span><h2 id="evaluation-title">The outcome. <em>Including the tradeoffs.</em></h2><p>30 lots · 30 days · identical initial resources · Balanced policy · seed 42</p></div><a className="button-outline" href="/evaluation/benchmark.json" download><ArrowDownToLine size={14}/> Download evidence</a></div>
    <div className="evaluation-delta"><div><span>Planner − nearest-market baseline</span><strong data-testid="evaluation-net-delta">{delta.netRupees>=0?"+":""}{rupees(delta.netRupees)}</strong><small>Realized net proceeds inside the simulation</small></div><div><span>Kilograms saved vs baseline</span><strong className={delta.kgSaved<0?"negative-result":""} data-testid="evaluation-kg-saved">{kg(delta.kgSaved)} kg</strong><small>{delta.kgSaved<0?"More spoilage. This is a negative result.":"Less spoilage inside the simulation."}</small></div><p>The planner maximizes expected net proceeds. It does not guarantee lower spoilage. These are synthetic experimental outcomes, not measured farmer income or field impact.</p></div>
    <div className="evaluation-table-wrap" tabIndex={0} role="region" aria-label="Policy comparison, scroll horizontally on narrow screens"><table className="evaluation-table"><caption>Actual settlement totals after transport and storage; predicted quotes are separate.</caption><thead><tr><th scope="col">Policy</th><th scope="col">Net proceeds</th><th scope="col">Sold kg</th><th scope="col">Spoiled kg</th><th scope="col">Unsold kg</th><th scope="col">Coverage</th></tr></thead><tbody>
      {[benchmark.A,benchmark.B].map(row=><tr key={row.id}><th scope="row">{row.id} · {row.name}</th><td data-testid={`evaluation-${row.id}-net`}>{rupees(row.totals!.net)}</td><td>{kg(row.totals!.soldKg)}</td><td>{kg(row.totals!.spoiledKg)}</td><td>{kg(row.totals!.unsoldKg)}</td><td>{row.evaluatedLots}/{row.cohortLots} · COMPLETE</td></tr>)}
      <tr><th scope="row">C · Genuine Gemini</th><td colSpan={4}>Full-cohort results unavailable</td><td>{benchmark.C.evaluatedLots}/{benchmark.C.cohortLots} · INCOMPLETE</td></tr>
    </tbody></table></div>
    <div className="evaluation-charts"><ComparisonChart title="Realized simulated net proceeds" rows={[{label:'A · Nearest market',value:a.net},{label:'B · Deterministic planner',value:b.net}]} note="After transport and storage. Policy C is incomplete and is not plotted."/><ComparisonChart title="Spoilage — lower is better" unit="kg" rows={[{label:'A · Nearest market',value:a.spoiledKg},{label:'B · Deterministic planner',value:b.spoiledKg}]} note="The planner earns more but loses more kilograms. These are synthetic outcomes."/></div>
    <p className="evaluation-note">Policy C: {counts.gemini_success??0} authentic exact-match success; {counts.missing_trace??0} missing traces; {counts.fallback??0} fallbacks; {counts.model_failed??0} model failures. Only an isolated replay is available; shared-resource cohort comparison is incomplete. Further inference is locked. This evaluation made zero provider calls.</p>
    <details className="assumptions"><summary>Costs, reproduction & scientific boundaries</summary><div>
      <p><b>A:</b> gross {rupees(a.gross)} − transport {rupees(a.transport)} − storage {rupees(a.storage)} = net {rupees(a.net)}.<br/><b>B:</b> gross {rupees(b.gross)} − transport {rupees(b.transport)} − storage {rupees(b.storage)} = net {rupees(b.net)}.</p>
      <p><b>Conservation:</b> each world starts with {kg(a.initialKg)} kg. Initial = sold + spoiled + unsold; numerical tolerance 0.000001 kg. All 30 lots settled in each A/B world; failures remain visible in the downloaded ledger.</p>
      <p><b>Evidence boundary:</b> prices and weather through the harvest day only; daily observations assumed available at the start of that day. Settlement uses the actual arrival-day price, dispatch-day rain delay and cumulative daily heat exposure. Explorer controls change individual predicted quotes, not this frozen Balanced benchmark.</p>
      <p><b>Capacity:</b> independent worlds reserve original lot weight until departure or observed expiry. Half-open intervals release capacity before harvests at the same instant. Spoiled weight is never sold or counted twice.</p>
      <p><b>Limitations:</b> fictional geography and synthetic transport; uncalibrated linear spoilage and cold-storage assumptions. No real road, live mandi or measured impact claims.</p>
      <p><b>Reproduce:</b> <code>npm run evaluate</code> then <code>npm run evaluate:check</code>. No inference calls. <a href="/evaluation/manifest.json" download>Download integrity manifest ↗</a></p>
      <p><b>Experiment:</b> <code>{benchmark.experimentId}</code><br/><b>Artifact SHA256:</b> <code>{manifest.artifactSha256}</code><br/><b>Fixture SHA256:</b> <code>{benchmark.identifiers.fixtureSha256}</code></p>
    </div></details>
  </section>;
}
