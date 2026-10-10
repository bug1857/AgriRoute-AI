import raw from "@/data/live-location-evidence.json";
import type { MarketId,Point } from "./live";
const jaipur=raw.origin.response.results.find(r=>r.country_code==="IN"&&r.admin2==="Jaipur district");
const chomu=raw["chomu-search"].response.results.find(r=>r.country_code==="IN"&&r.admin2==="Jaipur district"&&r.admin3==="Chomu");
const muhana=raw.muhana.response[0];
if(!jaipur||!chomu||muhana.address.state_district!=="Jaipur")throw new Error("Verified locality evidence missing");
export const liveLocations:{origin:Point;markets:{id:MarketId;point:Point;coordinateLabel:string;sourceUrl:string;retrievedAt:string}[];originSourceUrl:string;originRetrievedAt:string}={origin:{lat:jaipur.latitude,lng:jaipur.longitude},originSourceUrl:raw.origin.sourceUrl,originRetrievedAt:raw.origin.retrievedAt,markets:[{id:"muhana",point:{lat:Number(muhana.lat),lng:Number(muhana.lon)},coordinateLabel:"Muhana Mandi Road locator; gate not verified",sourceUrl:raw.muhana.sourceUrl,retrievedAt:raw.muhana.retrievedAt},{id:"chomu",point:{lat:chomu.latitude,lng:chomu.longitude},coordinateLabel:"Chomu locality centroid; gate not verified",sourceUrl:raw["chomu-search"].sourceUrl,retrievedAt:raw["chomu-search"].retrievedAt}]};
