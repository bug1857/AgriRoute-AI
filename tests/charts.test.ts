import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ComparisonChart from '../components/ComparisonChart';
import Evaluation from '../components/Evaluation';
import benchmark from '../public/evaluation/benchmark.json';
test('financial charts retain signs, zero scale and omit unknown/nonfinite values',()=>{
  const html=renderToStaticMarkup(createElement(ComparisonChart,{title:'Quote',note:'Calculated snapshot',rows:[{label:'Gross',value:200},{label:'Deduction',value:-100},{label:'Zero',value:0},{label:'Unknown',value:null},{label:'Invalid',value:NaN}]}));
  assert.match(html,/width:50%;left:50%/);assert.match(html,/width:25%;left:25%/);assert.match(html,/-₹100\.00/);assert.match(html,/Zero at centre/);assert.doesNotMatch(html,/Unknown|Invalid/);
  assert.equal(renderToStaticMarkup(createElement(ComparisonChart,{title:'Unavailable',note:'No evidence',rows:[{label:'Missing',value:null}]})),'');
});
test('evaluation charts use frozen A/B values and explicitly withhold Policy C',()=>{
  const html=renderToStaticMarkup(createElement(Evaluation));const expected=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(benchmark.B.totals!.net);
  assert.ok(html.includes(expected));assert.match(html,/Policy C is incomplete and is not plotted/);assert.match(html,/INCOMPLETE/);assert.match(html,/Spoilage — lower is better/);assert.match(html,/More spoilage/);
});
