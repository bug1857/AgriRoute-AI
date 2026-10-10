import { crops,markets } from './mandi';
import { numeric,object,priceDate } from './live';
import type { Crop } from './world';
export const OFFER_VERSION='agriroute.offer-review.v1';
export type Span={excerpt:string;start:number;end:number};
type TextField={value:string;evidence:Span};
type AmountField={value:number;unit:'kg'|'quintal'|'tonne';normalized:number;evidence:Span};
export type OfferExtraction={version:typeof OFFER_VERSION;source:'deterministic-parser'|'manual-entry'|'mocked-test';message:string;fields:{price:AmountField|null;quantity:AmountField|null;crop:(TextField&{value:Crop})|null;grade:TextField|null;delivery:TextField|null;payment:TextField|null};warnings:string[]};
const aliases:Record<Crop,string>={tomato:'tomato(?:es)?|tamatar|टमाटर',potato:'potato(?:es)?|aloo|aaloo|आलू',onion:'onions?|pyaaz|pyaz|प्याज|प्याज़',mango:'mango(?:es)?|aam|आम'};
const units='quintals?|qtl|क्विंटल|tonnes?|tons?|टन|kilograms?|kgs?|kilos?|किलोग्राम|किलो';
const number='[0-9]+(?:,[0-9]{2,3})*(?:\\.[0-9]+)?';
const currency='(?:₹|rs\\.?|inr|रु\\.?|रुपये|रुपया|rupees?|rupaye|rupay)';
const span=(message:string,start:number,end:number):Span=>({excerpt:message.slice(start,end),start,end});
function normalizedDigits(message:string){return message.replace(/[०-९]/g,c=>String(c.charCodeAt(0)-'०'.charCodeAt(0)));}
function unit(s:string):AmountField['unit']{return /quintal|qtl|क्विंटल/i.test(s)?'quintal':/ton|टन/i.test(s)?'tonne':'kg';}
function unique<T>(values:T[],key:(value:T)=>string,field:string,warnings:string[]):T|null{
  const options=[...new Map(values.map(v=>[key(v),v])).values()];if(options.length===1)return options[0];warnings.push(options.length?`Ambiguous ${field}: multiple distinct values; correct before confirmation`:`Missing ${field}: enter/clarify manually`);return null;
}
export function parseOffer(message:unknown,manual=false):OfferExtraction{
  if(typeof message!=='string'||message.length>4000||(!manual&&!message.trim()))throw new Error('Enter a message of 1–4,000 characters');
  const normalized=normalizedDigits(message),warnings:string[]=[],prices:AmountField[]=[],quantities:AmountField[]=[],cropFields:(TextField&{value:Crop})[]=[];
  const pricePatterns=[new RegExp(`${currency}\\s*(${number})\\s*(?:/|per|प्रति)?\\s*(${units})(?![\\p{L}])`,'giu'),new RegExp(`(${number})\\s*${currency}\\s*(?:/|per|प्रति)?\\s*(${units})(?![\\p{L}])`,'giu')];
  for(const pattern of pricePatterns)for(const m of normalized.matchAll(pattern)){
    if(normalized[m.index!-1]==='-'){warnings.push('Negative price rejected');continue;}
    const u=unit(m[2]),value=Number(m[1].replaceAll(',','')),rate=value/(u==='quintal'?100:u==='tonne'?1000:1);
    try{numeric(rate,.01,1000);prices.push({value,unit:u,normalized:rate,evidence:span(message,m.index!,m.index!+m[0].length)});}catch{warnings.push('Price outside supported bounds; clarify manually');}
  }
  const qtyPattern=new RegExp(`(?<![0-9.,-])(${number})\\s*(${units})(?![\\p{L}0-9])`,'giu');
  for(const m of normalized.matchAll(qtyPattern)){
    if(prices.some(p=>m.index!<p.evidence.end&&m.index!+m[0].length>p.evidence.start))continue;
    const u=unit(m[2]),value=Number(m[1].replaceAll(',','')),kg=value*(u==='quintal'?100:u==='tonne'?1000:1);
    try{numeric(kg,1,30000);quantities.push({value,unit:u,normalized:kg,evidence:span(message,m.index!,m.index!+m[0].length)});}catch{warnings.push('Quantity outside supported bounds; clarify manually');}
  }
  for(const crop of crops)for(const m of normalized.matchAll(new RegExp(`(?:^|[^\\p{L}])(${aliases[crop]})(?=$|[^\\p{L}])`,'giu'))){const start=m.index!+m[0].indexOf(m[1]);cropFields.push({value:crop,evidence:span(message,start,start+m[1].length)});}
  const textFields=(patterns:RegExp[])=>patterns.flatMap(pattern=>[...normalized.matchAll(pattern)].map(m=>({value:message.slice(m.index!+m[0].indexOf(m[1]),m.index!+m[0].indexOf(m[1])+m[1].length).trim(),evidence:span(message,m.index!,m.index!+m[0].length)})));
  const grade=textFields([/(?:grade|ग्रेड)\s*[:=-]?\s*([\p{L}\p{N}-]+)/giu,/([ABC])\s+(?:grade|ग्रेड)/giu]);
  const delivery=textFields([/(?:delivery|deliver|डिलीवरी|डिलिवरी|bhejna|भेजना|pickup|उठाव)\s*[:=-]?\s*([^,;.\n]+)/giu]);
  const payment=textFields([/(?:payment|pay|भुगतान|पेमेंट)\s*[:=-]?\s*([^,;.\n]+)/giu]);
  if(/\b(?:not|cancel|reject|mat)\b|नहीं|नही|मत/iu.test(message))warnings.push('Negation/cancellation detected: clarify the intended terms manually');
  const fields={price:unique(prices,p=>String(p.normalized),'price with explicit INR/unit',warnings),quantity:unique(quantities,q=>String(q.normalized),'quantity',warnings),crop:unique(cropFields,c=>c.value,'crop',warnings),grade:unique(grade,g=>g.value.toLowerCase(),'grade',warnings),delivery:unique(delivery,d=>d.value.toLowerCase(),'delivery',warnings),payment:unique(payment,p=>p.value.toLowerCase(),'payment',warnings)};
  if(fields.delivery&&!marketFromDelivery(fields.delivery.value))warnings.push('Delivery destination not uniquely mapped to a supported scenario; clarify manually');
  warnings.push('Unit conversions are suggestions; human confirmation required. Payment timing, grade acceptance and actual carrier/storage availability are not modeled as guarantees.');
  return {version:OFFER_VERSION,source:manual?'manual-entry':'deterministic-parser',message,fields,warnings:[...new Set(warnings)]};
}
export function marketFromDelivery(value:string){const names=[['scenario_muhana',/muhana|मुहाना|मुहाणा/iu],['scenario_chomu',/chomu|चोमू|चौमू/iu],['scenario_bassi',/bassi|बस्सी/iu]] as const;const matches=names.filter(([,re])=>re.test(value));return matches.length===1?matches[0][0]:null;}
export type ConfirmedFields={crop:Crop;pricePerKg:number;quantityKg:number;grade:string;delivery:string;payment:string;marketId:string;validFrom:string;validUntil:string;maxArrivalDays:number|null};
function short(value:unknown,label:string){if(typeof value!=='string'||!value.trim()||value.length>160)throw new Error(`${label} must be supplied (maximum 160 characters)`);return value.trim();}
export function validateConfirmedFields(value:unknown):ConfirmedFields{
  const r=object(value,['crop','pricePerKg','quantityKg','grade','delivery','payment','marketId','validFrom','validUntil','maxArrivalDays']);if(!crops.includes(r.crop as Crop)||!markets.some(m=>m.id===r.marketId))throw new Error('Choose a crop and scenario destination');
  const delivery=short(r.delivery,'Delivery');if(marketFromDelivery(delivery)!==r.marketId)throw new Error('Delivery text must uniquely identify the selected scenario destination; clarify/correct it first');
  const from=priceDate(r.validFrom),until=priceDate(r.validUntil);if(until<from||(Date.parse(until)-Date.parse(from))/86400000>30)throw new Error('Offer validity must be ordered and at most 30 days');
  const deadline=r.maxArrivalDays===null?null:numeric(r.maxArrivalDays,0,7);if(deadline!==null&&!Number.isInteger(deadline))throw new Error('Delivery days must be an integer');
  return {crop:r.crop as Crop,pricePerKg:numeric(r.pricePerKg,.01,1000),quantityKg:numeric(r.quantityKg,1,30000),grade:short(r.grade,'Grade'),delivery,payment:short(r.payment,'Payment'),marketId:String(r.marketId),validFrom:from,validUntil:until,maxArrivalDays:deadline};
}
export type ConfirmedOffer={id:string;draftId:string;version:typeof OFFER_VERSION;status:'HUMAN_CONFIRMED_FOR_PLANNING';source:OfferExtraction['source'];message:string;fields:ConfirmedFields;confirmedAt:string;corrections:{field:string;extracted:unknown;confirmed:unknown}[];evidence:OfferExtraction['fields'];warnings:string[];sha256:string};
