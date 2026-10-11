import Link from 'next/link';
import { ArrowRight, Leaf, ShieldCheck } from 'lucide-react';
import { mandiData } from '@/lib/mandi-data';
import { planMandi, type MandiInput } from '@/lib/mandi';
import { actionLabels } from '@/lib/planner';

const input: MandiInput = {
  crop: 'tomato', marketId: 'all', asOf: '2026-10-10', kg: 1000,
  lifeDays: 5, risk: 'balanced', holdDays: 3, historyDays: 30,
  storageRate: .3, storageCapacityKg: 5000, priceChangePercent: 0, extraRainDays: 0,
};
const plan = planMandi(mandiData, input);
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
const kg = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);

export default function JuryDemo() {
  const recommendations = (['sell_now', 'store', 'reroute'] as const).map(action => ({
    action,
    candidate: plan.candidates.filter(c => c.action === action && c.eligible).sort((a, b) => (b.net ?? -Infinity) - (a.net ?? -Infinity))[0],
  }));
  const best = plan.best;
  return <section id="jury-demo" className="jury-page">
    <div className="jury-intro"><span className="eyebrow">PUBLIC JURY PREVIEW · NO ACCOUNT NEEDED</span><h2>See both sides of the decision.</h2><p>Review the coordinator’s calculated options, then see how the same sample recommendation appears in the Hindi Farmer view.</p><div className="jury-notice"><ShieldCheck size={19}/><span>Read-only sample · no sign-in, private records, edits, or approvals. This is synthetic demonstration data, not a real farmer or buyer record.</span></div><nav className="jury-tabs" aria-label="Jury preview sections"><a href="#coordinator-preview">Coordinator sample <span>↓</span></a><a href="#farmer-preview">Hindi Farmer sample <span>↓</span></a></nav></div>
    <section id="coordinator-preview" className="jury-section"><div className="jury-section-head"><div><span className="eyebrow">COORDINATOR · READ ONLY</span><h3>Compare the feasible paths</h3></div><span className="synthetic-badge">{plan.label}</span></div><div className="jury-lot"><span className="jury-crop"><Leaf size={22}/></span><div><strong>Tomato · Sample harvest</strong><p>1,000 kg · 5 days declared usable life · Balanced risk</p></div><span>Planning date · {input.asOf}</span></div><div className="jury-options">{recommendations.map(({action,candidate})=><article key={action} className={best?.action===action&&best.marketId===candidate?.marketId&&best.holdDays===candidate?.holdDays?'jury-option-best':''}><small>{actionLabels[action]}</small>{candidate?<><strong>{money(candidate.net!)}</strong><p>{candidate.marketName}</p><p>{kg(candidate.saleableKg)} kg modeled saleable · {kg(candidate.spoiledKg)} kg modeled loss</p><p>{candidate.holdDays ? `${candidate.holdDays} storage days` : `${candidate.distanceKm.toFixed(1)} km modeled route`}</p></>:<><strong>Unavailable</strong><p>No feasible option under the current assumptions.</p></>}</article>)}</div>{best&&<p className="jury-calc-note">Best eligible option in this sample: <strong>{actionLabels[best.action]} · {best.marketName} · {money(best.net!)}</strong>. Values are calculated by the deterministic planner from the synthetic dataset. They are estimates, not realized proceeds.</p>}<p className="jury-readonly-foot">The protected coordinator workspace still requires an authorized account for creating lots, editing offers, saving decisions, and approving records.</p></section>
    <section id="farmer-preview" className="jury-section jury-farmer" lang="hi"><div className="jury-section-head"><div><span className="eyebrow">FARMER · HINDI SAMPLE</span><h3>किसान के लिए योजना का नमूना</h3></div><span className="synthetic-badge">केवल प्रदर्शन</span></div><div className="jury-notice"><ShieldCheck size={19}/><span>यह सार्वजनिक नमूना है, किसी किसान का स्वीकृत या निजी निर्णय नहीं।</span></div><h4>टमाटर · काल्पनिक फसल · {input.kg} किलोग्राम</h4>{best&&<><div className="jury-farmer-action"><span>सुझाया गया विकल्प</span><strong>{best.action==='sell_now'?'अभी बेचें':best.action==='store'?'भंडारण करें':'दूसरी मंडी भेजें'}</strong><p>{best.marketName} (काल्पनिक मंडी परिदृश्य)</p><p>योजना की तारीख: {input.asOf} · भंडारण: {best.holdDays} दिन</p></div><dl className="jury-finances">{[['अनुमानित बिक्री राशि',money(best.gross!)],['परिवहन खर्च',money(best.transport)],['भंडारण खर्च',money(best.storage)],['अनुमानित FPO शुद्ध राशि',money(best.net!)],['अनुमानित खराबा',`${kg(best.spoiledKg)} किलोग्राम`],['बिकने योग्य वजन',`${kg(best.saleableKg)} किलोग्राम`]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="jury-readonly-foot">यह अनुमान है, निश्चित किसान भुगतान नहीं। कीमत, वाहन और भंडारण की उपलब्धता की पुष्टि करें।</p></>}</section>
    <div className="jury-footer"><span>AgriRoute AI · Team bnybug · Synthetic demonstration</span><Link href="/demo">Open interactive Demo Lab <ArrowRight size={16}/></Link></div>
  </section>;
}
