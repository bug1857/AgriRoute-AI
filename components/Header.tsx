import Link from "next/link";
import { ArrowUpRight, Sprout } from "lucide-react";
export default function Header({ demo = false,live = false,mandi = false }: {demo?: boolean;live?:boolean;mandi?:boolean}) {
  return <header className="site-header">
    <Link href="/" className="brand" aria-label="AgriRoute AI home"><span className="brand-icon"><Sprout size={23}/></span><span>AgriRoute<span className="brand-ai"> AI</span><small>HARVEST INTELLIGENCE</small></span></Link>
    <nav aria-label="Main navigation"><Link href="/" className={!demo&&!live&&!mandi ? "nav-active" : ""}>Home</Link><Link href="/demo" className={demo ? "nav-active" : ""}>Demo Lab</Link><Link href="/live" className={live?"nav-active":""}>Live assisted</Link><Link href="/mandi" className={mandi?"nav-active":""}>Mandi lab</Link><Link href="/#methodology">Our approach</Link></nav>
    <Link href="/demo" className="nav-cta">Explore demo <ArrowUpRight size={17}/></Link>
  </header>;
}
