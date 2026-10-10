import Header from "@/components/Header";
import Explorer from "@/components/Explorer";
import Evaluation from "@/components/Evaluation";
export default async function DemoPage({searchParams}: {searchParams: Promise<{lot?: string}>}) {
  const params=await searchParams;
  const id=params.lot === undefined ? undefined : Number(params.lot);
  return <><Header demo/><main id="main"><Explorer initialId={Number.isInteger(id) && id!>=0 && id!<30 ? id : undefined}/><Evaluation/></main></>;
}
