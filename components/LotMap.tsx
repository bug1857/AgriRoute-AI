"use client";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { geo, world, type Lot } from "@/lib/world";
import { getWeather, shelfLeft } from "@/lib/planner";
import "leaflet/dist/leaflet.css";

export default function LotMap({lots,selectedId,onSelect}: {lots:Lot[];selectedId:number;onSelect:(id:number)=>void}) {
  const element=useRef<HTMLDivElement>(null);
  const map=useRef<LeafletMap|null>(null);
  const select=useRef(onSelect);
  useEffect(()=>{select.current=onSelect;},[onSelect]);
  useEffect(()=>{
    let disposed=false;
    let instance: LeafletMap | null=null;
    void import("leaflet").then(L=>{
      if(disposed || !element.current)return;
      instance=L.map(element.current,{zoomControl:false,scrollWheelZoom:false,attributionControl:true}).setView([26.89,75.80],10);
      map.current=instance;
      // shortcut: synthetic distance estimates; real road geometry belongs to the routing integration checkpoint.
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:16}).addTo(instance);
      L.control.zoom({position:"bottomright"}).addTo(instance);
      instance.attributionControl.addAttribution("Fictional farms & markets");
    });
    return ()=>{disposed=true;instance?.remove();map.current=null;};
  },[]);
  useEffect(()=>{
    let disposed=false;
    let layer: import("leaflet").LayerGroup | null=null;
    let timer: ReturnType<typeof setTimeout>;
    const render=async()=>{
      const L=await import("leaflet");
      if(disposed)return;
      if(!map.current){timer=setTimeout(()=>{void render();},50);return;}
      layer=L.layerGroup().addTo(map.current);
      for(const market of geo.markets){
        const node=document.createElement("span");node.className="market-map-label";node.textContent=market.name;
        L.marker([market.lat,market.lng],{keyboard:false,icon:L.divIcon({className:"market-icon",html:node,iconSize:[68,22],iconAnchor:[34,11]})}).addTo(layer);
      }
      for(const lot of lots){
        const p=geo.lots.find(p=>p.lot_id===lot.lot_id)!;
        const hours=shelfLeft(lot.shelf_life_days,getWeather(world,lot.region,lot.harvest_day).temp_c)*24;
        const urgent=hours<=48;
        const node=document.createElement("button");
        node.className=`lot-pin ${urgent?"urgent":""} ${lot.lot_id===selectedId?"selected":""}`;
        node.type="button";node.setAttribute("aria-label",`Select lot ${lot.lot_id+1}, ${lot.crop}`);node.setAttribute("aria-pressed",String(lot.lot_id===selectedId));
        node.textContent=String(lot.lot_id+1).padStart(2,"0");node.onclick=()=>select.current(lot.lot_id);
        L.marker([p.lat,p.lng],{keyboard:false,icon:L.divIcon({className:"lot-marker",html:node,iconSize:[30,30],iconAnchor:[15,15]}),zIndexOffset:lot.lot_id===selectedId?1000:0}).addTo(layer);
      }
    };
    void render();
    return ()=>{disposed=true;clearTimeout(timer);layer?.remove();};
  },[lots,selectedId]);
  return <div ref={element} className="lot-map" aria-label="Interactive map of fictional Jaipur-area harvest lots" data-testid="lot-map"/>;
}
