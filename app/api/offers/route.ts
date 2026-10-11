import { object } from '@/lib/live';
import { createOfferDraft,confirmOffer,rejectOffer } from '@/lib/offer-store';
import { isHostedRequest,localError,readLocalJson,requireLocal } from '@/lib/local-api';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){try{requireLocal(request);return Response.json({gemini:'LOCKED',extractor:'Local rule-based Hindi/English/Hinglish parser; not Gemini',persistence:'Local server memory, maximum 30 minutes; no authenticated cloud record'},{headers:{'Cache-Control':'no-store'}});}catch(e){return localError(e);}}
export async function POST(request:Request){try{
  requireLocal(request);
  if(isHostedRequest(request))return Response.json({error:'Anonymous offer drafts rely on local server memory and are disabled in the hosted demo. Use authenticated Coordinator offers for durable review.'},{status:423,headers:{'Cache-Control':'no-store'}});
  const body=await readLocalJson(request);let result:unknown;
  if(body.action==='extract'||body.action==='manual'){object(body,['action','message']);result=createOfferDraft(body.action==='manual'?'':body.message,body.action==='manual');}
  else if(body.action==='confirm'){object(body,['action','draftId','fields','acknowledged']);result=confirmOffer(body.draftId,body.fields,body.acknowledged);}
  else if(body.action==='reject'){object(body,['action','draftId']);result=rejectOffer(body.draftId);}
  else throw new Error('Unknown offer action; Gemini inference remains locked');
  return Response.json(result,{headers:{'Cache-Control':'no-store'}});
}catch(e){return localError(e);}}
