import { type Geography, type Lot, type World } from "./world";

export type Risk = "conservative" | "balanced" | "adventurous";
export type Action = "sell_now" | "store" | "reroute";
export const riskMargins: Record<Risk, number> = { conservative: 48, balanced: 24, adventurous: 0 };
export const actionLabels: Record<Action, string> = { sell_now: "SELL NOW", store: "STORE", reroute: "REROUTE" };
export type Scenario = { priceChangePercent: number; additionalRainDays: number; storageCostMultiplier: number };
export const defaultScenario: Scenario = { priceChangePercent: 0, additionalRainDays: 0, storageCostMultiplier: 1 };
export const assumptions = {
  transportRate: .035, roadDistanceFactor: 1.3, speedKmh: 40, handlingHours: 4,
  coldAgingFactor: .25, simulationDays: 30,
};
export type Reservation = { region: string; kg: number; fromDay: number; untilDay: number };
export type Candidate = {
  id: string; action: Action; market: string; marketName: string; storeDays: number;
  dispatchDay: number; arrivalDay: number; distanceKm: number; transitHours: number;
  expectedPrice: number; saleableKg: number; spoiledKg: number; remainingHours: number;
  gross: number; transport: number; storage: number; net: number;
  eligible: boolean; hardReasons: string[]; reasons: string[];
};

const cents = (n: number) => Math.round(n * 100) / 100;
function finite(n: number, label: string, min = 0, max = Infinity) {
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`Invalid ${label}`);
}
function validDay(day: number) {
  finite(day, "day", 0, 119);
  if (!Number.isInteger(day)) throw new Error("Day must be an integer");
}
export function validateScenario(s: Scenario) {
  finite(s.priceChangePercent, "price change", -50, 50);
  finite(s.additionalRainDays, "rain delay", 0, 2);
  finite(s.storageCostMultiplier, "storage multiplier", .5, 3);
}
export function shelfLeft(baseDays: number, temp: number) {
  finite(baseDays, "shelf life", Number.EPSILON);
  finite(temp, "temperature", -50, 70);
  return baseDays * Math.max(.2, 1 - .1 * Math.max(0, temp - 25));
}
export function estimateSpoilage(baseDays: number, ambientDays: number, coldDays: number, temp: number) {
  finite(ambientDays, "ambient duration");
  finite(coldDays, "storage duration");
  const life = shelfLeft(baseDays, temp);
  const exposure = (ambientDays + coldDays * assumptions.coldAgingFactor) / life;
  return { fractionLost: Math.min(1, exposure), remainingHours: Math.max(0, life * (1 - exposure) * 24) };
}
export function riskEligibility(remainingHours: number, risk: Risk, hardReasons: string[] = []) {
  finite(remainingHours, "remaining life");
  if (!Object.hasOwn(riskMargins, risk)) throw new Error("Invalid risk policy");
  const reasons = [...hardReasons];
  if (remainingHours <= 0) reasons.push("No usable life remains at arrival");
  else if (remainingHours + 1e-9 < riskMargins[risk]) reasons.push(`Needs ${riskMargins[risk]}h usable-life margin; ${remainingHours.toFixed(1)}h remains`);
  return { eligible: reasons.length === 0, reasons };
}
export function distanceKm(a: {lat: number; lng: number}, b: {lat: number; lng: number}) {
  for (const p of [a, b]) { finite(p.lat, "latitude", -90, 90); finite(p.lng, "longitude", -180, 180); }
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat-a.lat)*rad/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lng-a.lng)*rad/2)**2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h))) * assumptions.roadDistanceFactor;
}
export function getWeather(w: World, region: string, day: number) {
  validDay(day);
  const row = w.weather.find(x => x.region === region && x.day === day);
  if (!row) throw new Error("Weather observation unavailable");
  finite(row.temp_c, "temperature", -50, 70);
  return row;
}
export function getPriceForecast(w: World, market: string, asOfDay: number, aheadDays: number) {
  validDay(asOfDay);
  finite(aheadDays, "forecast horizon", 0, 30);
  const prices = w.prices[market];
  if (!prices || !Number.isFinite(prices[asOfDay]) || prices[asOfDay] <= 0) throw new Error("Market price unavailable");
  const history = prices.slice(Math.max(0, asOfDay-6), asOfDay+1);
  if (history.some(p => !Number.isFinite(p) || p <= 0)) throw new Error("Invalid price history");
  if (aheadDays === 0 || history.length === 1) return prices[asOfDay];
  const average = history.reduce((a,b) => a+b, 0) / history.length;
  const trend = (history.at(-1)! - history[0]) / (history.length-1);
  return Math.max(.01, average + trend * Math.min(aheadDays, 7));
}
export function checkStorage(w: World, region: string, kg: number, from: number, until: number, reservations: Reservation[] = []) {
  finite(kg, "lot weight", Number.EPSILON);
  finite(from, "storage start"); finite(until, "storage end", from);
  const store = w.storage.find(x => x.region === region);
  if (!store) throw new Error("Storage evidence unavailable");
  finite(store.capacity_kg, "storage capacity"); finite(store.cost_per_kg_day, "storage cost");
  const overlaps = reservations.filter(r => r.region === region && r.fromDay < until && r.untilDay > from);
  for (const r of overlaps) { finite(r.kg, "reserved weight"); finite(r.fromDay, "reservation start"); finite(r.untilDay, "reservation end", r.fromDay); }
  const events = new Set([from, ...overlaps.map(r => Math.max(from, r.fromDay))]);
  const peak = Math.max(0, ...[...events].map(t => overlaps.filter(r => r.fromDay <= t && r.untilDay > t).reduce((n,r)=>n+r.kg,0)));
  return { availableKg: Math.max(0, store.capacity_kg-peak), costPerKgDay: store.cost_per_kg_day,
    feasible: kg <= store.capacity_kg-peak };
}
export function transportCost(distance: number, kg: number, rain: boolean, additionalRainDays = 0) {
  finite(distance, "distance"); finite(kg, "lot weight", Number.EPSILON);
  finite(additionalRainDays, "rain delay", 0, 2);
  return { cost: cents(distance * kg * assumptions.transportRate),
    hours: distance / assumptions.speedKmh + assumptions.handlingHours + (rain ? 24 : 0) + additionalRainDays * 24 };
}

