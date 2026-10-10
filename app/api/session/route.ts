import {authenticate,body,cookie,login,logout,WorkflowError} from '@/lib/coordinator';
import {failure,validate} from '@/lib/workflow-error';
import {object} from '@/lib/live';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){try{return Response.json({user:await authenticate(request)},{headers:{'Cache-Control':'no-store','Vary':'Cookie'}});}catch(e){return failure(e);}}
export async function POST(request:Request){try{const raw=await body(request),b=validate(()=>object(raw,raw.action==='login'?['action','email','password']:['action']));if(b.action==='login'){const session=await login(b.email,b.password);return Response.json({ok:true},{headers:{'Set-Cookie':cookie(session),'Cache-Control':'no-store'}});}if(b.action==='logout'){await logout(request);return Response.json({ok:true},{headers:{'Set-Cookie':cookie('',0),'Cache-Control':'no-store'}});}throw new WorkflowError('Unknown session action');}catch(e){return failure(e);}}
