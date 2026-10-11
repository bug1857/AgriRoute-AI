import fixtureText from "@/data/world-source";
import geography from "@/data/geography.json";
import provenance from "@/data/provenance.json";

export type Crop = "tomato" | "onion" | "mango" | "potato";
export type Region = "North" | "South" | "East" | "West";
export type Lot = { lot_id: number; crop: Crop; kg: number; harvest_day: number; region: Region; shelf_life_days: number };
export type World = {
  lots: Lot[];
  prices: Record<string, number[]>;
  weather: { region: string; day: number; temp_c: number; rain: boolean }[];
  storage: { region: string; capacity_kg: number; cost_per_kg_day: number }[];
};
export type Geography = typeof geography;
// JSON module bundling rounded seed-42 floats; parse the exact frozen text in both runtimes.
export const world = JSON.parse(fixtureText) as World;
export const geo = geography;
export const source = provenance;
export const cropLabels: Record<Crop, string> = { tomato: "Tomato", onion: "Onion", mango: "Mango", potato: "Potato" };
export const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
export const quantity = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