export function planLot(w: World, g: Geography, lot: Lot, risk: Risk, scenario: Scenario = defaultScenario, reservations: Reservation[] = []) {
  validateScenario(scenario); validDay(lot.harvest_day);
  finite(lot.kg, "lot weight", Number.EPSILON);
  if (lot.harvest_day >= assumptions.simulationDays) throw new Error("Lot is outside the 30-day horizon");
  const origin = g.lots.find(p => p.lot_id === lot.lot_id);
  if (!origin) throw new Error("Lot coordinates unavailable");
  if (!g.markets.length) throw new Error("No market coordinates available");
  const weather = getWeather(w, lot.region, lot.harvest_day);
  const destinations = g.markets.map(m => ({ ...m, km: distanceKm(origin, m) })).sort((a,b) => a.km-b.km || a.id.localeCompare(b.id));
  const nearest = destinations[0];
  const candidates: Candidate[] = [];
  for (const market of destinations) {
    const travel = transportCost(market.km, lot.kg, weather.rain, scenario.additionalRainDays);
    for (let hold = 0; hold < assumptions.simulationDays-lot.harvest_day; hold++) {
      const arrival = lot.harvest_day + hold + travel.hours/24;
      const shelf = estimateSpoilage(lot.shelf_life_days, travel.hours/24, hold, weather.temp_c);
      const stored = checkStorage(w, lot.region, lot.kg, lot.harvest_day, lot.harvest_day+hold, hold ? reservations : []);
      const hardReasons: string[] = [];
      if (arrival >= assumptions.simulationDays) hardReasons.push("Arrives after the 30-day simulation ends");
      if (hold && !stored.feasible) hardReasons.push(`Storage needs ${lot.kg}kg; only ${stored.availableKg}kg available`);
      const eligibility = riskEligibility(shelf.remainingHours, risk, hardReasons);
      const price = getPriceForecast(w, market.id, lot.harvest_day, Math.min(30,Math.floor(arrival)-lot.harvest_day)) * (1 + scenario.priceChangePercent/100);
      const saleableKg = lot.kg * (1-shelf.fractionLost);
      const gross = cents(saleableKg * price);
      const storage = cents(lot.kg * stored.costPerKgDay * hold * scenario.storageCostMultiplier);
      candidates.push({ id: `${market.id}:${hold}`, action: hold ? "store" : market.id === nearest.id ? "sell_now" : "reroute",
        market: market.id, marketName: market.name, storeDays: hold, dispatchDay: lot.harvest_day+hold, arrivalDay: arrival,
        distanceKm: market.km, transitHours: travel.hours, expectedPrice: price, saleableKg,
        spoiledKg: lot.kg-saleableKg, remainingHours: shelf.remainingHours, gross, transport: travel.cost, storage,
        net: cents(gross-travel.cost-storage), eligible: eligibility.eligible, hardReasons, reasons: eligibility.reasons });
    }
  }
  candidates.sort((a,b) => b.net-a.net || a.storeDays-b.storeDays || a.id.localeCompare(b.id));
  return { candidates, best: candidates.find(c => c.eligible) ?? null,
    baseline: candidates.find(c => c.market === nearest.id && c.storeDays === 0)!, weather, nearest };
}
