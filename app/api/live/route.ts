import { calculateLive,object,validateLiveInput } from "@/lib/live";
import { collectLiveEvidence,recalledEvidence,rememberEvidence } from "@/lib/live-providers";
import { liveLocations } from "@/lib/live-locations";
import { requireLocal } from "@/lib/local-api";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function local(request:Request){try{requireLocal(request);return true;}catch{return false;}}
export async function GET(request:Request){if(!local(request))return Response.json({error:"Local demo only"},{status:403});return Response.json({mode:"LIVE_ASSISTED",locations:liveLocations,mandiDeferred:true,now:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});}
export async function POST(request:Request){
  if(!local(request))return Response.json({error:"Local demo only"},{status:403});
  if(!request.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"JSON required"},{status:415});
  const reader=request.body?.getReader();if(!reader)return Response.json({error:"Body required"},{status:400});
  const chunks:Uint8Array[]=[];let size=0;
  try{
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();return Response.json({error:"Request too large"},{status:413});}chunks.push(value);}
    const body=object(JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))),["action","evidenceId","input"]),input=validateLiveInput(body.input);
    if(body.action!=="refresh"&&body.action!=="calculate")throw new Error("Unknown action");
    const evidence=body.action==="refresh"?await collectLiveEvidence(input):recalledEvidence(body.evidenceId);
    const evidenceId=body.action==="refresh"?rememberEvidence(evidence):body.evidenceId;
    return Response.json({evidenceId,evidence,result:calculateLive(input,evidence)},{headers:{"Cache-Control":"no-store"}});
  }catch(e){const message=e instanceof SyntaxError?"Invalid JSON":e instanceof Error?e.message:"Request failed";return Response.json({error:message},{status:400});}
}
