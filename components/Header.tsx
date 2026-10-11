import Link from "next/link";
import { ArrowUpRight, Sprout } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
export default function Header({ demo = false,live = false,mandi = false,farmer = false,coordinator = false }: {demo?: boolean;live?:boolean;mandi?:boolean;farmer?:boolean;coordinator?:boolean}) {
  return <header className="site-header">
    <Link href="/" className="brand" aria-label="AgriRoute AI home"><span className="brand-icon"><Sprout size={23}/></span><span>AgriRoute<span className="brand-ai"> AI</span><small>HARVEST INTELLIGENCE</small></span></Link>
    <div className="header-actions"><ThemeToggle/></div>
    <div className="header-navigation">
      <div className="workspace-navigation"><span className="navigation-label">Explore & plan</span><nav aria-label="Main navigation"><Link href="/" aria-current={!demo&&!live&&!mandi&&!farmer&&!coordinator?"page":undefined} className={!demo&&!live&&!mandi&&!farmer&&!coordinator ? "nav-active" : ""}>Home</Link><Link href="/demo" aria-current={demo?"page":undefined} className={demo ? "nav-active" : ""}>Demo Lab</Link><Link href="/live" aria-current={live?"page":undefined} className={live?"nav-active":""}>Live assisted</Link><Link href="/mandi" aria-current={mandi?"page":undefined} className={mandi?"nav-active":""}>Mandi lab</Link><Link href="/#jury-demo" className="nav-jury">Jury Demo</Link><Link href="/#methodology">Our approach</Link></nav></div>
      <div className="role-navigation"><span className="navigation-label">Authorized workspaces · sign-in required</span><nav aria-label="Role navigation"><Link href="/farmer" className="nav-cta" aria-label="Farmer" aria-current={farmer?"page":undefined}><span>Farmer<small>View approved plan</small></span><ArrowUpRight size={17}/></Link><Link href="/coordinator" className="nav-cta" aria-label="Coordinator" aria-current={coordinator?"page":undefined}><span>Coordinator<small>Review & approve lots</small></span><ArrowUpRight size={17}/></Link></nav></div>
    </div>
  </header>;
}
