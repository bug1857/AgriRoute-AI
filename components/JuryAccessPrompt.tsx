"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

export default function JuryAccessPrompt() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);

  return <dialog ref={dialog} className="jury-access-dialog" aria-labelledby="jury-access-title">
    <button className="jury-access-close" type="button" aria-label="Close jury access message" onClick={() => dialog.current?.close()}><X size={19}/></button>
    <span className="eyebrow">PUBLIC JURY PREVIEW · NO ACCOUNT NEEDED</span>
    <h2 id="jury-access-title">Here for the jury?</h2>
    <p>Skip the email and password. The public Jury Demo shows both the Coordinator and Hindi Farmer views with read-only synthetic examples.</p>
    <div className="jury-access-actions">
      <Link className="button-lime" href="/jury-demo">Open public Jury Demo <ArrowRight size={17}/></Link>
      <button className="button-outline" type="button" onClick={() => dialog.current?.close()}>Continue to sign in</button>
    </div>
  </dialog>;
}
