"use client";

import { useState } from "react";
import Link from "next/link";

function AuroraMeshPreview() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#f6f7f9]">
      <svg width="100%" height="100%" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="p1-a" cx="22%" cy="18%" r="68%"><stop offset="0%" stopColor="#10b981" stopOpacity="0.18" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></radialGradient>
          <radialGradient id="p1-b" cx="86%" cy="12%" r="64%"><stop offset="0%" stopColor="#14b8a6" stopOpacity="0.15" /><stop offset="100%" stopColor="#14b8a6" stopOpacity="0" /></radialGradient>
          <radialGradient id="p1-c" cx="58%" cy="92%" r="72%"><stop offset="0%" stopColor="#34d399" stopOpacity="0.13" /><stop offset="100%" stopColor="#34d399" stopOpacity="0" /></radialGradient>
          <pattern id="p1-dot" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1.25" cy="1.25" r="1.25" fill="#059669" fillOpacity="0.05" /></pattern>
        </defs>
        <ellipse cx="22%" cy="16%" rx="38%" ry="42%" fill="url(#p1-a)"><animateTransform attributeName="transform" type="translate" values="0 0; 8 -6; 0 0" dur="11s" repeatCount="indefinite" /></ellipse>
        <ellipse cx="86%" cy="14%" rx="36%" ry="38%" fill="url(#p1-b)"><animateTransform attributeName="transform" type="translate" values="0 0; -7 6; 0 0" dur="12s" repeatCount="indefinite" /></ellipse>
        <ellipse cx="58%" cy="92%" rx="52%" ry="42%" fill="url(#p1-c)"><animateTransform attributeName="transform" type="translate" values="0 0; 4 -9; 0 0" dur="13s" repeatCount="indefinite" /></ellipse>
        <rect width="100%" height="100%" fill="url(#p1-dot)" opacity="0.9" />
      </svg>
    </div>
  );
}

function StackedPeaksPreview() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#f6f7f9]">
      <svg width="100%" height="100%" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="p2-a" cx="18%" cy="20%" r="60%"><stop offset="0%" stopColor="#10b981" stopOpacity="0.09" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></radialGradient>
          <linearGradient id="p2-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="white" stopOpacity="0" /><stop offset="100%" stopColor="white" stopOpacity="1" /></linearGradient>
          <mask id="p2-mask"><rect width="100%" height="100%" fill="url(#p2-fade)" /></mask>
        </defs>
        <ellipse cx="18%" cy="18%" rx="30%" ry="32%" fill="url(#p2-a)" />
        {/* Peaks anguleux */}
        <g mask="url(#p2-mask)">
          <svg x="0" y="48%" width="100%" height="52%" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden>
            <path d="M0,120 L240,40 L480,140 L720,20 L960,110 L1200,30 L1440,90 L1440,320 L0,320 Z" fill="#ecfdf5" fillOpacity="0.95" />
            <path d="M0,160 L260,100 L500,180 L760,80 L1020,150 L1280,90 L1440,140 L1440,320 L0,320 Z" fill="#d1fae5" fillOpacity="0.85" />
            <path d="M0,210 L320,150 L560,220 L800,140 L1080,190 L1320,150 L1440,200 L1440,320 L0,320 Z" fill="#a7f3d0" fillOpacity="0.55" />
          </svg>
        </g>
        <rect width="100%" height="100%" fill="none" stroke="#10b981" strokeOpacity="0.04" strokeWidth="1" strokeDasharray="22 22" />
      </svg>
    </div>
  );
}

