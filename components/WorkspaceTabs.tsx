"use client";
import { useState,type ReactNode } from "react";

export function nextTabIndex(index:number,key:string,count:number){
  if(key==="ArrowRight")return (index+1)%count;
  if(key==="ArrowLeft")return (index+count-1)%count;
  if(key==="Home")return 0;
  if(key==="End")return count-1;
  return null;
}
export default function WorkspaceTabs({id,label,tabs}:{id:string;label:string;tabs:{id:string;label:string;content:ReactNode}[]}){
  const [selected,setSelected]=useState(tabs[0].id);
  return <div className="workspace-tabs">
    <div className="workspace-tab-list" role="tablist" aria-label={label}>{tabs.map((tab,index)=><button key={tab.id} type="button" role="tab" id={`${id}-${tab.id}-tab`} aria-controls={`${id}-${tab.id}-panel`} aria-selected={selected===tab.id} tabIndex={selected===tab.id?0:-1} onClick={()=>setSelected(tab.id)} onKeyDown={event=>{
      const next=nextTabIndex(index,event.key,tabs.length);if(next===null)return;
      event.preventDefault();setSelected(tabs[next].id);document.getElementById(`${id}-${tabs[next].id}-tab`)?.focus();
    }}>{tab.label}</button>)}</div>
    {tabs.map(tab=><div key={tab.id} className="workspace-tab-panel" role="tabpanel" id={`${id}-${tab.id}-panel`} aria-labelledby={`${id}-${tab.id}-tab`} hidden={selected!==tab.id}>{tab.content}</div>)}
  </div>;
}
