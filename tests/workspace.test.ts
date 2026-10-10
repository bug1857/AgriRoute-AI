import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WorkspaceTabs,{nextTabIndex} from '../components/WorkspaceTabs';

test('workspace tabs expose labelled peer panels and retain hidden form content',()=>{
  const html=renderToStaticMarkup(createElement(WorkspaceTabs,{id:'test',label:'Decision workspace',tabs:[{id:'decision',label:'Decision',content:createElement('input',{defaultValue:'reviewed input'})},{id:'gemini',label:'Gemini',content:createElement('p',null,'Authentic evidence')}]}));
  assert.match(html,/role="tablist" aria-label="Decision workspace"/);
  assert.match(html,/id="test-decision-tab" aria-controls="test-decision-panel" aria-selected="true" tabindex="0"/);
  assert.match(html,/id="test-gemini-tab" aria-controls="test-gemini-panel" aria-selected="false" tabindex="-1"/);
  assert.match(html,/id="test-decision-panel" aria-labelledby="test-decision-tab"><input value="reviewed input"/);
  assert.match(html,/id="test-gemini-panel" aria-labelledby="test-gemini-tab" hidden=""><p>Authentic evidence/);
});
test('tab keyboard navigation wraps and supports Home/End without consuming unrelated keys',()=>{
  assert.equal(nextTabIndex(0,'ArrowLeft',4),3);assert.equal(nextTabIndex(3,'ArrowRight',4),0);
  assert.equal(nextTabIndex(1,'ArrowRight',4),2);assert.equal(nextTabIndex(2,'ArrowLeft',4),1);
  assert.equal(nextTabIndex(2,'Home',4),0);assert.equal(nextTabIndex(0,'End',4),3);
  assert.equal(nextTabIndex(0,'Tab',4),null);assert.equal(nextTabIndex(0,'Enter',4),null);
});
