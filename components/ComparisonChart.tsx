type Row={label:string;value:number|null};
export default function ComparisonChart({title,rows,unit='INR',note}:{title:string;rows:Row[];unit?:'INR'|'kg';note:string}){
  const available=rows.filter((r):r is Row&{value:number}=>r.value!==null&&Number.isFinite(r.value));
  if(!available.length)return null;
  const max=Math.max(...available.map(r=>Math.abs(r.value)),1),signed=available.some(r=>r.value<0);
  const format=(value:number)=>unit==='INR'?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(value):`${new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(value)} kg`;
  return <figure className="comparison-chart"><figcaption>{title}</figcaption><p>{note}</p><ul>{available.map(r=>{const width=Math.abs(r.value)/max*(signed?50:100);return <li key={r.label}><div><span>{r.label}</span><strong>{format(r.value)}</strong></div><div className={`comparison-track ${signed?'signed':''}`} aria-hidden="true"><i className={r.value<0?'negative':''} style={{width:`${width}%`,left:`${signed?(r.value<0?50-width:50):0}%`}}/></div></li>;})}</ul><small>{signed?'Zero at centre; negative values extend left.':'Bars start at zero.'} Shared scale within this chart. Unavailable values are omitted.</small></figure>;
}
