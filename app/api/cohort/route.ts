import {authenticate,WorkflowError} from '@/lib/coordinator';
import {failure} from '@/lib/workflow-error';
import {evaluationState} from '@/lib/evaluation-capture';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){try{const u=await authenticate(request);if(u.role!=='coordinator')throw new WorkflowError('Coordinator permission required',403);const {manifest}=await evaluationState();return Response.json(manifest,{headers:{'Cache-Control':'no-store','Vary':'Cookie'}});}catch(e){return failure(e);}}
