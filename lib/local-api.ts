import { object } from './live';
export class LocalApiError extends Error{constructor(message:string,public status=400){super(message);}}
export function requireLocal(request:Request){const url=new URL(request.url),origin=request.headers.get('origin'),host=request.headers.get('host')??url.host;if(!['localhost:3010','127.0.0.1:3010'].includes(host)||(origin&&origin!==`http://${host}`))throw new LocalApiError('Local demo only',403);}
export async function readLocalJson(request:Request){
  requireLocal(request);if(!request.headers.get('content-type')?.startsWith('application/json'))throw new LocalApiError('JSON required',415);
  const reader=request.body?.getReader();if(!reader)throw new LocalApiError('Body required');const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw new LocalApiError('Request too large',413);}chunks.push(value);}
  return object(JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))));
}
export function localError(e:unknown){return Response.json({error:e instanceof SyntaxError?'Invalid JSON':e instanceof Error?e.message:'Request failed'},{status:e instanceof LocalApiError?e.status:400,headers:{'Cache-Control':'no-store'}});}
