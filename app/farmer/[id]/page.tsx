import Header from '@/components/Header';
import FarmerDecision from '@/components/FarmerDecision';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <><Header farmer/><main id="main"><FarmerDecision id={id}/></main></>;}
