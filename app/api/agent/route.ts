import { agentReadiness, runGemini } from "@/lib/gemini-server";
import { isHostedRequest, requireLocal } from "@/lib/local-api";
import { latestTrace, loadTrace } from "@/lib/agent-store";
export const runtime="nodejs";
export const dynamic="force-dynamic";

function allowed(request:Request){try{requireLocal(request);return true;}catch{return false;}}
const hostedBlocker="Public deployment: Gemini inference and private authentic traces are disabled. Local verified replay remains available on the developer machine.";
export async function GET(request:Request) {
  if(!allowed(request))return Response.json({error:"Unauthorized host or origin"},{status:403});
  if(isHostedRequest(request))return Response.json({ready:false,model:"gemini-3.1-flash-lite",blocker:"hosted_inference_disabled",record:null},{headers:{"Cache-Control":"no-store"}});
  try{
    const id=new URL(request.url).searchParams.get("trace");
    if(id)return Response.json({record:await loadTrace(id),mode:"authentic_replay"},{headers:{"Cache-Control":"no-store"}});
    return Response.json({...await agentReadiness(),record:await latestTrace()},{headers:{"Cache-Control":"no-store"}});
  }catch{return Response.json({error:"Trace unavailable or failed integrity verification"},{status:409});}
}
export async function POST(request:Request) {
  if(!allowed(request))return Response.json({error:"Unauthorized host or origin"},{status:403});
  if(isHostedRequest(request))return Response.json({error:hostedBlocker},{status:423,headers:{"Cache-Control":"no-store"}});
  if(!request.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"JSON required"},{status:415});
  const reader=request.body?.getReader();if(!reader)return Response.json({error:"Body required"},{status:400});
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();return Response.json({error:"Request too large"},{status:413});}chunks.push(value);}
  const text=new TextDecoder().decode(Buffer.concat(chunks));
  let input:unknown;try{input=JSON.parse(text);}catch{return Response.json({error:"Invalid JSON"},{status:400});}
  try{return Response.json({record:await runGemini(input),mode:"live"},{headers:{"Cache-Control":"no-store"}});}catch(e){
    const message=(e as Error).message;
    const allowed=["missing_api_key","free_quota_unverified","one_live_run_already_claimed","live_run_evidence_lost","model_unavailable","trace_storage_unavailable"];
    return Response.json({error:allowed.includes(message)?message:"Run blocked, invalid input or provider/storage unavailable; no successful agent result recorded"},{status:allowed.includes(message)?409:400});
  }
}
