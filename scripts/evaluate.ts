import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir,readFile,writeFile,statfs } from "node:fs/promises";
import { world,geo,source } from "../lib/world";
import { baselinePolicy,plannerPolicy,simulate,SIMULATION_RULES,SIMULATION_VERSION } from "../lib/simulator";
import { prepareReplayPolicy } from "../lib/simulation-replay";

const hash=(text:string)=>createHash("sha256").update(text).digest("hex");
async function main(){
  const disk=await statfs(process.cwd());assert.ok(disk.bavail*disk.bsize>64*1024*1024,"Need at least 64 MiB free for artifacts");
  assert.equal(hash(await readFile("data/world.json","utf8")),source.sha256,"Frozen fixture changed");
  assert.equal(world.lots.length,30);assert.equal(geo.markets.length,5);
  const A=simulate(world,geo,baselinePolicy),B=simulate(world,geo,plannerPolicy);
  assert.equal(A.status,"COMPLETE");assert.equal(B.status,"COMPLETE");assert.deepEqual(A,simulate(world,geo,baselinePolicy));assert.deepEqual(B,simulate(world,geo,plannerPolicy));
  const replay=await prepareReplayPolicy(),C=simulate(world,geo,replay.policy);
  const identifiers={fixtureSha256:source.sha256,geographySha256:hash(await readFile("data/geography.json","utf8")),plannerSha256:hash(await readFile("lib/planner.ts","utf8")),simulatorSha256:hash(await readFile("lib/simulator.ts","utf8")),replayAdapterSha256:hash(await readFile("lib/simulation-replay.ts","utf8"))};
  const settings={version:SIMULATION_VERSION,synthetic:true,days:30,risk:"balanced",rules:SIMULATION_RULES,identifiers};
  const experimentId=hash(JSON.stringify({settings,A,B}));
  const delta={netRupees:Math.round((B.totals!.net-A.totals!.net)*100)/100,spoiledKg:B.totals!.spoiledKg-A.totals!.spoiledKg,kgSaved:A.totals!.spoiledKg-B.totals!.spoiledKg,soldKg:B.totals!.soldKg-A.totals!.soldKg,unsoldKg:B.totals!.unsoldKg-A.totals!.unsoldKg};
  const document={experimentId,...settings,A,B,delta,C:{...C,evidence:replay.evidence}};
  const payload=JSON.stringify(document,null,2)+"\n",manifest=JSON.stringify({experimentId,artifactSha256:hash(payload),identifiers,policyCStatus:C.status},null,2)+"\n";
  if(process.argv.includes("--check")){
    const frozenText=await readFile("public/evaluation/benchmark.json","utf8"),frozen=JSON.parse(frozenText),frozenManifest=JSON.parse(await readFile("public/evaluation/manifest.json","utf8"));
    assert.equal(hash(frozenText),frozenManifest.artifactSha256);assert.equal(frozenManifest.artifactSha256,"974bcbed112593026a6158d07ed95125265f690b7f1ddef4ffd7eac97ac95f69","Original frozen artifact changed");
    assert.equal(identifiers.fixtureSha256,frozen.identifiers.fixtureSha256);assert.equal(identifiers.geographySha256,frozen.identifiers.geographySha256);assert.equal(identifiers.replayAdapterSha256,frozen.identifiers.replayAdapterSha256);
    // Current code hashes are reported separately; every scientific output must match the preserved artifact.
    assert.deepEqual({...document,experimentId:frozen.experimentId,identifiers:frozen.identifiers},frozen);
    console.log(JSON.stringify({frozenExperimentId:frozen.experimentId,frozenArtifactSha256:frozenManifest.artifactSha256,currentCodeIdentifiers:identifiers,sourceHashesChanged:identifiers.plannerSha256!==frozen.identifiers.plannerSha256||identifiers.simulatorSha256!==frozen.identifiers.simulatorSha256}));
  }else{try{await readFile("public/evaluation/benchmark.json");throw new Error("Frozen artifact already exists; use --check. New Gemini cohorts are stored separately.");}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}await mkdir("public/evaluation",{recursive:true});await writeFile("public/evaluation/benchmark.json",payload);await writeFile("public/evaluation/manifest.json",manifest);}
  console.log(JSON.stringify({verification:"PASS",mode:process.argv.includes("--check")?"frozen artifact check":"generated",experimentId,artifactSha256:hash(payload),A:A.totals,B:B.totals,delta,C:{status:C.status,evaluatedLots:C.evaluatedLots,classification:C.classification,fullCohortTotals:C.totals,isolatedPreview:C.previewTotals,usage:replay.evidence.usage},freeDiskGiB:Math.round(disk.bavail*disk.bsize/1024**3*10)/10},null,2));
}
void main().catch(e=>{console.error(e instanceof Error?e.message:"Evaluation failed");process.exitCode=1;});
