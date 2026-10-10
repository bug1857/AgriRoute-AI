"use client";
import { useEffect,useRef,useState } from "react";
import type { Road } from "@/lib/live";
import "leaflet/dist/leaflet.css";
export default function RoadMap({roads}:{roads:Road[]}){
  const element=useRef<HTMLDivElement>(null);const [error,setError]=useState("");
  useEffect(()=>{let disposed=false;let map:import("leaflet").Map|null=null;let resize:ResizeObserver|null=null;
    if(!roads.length)return;
    void import("leaflet").then(L=>{if(disposed||!element.current)return;map=L.map(element.current,{scrollWheelZoom:false});L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · OSRM car routing'}).addTo(map);const lines=roads.map((r,i)=>L.polyline(r.geometry.coordinates.map(p=>[p[1],p[0]]),{color:i?"#7c9162":"#173d2b",weight:4}).addTo(map!));const bounds=L.featureGroup(lines).getBounds();map.fitBounds(bounds,{padding:[25,25]});resize=new ResizeObserver(()=>{if(map&&element.current?.offsetWidth){map.invalidateSize();map.fitBounds(bounds,{padding:[25,25]});}});resize.observe(element.current);for(const r of roads){L.circleMarker([r.origin.lat,r.origin.lng],{radius:5,color:"#173d2b"}).addTo(map);L.circleMarker([r.destination.lat,r.destination.lng],{radius:5,color:"#a86235"}).addTo(map);}}).catch(()=>{if(!disposed)setError("Map renderer unavailable; route distances and source receipts remain available.");});
    return ()=>{disposed=true;resize?.disconnect();map?.remove();};
  },[roads]);
  return roads.length?<><div ref={element} className="live-road-map" role="img" aria-label="Actual OSRM road route geometries for the provided pickup and destination coordinates"/>{error&&<p role="status">{error}</p>}</>:<p className="live-empty">No verified road geometry returned. No route is drawn.</p>;
}
