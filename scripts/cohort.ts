import {evaluationState,captureNext} from '../lib/evaluation-capture';
async function main(){const state=process.argv.includes('--capture-next')?await captureNext():await evaluationState();console.log(JSON.stringify({...state.manifest,result:undefined},null,2));}
void main().catch(e=>{console.error(e.message);process.exitCode=1;});
