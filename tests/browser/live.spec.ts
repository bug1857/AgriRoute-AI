import {test,expect} from '@playwright/test';
import {validateLiveInput} from '../../lib/live';

test('live snapshot ignores server property ordering but detects actual edited inputs',async({page})=>{
 await page.route('**/api/live',async route=>{
  if(route.request().method()!=='POST')return route.continue();
  const input=validateLiveInput(route.request().postDataJSON().input),now=new Date().toISOString();
  const unavailable={status:'UNAVAILABLE',source:'Mocked browser test',sourceUrl:'https://example.invalid',licence:'Test only',retrievedAt:now,data:null};
  await route.fulfill({json:{evidenceId:'mocked-browser-test',evidence:{version:'agriroute.live-assisted.v1',origin:input.origin,markets:input.markets,prices:unavailable,weather:unavailable,routes:{muhana:unavailable,chomu:unavailable}},result:{mode:'LIVE_ASSISTED',calculatedAt:now,input,candidates:[],bestReviewedId:null,conditionalBestId:null,assumptions:{}}}});
 });
 await page.goto('/live');await expect(page.getByLabel('Exact variety')).toBeVisible();
 await page.getByRole('button',{name:'Fetch evidence & calculate',exact:true}).click();
 await expect(page.getByText('Calculated alternatives',{exact:true})).toBeVisible();
 await expect(page.getByText('Inputs changed.',{exact:false})).toHaveCount(0);
 await page.getByLabel('Tomato weight (kg)').fill('1001');
 await expect(page.getByText('Inputs changed.',{exact:false})).toBeVisible();
});
