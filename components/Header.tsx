import Link from "next/link";
import { ArrowUpRight, Sprout } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
export default function Header({ demo = false,live = false,mandi = false,farmer = false,coordinator = false }: {demo?: boolean;live?:boolean;mandi?:boolean;farmer?:boolean;coordinator?:boolean}) {
  return <header className="site-header">
    <Link href="/" className="brand" aria-label="AgriRoute AI home"><span className="brand-icon"><Sprout size={23}/></span><span>AgriRoute<span className="brand-ai"> AI</span><small>HARVEST INTELLIGENCE</small></span></Link>
    <nav aria-label="Main navigation"><Link href="/" className={!demo&&!live&&!mandi&&!farmer&&!coordinator ? "nav-active" : ""}>Home</Link><Link href="/demo" className={demo ? "nav-active" : ""}>Demo Lab</Link><Link href="/live" className={live?"nav-active":""}>Live assisted</Link><Link href="/mandi" className={mandi?"nav-active":""}>Mandi lab</Link><Link href="/#methodology">Our approach</Link></nav>
    <div className="header-actions"><Link href="/farmer" className="nav-cta" aria-current={farmer?"page":undefined}>Farmer <ArrowUpRight size={17}/></Link><Link href="/coordinator" className="nav-cta" aria-current={coordinator?"page":undefined}>Coordinator <ArrowUpRight size={17}/></Link><ThemeToggle/></div>
  </header>;
}
