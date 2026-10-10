import type { Metadata } from "next";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "./globals.css";
import "./polish.css";
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/600.css';
import './coordinator.css';
import './theme.css';

export const metadata: Metadata = { title: "AgriRoute AI · A better path for every harvest", description: "Explore transparent harvest-to-market decisions in a reproducible synthetic world." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth" data-theme="light" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:'try{if(localStorage.getItem("agriroute-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}'}}/></head><body><a href="#main" className="skip-link">Skip to content</a>{children}</body></html>;
}