function BlobScenePreview() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#f6f7f9]">
      <svg width="100%" height="100%" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="p3-a" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#10b981" stopOpacity="0.16" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></radialGradient>
          <radialGradient id="p3-b" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#14b8a6" stopOpacity="0.14" /><stop offset="100%" stopColor="#14b8a6" stopOpacity="0" /></radialGradient>
        </defs>
        {/* Blob organique 1 */}
        <g opacity="0.9">
          <path d="M 210 120 C 310 40, 420 80, 460 160 C 500 240, 380 320, 280 280 C 180 240, 110 200, 210 120 Z" fill="url(#p3-a)" />
        </g>
        <g opacity="0.9">
          <path d="M 620 60 C 740 20, 860 90, 830 180 C 800 270, 680 310, 590 240 C 500 170, 500 100, 620 60 Z" fill="url(#p3-b)" />
        </g>
        <g opacity="0.7">
          <path d="M 380 380 C 520 340, 660 400, 640 480 C 620 560, 460 580, 340 520 C 220 460, 240 420, 380 380 Z" fill="#a7f3d0" fillOpacity="0.18" />
        </g>
        {/* Grille très fine */}
        <g opacity="0.05" stroke="#059669" strokeWidth="0.7"><path d="M 22 0 V 600 M 44 0 V 600 M 66 0 V 600" /><path d="M 0 22 H 1000 M 0 44 H 1000" /></g>
      </svg>
    </div>
  );
}

const OPTIONS = [
  {
    id: "aurora",
    name: "1 — Aurora Mesh (vivant)",
    desc: "3 blobs flous qui dérivent lentement (11-13s). Le plus ‘qui donne vie’ sans charger le bas. Sobre, lumineux.",
    comp: AuroraMeshPreview,
    tags: "Blurry Gradients + Grid",
  },
  {
    id: "peaks",
    name: "2 — Stacked Peaks (graphique)",
    desc: "Pics anguleux Haikei en bas + halo doux en haut. Plus structuré, énergique, remplit les grands vides.",
    comp: StackedPeaksPreview,
    tags: "Layered Peaks + Grid",
  },
  {
    id: "blob",
    name: "3 — Blob Scene (organique)",
    desc: "Formes irrégulières douces, moins géométrique que les ellipses. Le plus ‘design’, plus chaleureux.",
    comp: BlobScenePreview,
    tags: "Blob + Grid",
  },
];

export default function PreviewHaikeiPage() {
  const [active, setActive] = useState<string>("aurora");
  return (
    <div className="min-h-[100dvh] bg-[#f6f7f9] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Aperçu Haikei</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">Choisis ton fond qui donne vie</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500">Les 3 fonds sont en SVG inline, fixed z-0, cartes en relative z-10. Clique “Appliquer” pour l’installer globalement (rebuild inclus).</p>
          </div>
          <Link href="/mes-documents" className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-zinc-50">← Retour</Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {OPTIONS.map((opt) => {
            const Comp = opt.comp;
            const isActive = active === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setActive(opt.id)}
                className={`text-left group relative overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all ${isActive ? "border-emerald-400 ring-2 ring-emerald-500/20" : "border-zinc-200 hover:border-zinc-300 hover:shadow"}`}
              >
                <div className="relative h-[280px] overflow-hidden bg-[#f6f7f9]">
                  <Comp />
                  <div className="absolute inset-0 m-3 rounded-xl border border-zinc-200 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                    <p className="text-xs font-semibold text-zinc-900">Carte exemple</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">Reste lisible au-dessus du fond — c’est le test AA.</p>
                    <div className="mt-2 h-2 w-16 rounded bg-zinc-100" />
                  </div>
                  {isActive && <span className="absolute right-3 top-3 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">Sélectionné</span>}
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-zinc-900">{opt.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{opt.desc}</p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-emerald-700">{opt.tags}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-zinc-900">Aperçu plein écran : <span className="font-mono text-emerald-700">{active}</span></p>
          <div className="relative mt-3 h-[380px] overflow-hidden rounded-xl border border-zinc-200 bg-[#f6f7f9]">
            {active === "aurora" && <AuroraMeshPreview />}
            {active === "peaks" && <StackedPeaksPreview />}
            {active === "blob" && <BlobScenePreview />}
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold">Exemple de contenu</p>
                <p className="mt-1 text-sm text-zinc-500">Le fond Haikei habille les goulottes, les cartes restent blanches et le header reste net.</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">Dis-moi “applique 1/2/3” et je l’installe en fond GLOBAL (fixed z-0, rebuild auto).</p>
        </div>
      </div>
    </div>
  );
}
