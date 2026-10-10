import { createHash } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import { generateMandi } from '../lib/mandi';
async function main(){
const data=generateMandi(),body=JSON.stringify(data,null,2)+'\n',sha256=createHash('sha256').update(body).digest('hex');
const manifest=JSON.stringify({...data.provenance,rows:data.rows.length,sha256},null,2)+'\n';
if(process.argv.includes('--check')){if(await readFile('data/synthetic-mandi.json','utf8')!==body||await readFile('data/synthetic-mandi.manifest.json','utf8')!==manifest)throw new Error('Synthetic artifact mismatch');}
else{await writeFile('data/synthetic-mandi.json',body);await writeFile('data/synthetic-mandi.manifest.json',manifest);}
console.log(JSON.stringify({verification:process.argv.includes('--check')?'PASS':'GENERATED',rows:data.rows.length,sha256,...data.provenance}));

}
void main().catch(e=>{console.error(e.message);process.exitCode=1;});
