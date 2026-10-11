import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Check, CloudSun, Leaf, MapPin, MoveUpRight, Route, Sprout } from "lucide-react";
import Header from "@/components/Header";
import { world, geo, money, quantity, cropLabels, source } from "@/lib/world";
import { actionLabels, planLot } from "@/lib/planner";

export default function Home() {
  const previewLot = world.lots.find(l => l.crop === "tomato" && planLot(world,geo,l,"balanced").best) ?? world.lots.find(l=>planLot(world,geo,l,"balanced").best)!;
  const preview = planLot(world,geo,previewLot,"balanced");
  return <><Header/><main id="main">
    <section className="hero">
      <Image src="/harvest-landscape.jpg" alt="Sunlight across a harvested agricultural landscape" fill priority sizes="100vw" className="hero-photo"/>
      <div className="hero-shade"/>
      <div className="hero-content">
        <span className="hero-eyebrow"><span className="live-dot"/> A BETTER PATH FROM FARM TO MARKET</span>
        <h1>Every harvest.<br/>A better way<br/><em>forward.</em></h1>
        <p>Your produce has a window. Make it count.<br/>Compare when to sell, where to go, and whether<br className="desktop-break"/> to store—with every rupee explained.</p>
        <div className="hero-actions"><Link href="/demo" className="button-lime">Explore the demo <ArrowUpRight size={20}/></Link><a href="#methodology" className="button-glass">See how it works <ArrowRight size={18}/></a></div>
        <div className="hero-note"><Check size={14}/> Transparent calculations <span/> Reproducible synthetic data</div>
      </div>
      <div className="harvest-preview">
        <div className="preview-heading"><span><Leaf size={17}/> HARVEST SNAPSHOT</span><span className="tiny-pill">SEED 42</span></div>
        <div className="preview-lot"><span className="crop-glyph">◉</span><div><strong>{cropLabels[previewLot.crop]} · Lot {String(previewLot.lot_id+1).padStart(2,"0")}</strong><small>{quantity(previewLot.kg)} kg · {previewLot.region} region</small></div><MoveUpRight size={19}/></div>
        <div className="preview-weather"><div><CloudSun size={20}/><strong>{preview.weather.temp_c.toFixed(1)}°C</strong><small>Synthetic weather</small></div><div><Route size={20}/><strong>{preview.best!.distanceKm.toFixed(1)} km</strong><small>Modelled distance</small></div></div>
        <div className="preview-decision"><small>BEST ELIGIBLE OPTION · DETERMINISTIC</small><div><strong>{actionLabels[preview.best!.action]}</strong><span>{preview.best!.marketName}</span></div><p>Estimated net proceeds <b>{money(preview.best!.net)}</b></p></div>
        <Link href={`/demo?lot=${previewLot.lot_id}`} className="preview-link">Explore this lot <ArrowRight size={16}/></Link>
      </div>
      <div className="hero-bottom"><div><span className="hero-caption"><Sprout size={18}/> BUILT FOR THE DECISION THAT MATTERS</span><small>Round 2 prototype · decision support</small></div><div className="hero-data"><span><b>{world.lots.length}</b> harvest lots</span><span><b>{new Set(world.lots.map(l=>l.crop)).size}</b> crop types</span><span><b>{Object.values(world.prices)[0].length}</b> input days</span></div></div>
    </section>
    <section className="method-section" id="methodology"><div className="section-intro"><span className="eyebrow">GROWING CLARITY, NOT GUESSWORK</span><h2>Good decisions.<br/><em>Grounded in evidence.</em></h2><p>One lot. Three choices. A clear view of the trade-offs.<br/>Explore the original Project 1 world without disguising<br className="desktop-break"/> assumptions as real-world facts.</p></div><div className="method-steps">
      <article><span className="step-number">01</span><MapPin size={25}/><h3>Start with your harvest</h3><p>Select a lot on the map. Crop, quantity, harvest day and heat-adjusted shelf life come from the original seeded dataset.</p></article>
      <article><span className="step-number">02</span><Route size={25}/><h3>Compare every path</h3><p>See selling, storage and rerouting options, with transport costs, spoilage and the usable-life margin at arrival.</p></article>
      <article><span className="step-number">03</span><Leaf size={25}/><h3>Know what changes</h3><p>Move the risk slider or stress-test prices and delays. Watch actual eligibility and financial calculations respond.</p></article>
    </div></section>
    <section className="source-strip"><span className="source-icon"><Check size={21}/></span><div><strong>A small world. Fully reproducible.</strong><p>{quantity(source.total_kg)} kg across 30 synthetic lots. Five markets. Original seed 42. No invented farmer impact or AI results.</p></div><Link href="/demo">Open Demo Lab <ArrowUpRight size={19}/></Link></section>
  </main><footer className="site-footer"><span>© 2026 AgriRoute AI</span><span>Illustrative synthetic model · Gemini evidence in the Demo Lab</span><a href="https://images.unsplash.com/photo-1500382017468-9049fed747ef" target="_blank" rel="noreferrer">Landscape: Unsplash</a></footer></>;
}
