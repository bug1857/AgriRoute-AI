import { object } from './live';
export class LocalApiError extends Error{constructor(message:string,public status=400){super(message);}}
const LOCAL_HOSTS=['localhost:3010','127.0.0.1:3010'] as const;
function hostOf(request:Request){return request.headers.get('host')??new URL(request.url).host;}
export function isHostedRequest(request:Request){return process.env.VERCEL==='1'||process.env.APP_ORIGIN?.startsWith('https://')===true||!LOCAL_HOSTS.some(host=>host===hostOf(request));}
/** Allow the original localhost demo, or exactly the configured HTTPS deployment host.
 * Never infer authorization from an arbitrary Host or X-Forwarded-Host header. */
export function requireLocal(request:Request){
  const url=new URL(request.url),host=hostOf(request),origin=request.headers.get('origin');
  const isLocal=!isHostedRequest(request)&&LOCAL_HOSTS.some(value=>value===host)&&['localhost','127.0.0.1'].includes(url.hostname);
  let hostedOrigin:string|null=null;
  try{const allowed=new URL(process.env.APP_ORIGIN??'');if(allowed.protocol==='https:'&&allowed.host===host&&allowed.username===''&&allowed.password===''&&allowed.pathname==='/'&&allowed.search===''&&allowed.hash==='')hostedOrigin=allowed.origin;}catch{/* Fail closed when the production origin is absent or invalid. */}
  if(!isLocal&&!hostedOrigin)throw new LocalApiError('Host not authorized; configure APP_ORIGIN for HTTPS deployment',403);
  const expected=isLocal?`http://${host}`:hostedOrigin!;
  if(origin&&origin!==expected)throw new LocalApiError('Cross-origin request denied',403);
  if(!isLocal&&!['GET','HEAD'].includes(request.method)&&origin!==expected)throw new LocalApiError('Exact HTTPS Origin header required',403);
}
export async function readLocalJson(request:Request){
  requireLocal(request);if(!request.headers.get('content-type')?.startsWith('application/json'))throw new LocalApiError('JSON required',415);
  const reader=request.body?.getReader();if(!reader)throw new LocalApiError('Body required');const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw new LocalApiError('Request too large',413);}chunks.push(value);}
  return object(JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))));
}
export function localError(e:unknown){return Response.json({error:e instanceof SyntaxError?'Invalid JSON':e instanceof Error?e.message:'Request failed'},{status:e instanceof LocalApiError?e.status:400,headers:{'Cache-Control':'no-store'}});}
