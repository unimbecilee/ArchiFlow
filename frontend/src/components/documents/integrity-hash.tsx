"use client";

import { useState } from "react";
import { Copy, Check } from "@phosphor-icons/react";

export function IntegrityHash({ hash }: { hash?: string }) {
  const [copied, setCopied] = useState(false);
  if (!hash) {
    return <p className="text-sm text-muted-foreground">Empreinte non encore calculée.</p>;
  }
  const short = hash.slice(0, 12);
  return (
    <div className="flex items-center gap-2">
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs" title={hash}>
        {short}…
      </code>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        aria-label="Copier l'empreinte SHA-256"
        onClick={async () => {
          await navigator.clipboard.writeText(hash);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}
