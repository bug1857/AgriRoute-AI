// Execution awaits restoration of browser permission. These tests never call Gemini inference.
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { world,geo,money } from "../../lib/world";
import { defaultScenario,planLot } from "../../lib/planner";

const lot=world.lots.find(l=>l.crop==="tomato"&&planLot(world,geo,l,"balanced").best)!;
const url=`/demo?lot=${lot.lot_id}`;
test("navigation from landing to demo and home",async({page})=>{
  await page.goto("/");await page.getByRole("link",{name:"Explore the demo",exact:true}).click();await expect(page).toHaveURL(/\/demo$/);
  await page.getByRole("link",{name:"AgriRoute AI home"}).click();await expect(page.getByRole("heading",{level:1})).toContainText("Every harvest.");
  await page.getByRole("link",{name:"Our approach"}).click();await expect(page).toHaveURL(/#methodology$/);
  await page.goto("/demo");await page.getByRole("tab",{name:"Gemini",exact:true}).click();await expect(page.getByTestId("agent-panel")).toBeVisible();
  await page.keyboard.press("ArrowLeft");await expect(page.getByRole("tab",{name:"Decision",exact:true})).toBeFocused();await expect(page.getByTestId("agent-panel")).not.toBeVisible();
  await page.getByRole("link",{name:"Live assisted ↗",exact:true}).click();await expect(page).toHaveURL(/\/live$/);
  await expect(page.getByRole("heading",{level:1})).toContainText("Real evidence.");await expect(page.locator(".live-banner")).toContainText("mandi fetching deferred");
  await page.getByRole("tab",{name:"Locations",exact:true}).click();await expect(page.getByText("Pickup & market gate coordinates",{exact:false})).toBeVisible();await page.getByRole("tab",{name:"Lot",exact:true}).click();
  await page.getByLabel("Exact variety").fill("Local");await page.getByRole("tab",{name:"Prices",exact:true}).click();await page.getByRole("tab",{name:"Lot",exact:true}).click();await expect(page.getByLabel("Exact variety")).toHaveValue("Local");
  await page.getByLabel("Exact variety").focus();await expect(page.getByLabel("Exact variety")).toBeFocused();await page.keyboard.press("Tab");await expect(page.getByLabel("Assumed usable life (days)")).toBeFocused();
  await expect(page.getByRole("button",{name:"Recalculate · no provider calls",exact:true})).toBeDisabled();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.route("**/api/live",r=>r.fulfill({status:503,contentType:"application/json",body:'{"error":"Mock setup failure"}'}));await page.reload();await expect(page.getByRole("status")).toContainText("setup unavailable");
  await page.unroute("**/api/live");await page.getByRole("button",{name:"Retry setup"}).click();await expect(page.getByLabel("Exact variety")).toBeVisible();
  await page.getByRole("link",{name:"Return to simulation ↗",exact:true}).click();await expect(page).toHaveURL(/\/demo#evaluation$/);
});
test("map marker selects its bound lot",async({page})=>{
  await page.goto(url);const target=world.lots.find(l=>l.lot_id!==lot.lot_id)!;
  await page.getByRole("button",{name:`Select lot ${target.lot_id+1}, ${target.crop}`,exact:true}).click();
  await expect(page.getByRole("button",{name:`Open ${target.crop[0].toUpperCase()+target.crop.slice(1)} lot ${target.lot_id+1}`,exact:true})).toHaveAttribute("aria-pressed","true");
  await expect(page.locator(".selected-lot-heading")).toContainText(`Lot ${String(target.lot_id+1).padStart(2,"0")}`);
});
test("crop and region filters restrict lots and select a matching lot",async({page})=>{
  await page.goto(url);await page.getByLabel("Crop filter").selectOption(lot.crop);await page.getByLabel("Region filter").selectOption(lot.region);
  const matches=world.lots.filter(l=>l.crop===lot.crop&&l.region===lot.region);
  await expect(page.locator(".lot-list .lot-row")).toHaveCount(matches.length);
  for(const row of await page.locator(".lot-list .lot-row").all()){await expect(row).toContainText(lot.region);await expect(row).toContainText("Tomato");}
});
test("risk slider changes eligibility using actual margins",async({page})=>{
  await page.goto(url);
  for(const [value,risk] of [["0","conservative"],["1","balanced"],["2","adventurous"]] as const){
    await page.getByLabel("Risk appetite").fill(value);
    const plan=planLot(world,geo,lot,risk);
    await expect(page.getByTestId("risk-summary")).toContainText(`${plan.candidates.filter(c=>c.eligible).length} eligible options`);
    await expect(page.getByTestId("net-value")).toHaveText(plan.best?money(plan.best.net):"—");
  }
});
test("what-if controls change the displayed calculated net",async({page})=>{
  await page.goto(url);await page.getByLabel("Market price change").fill("-20");await page.getByLabel("Additional rain delay").selectOption("1");await page.getByLabel("Storage cost multiplier").selectOption("1.5");
  const best=planLot(world,geo,lot,"balanced",{priceChangePercent:-20,additionalRainDays:1,storageCostMultiplier:1.5}).best;
  await expect(page.getByTestId("net-value")).toHaveText(best?money(best.net):"—");await expect(page.locator(".scenario-change")).toBeVisible();
});
test("quote download matches current inputs and calculated recommendation",async({page})=>{
  await page.goto(url);await page.getByLabel("Market price change").fill("-10");
  const pending=page.waitForEvent("download");await page.getByRole("button",{name:"Export quote",exact:true}).click();
  const download=await pending;const file=await download.path();expect(file).not.toBeNull();const quote=JSON.parse(await readFile(file!,"utf8"));
  expect(quote.lot.lot_id).toBe(lot.lot_id);expect(quote.scenario.priceChangePercent).toBe(-10);
  expect(quote.recommendation).toEqual(planLot(world,geo,lot,"balanced",{...defaultScenario,priceChangePercent:-10}).best);
  expect(quote.notRealizedBenefits).toBe(true);expect(quote.aiStatus).toBe("not_used_in_this_quote");
});
test("mobile layout has no overflow and primary controls are usable",async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto(url);
  await expect(page.getByLabel("Crop filter")).toBeVisible();await expect(page.getByTestId("net-value")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole("button",{name:"Reset demo"}).click();await page.screenshot({path:"artifacts/browser/demo-mobile.png",fullPage:true});
});
test("Gemini replay and evaluation preserve provenance without critical runtime errors",async({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
  const inference:string[]=[];page.on("request",r=>{if(r.method()==="POST"&&r.url().includes("/api/agent"))inference.push(r.url());});
  const readiness=await (await page.request.get("/api/agent")).json();
  expect(readiness.ready).toBe(false);expect(readiness.record).not.toBeNull();
  const t=readiness.record.trace;
  await page.goto(`/demo?lot=${t.input.lotId}`);
  await page.getByRole("tab",{name:"Gemini",exact:true}).click();const panel=page.getByTestId("agent-panel");await expect(panel).toContainText("Authentic SDK record");
  await expect(panel.getByRole("button",{name:"Run Gemini · one free-tier attempt"})).toBeDisabled();
  await panel.getByRole('tab',{name:/Tool receipts/}).click();const receipts=panel.locator('details.agent-trace:visible');if(!await receipts.evaluate(e=>e.hasAttribute('open')))await panel.getByText("Actual tool requests and results",{exact:true}).click();
  for(const tool of t.tools){await expect(panel.locator(".agent-trace summary").filter({hasText:`#${tool.index} ${tool.name}`})).toBeVisible();}
  const pending=page.waitForEvent("download");await panel.getByRole("button",{name:"Export trace",exact:true}).click();
  const file=await (await pending).path();expect(file).not.toBeNull();expect(JSON.parse(await readFile(file!,"utf8"))).toEqual(readiness.record);
  await page.getByRole("tab",{name:"Decision",exact:true}).click();await page.getByLabel("Risk appetite").fill("0");await page.getByRole("tab",{name:"Gemini",exact:true}).click();await expect(panel).toContainText("Historical replay for its original lot, risk and scenario");
  const frozen=await (await page.request.get("/evaluation/benchmark.json")).json();
  const rupees=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
  for(const id of ["A","B"]){await expect(page.getByTestId(`evaluation-${id}-net`)).toHaveText(rupees(frozen[id].totals.net));}
  await expect(page.locator("#evaluation")).toContainText("INCOMPLETE");
  await page.goto(url);await expect(page.getByRole("button",{name:`Select lot ${lot.lot_id+1}, ${lot.crop}`,exact:true})).toBeVisible();
  await page.getByLabel("Risk appetite").fill("2");await page.getByLabel("Market price change").fill("10");
  await page.getByRole("tab",{name:"Gemini",exact:true}).click();await expect(page.getByTestId("agent-panel")).toBeVisible();expect(errors).toEqual([]);
  expect(inference).toEqual([]);
  await page.screenshot({path:"artifacts/browser/demo-desktop.png",fullPage:true});
});
