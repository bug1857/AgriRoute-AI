import { crops,MANDI_LABEL,planMandi,validateMandiInput } from '@/lib/mandi';
import { mandiData,mandiManifest } from '@/lib/mandi-data';
import { isHostedRequest,localError,readLocalJson,requireLocal } from '@/lib/local-api';
import { confirmedOffer } from '@/lib/offer-store';
import { readFile } from 'node:fs/promises';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{requireLocal(request);if(new URL(request.url).searchParams.get('download')==='1')return new Response(await readFile('data/synthetic-mandi.json','utf8'),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="agriroute-synthetic-mandi.json"','Cache-Control':'no-store'}});return Response.json({label:MANDI_LABEL,provenance:mandiManifest,crops,markets:mandiData.markets},{headers:{'Cache-Control':'no-store'}});}catch(e){return localError(e);}}
export async function POST(request:Request){try{const body=await readLocalJson(request);const {confirmedOfferId,...rawInput}=body;if(isHostedRequest(request)&&confirmedOfferId!==undefined)throw new Error('Anonymous in-memory offers are disabled on hosted demo; use Coordinator reviewed offers');const input=validateMandiInput(rawInput),offer=confirmedOfferId===undefined?undefined:confirmedOffer(confirmedOfferId);return Response.json({...planMandi(mandiData,input,offer),provenance:mandiManifest},{headers:{'Cache-Control':'no-store'}});}catch(e){return localError(e);}}
