/**
 * ArchiFlow — fond GLOBAL “Gemini Glass” adapté (SVG inline, zéro asset)
 * Inspiré de ton screenshot Gemini : grosse coulée liquide iridescente + grille + glass, mais en palette ArchiFlow
 * - Base #fcfdfd, 1 maille grille très fine 3%, 3 blobs liquides XL en dégradé emerald→teal→sky→lavande (verre, highlight, blur)
 * - Cartes restent blanches opaques z-10, fond fixed z-0, lisible AA
 */

export function AppBackgroundLight() {
  return (
    <>
      {/* LIGHT — Gemini Glass clair */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#fcfdfd] dark:hidden"
        style={{ backgroundColor: "#fcfdfd" }}
      >
      <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          {/* Grille fine comme sur le screenshot */}
          <pattern id="af-gemini-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 H 0 V 48" fill="none" stroke="#e2e8f0" strokeOpacity="0.38" strokeWidth="0.7" />
          </pattern>
          {/* Dégradé principal liquide — emerald/teal brand + touche sky/lavande pour l’iridescence Gemini, mais assourdie */}
          <linearGradient id="af-liquid-main" x1="14%" y1="18%" x2="88%" y2="84%" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.95" />
            <stop offset="28%" stopColor="#14b8a6" stopOpacity="0.92" />
            <stop offset="58%" stopColor="#38bdf8" stopOpacity="0.78" />
            <stop offset="82%" stopColor="#a5b4fc" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#f0fdfa" stopOpacity="0.92" />
          </linearGradient>
          <linearGradient id="af-liquid-small" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#22d3ee" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id="af-highlight" cx="32%" cy="22%" r="58%">
            <stop offset="0%" stopColor="white" stopOpacity="0.52" />
            <stop offset="58%" stopColor="white" stopOpacity="0.12" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="af-vignette" cx="50%" cy="48%" r="78%">
            <stop offset="68%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="#f6f7f9" stopOpacity="1" />
          </radialGradient>
          <filter id="af-soft-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <filter id="af-glass-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Fond grille */}
        <rect width="1440" height="900" fill="white" />
        <rect width="1440" height="900" fill="url(#af-gemini-grid)" />

        {/* Aura très douce derrière le liquide — comme le halo bleu du screenshot */}
        <ellipse cx="880" cy="180" rx="420" ry="260" fill="#38bdf8" fillOpacity="0.07" filter="url(#af-soft-blur)" />
        <ellipse cx="240" cy="340" rx="220" ry="160" fill="#a5b4fc" fillOpacity="0.055" filter="url(#af-soft-blur)" />
        <ellipse cx="220" cy="760" rx="340" ry="220" fill="#2563eb" fillOpacity="0.06" filter="url(#af-soft-blur)" />

        {/* Blob principal — coulée liquide centrale, la star du screenshot */}
        <g opacity="0.98">
          <path
            d="M 420 220 C 560 140, 760 110, 860 210 C 960 310, 860 520, 720 580 C 580 640, 420 620, 320 520 C 220 420, 280 300, 420 220 Z
               M 520 340 C 620 300, 740 320, 780 400 C 820 480, 740 560, 620 560 C 500 560, 420 480, 520 340 Z"
            fill="url(#af-liquid-main)"
            fillRule="evenodd"
          />
          {/* Highlight verre */}
          <path
            d="M 440 240 C 560 180, 720 150, 820 240 C 900 330, 820 480, 700 540 C 580 600, 400 580, 340 480 C 280 380, 340 280, 440 240 Z"
            fill="url(#af-highlight)"
            opacity="0.9"
          />
          {/* Bord verre fin */}
          <path
            d="M 420 220 C 560 140, 760 110, 860 210 C 960 310, 860 520, 720 580 C 580 640, 420 620, 320 520 C 220 420, 280 300, 420 220 Z"
            fill="none"
            stroke="white"
            strokeOpacity="0.38"
            strokeWidth="1.6"
          />
        </g>

        {/* Gouttelettes satellites — comme en bas à droite du screenshot */}
        <g opacity="0.95">
          <path d="M 980 620 C 1020 590, 1080 600, 1088 640 C 1096 680, 1050 720, 1000 700 C 950 680, 940 640, 980 620 Z" fill="url(#af-liquid-small)" />
          <path d="M 980 625 C 1010 605, 1060 615, 1066 642 C 1072 669, 1038 695, 998 682 C 958 669, 950 640, 980 625 Z" fill="white" fillOpacity="0.22" />
        </g>
        <g opacity="0.72">
          <path d="M 600 680 C 620 670, 650 675, 652 690 C 654 705, 630 718, 610 710 C 590 702, 582 688, 600 680 Z" fill="#a5b4fc" fillOpacity="0.9" />
        </g>
        <g opacity="0.45" filter="url(#af-glass-blur)">
          <ellipse cx="280" cy="300" rx="90" ry="62" fill="#a78bfa" fillOpacity="0.18" />
          <ellipse cx="1020" cy="240" rx="38" ry="22" fill="#22d3ee" fillOpacity="0.16" />
        </g>

        {/* Faux reflets glass au sol — comme la tablette brillante du screenshot */}
        <g opacity="0.42">
          <ellipse cx="720" cy="780" rx="520" ry="22" fill="white" fillOpacity="0.85" />
          <ellipse cx="720" cy="790" rx="520" ry="14" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="1.2" />
          <circle cx="432" cy="732" r="3" fill="white" fillOpacity="0.95" />
        </g>

        {/* Vignette douce pour que les bords restent #fcfdfd et que les cartes ressortent */}
        <rect width="1440" height="900" fill="url(#af-vignette)" opacity="0.55" />

        {/* Trait grille plus marqué en haut comme sur screenshot */}
        <rect x="360" y="140" width="720" height="420" fill="none" stroke="#e2e8f0" strokeOpacity="0.0" />
      </svg>

      {/* Verres flottants décoratifs — 2 rectangles glass comme sur ton image (en haut-droite et bas-gauche) */}
      <div className="absolute right-[18%] top-[22%] hidden h-[168px] w-[220px] rounded-[18px] border border-white/60 bg-white/42 shadow-[0_16px_40px_-16px_rgba(15,23,42,0.16)] backdrop-blur-[10px] lg:block" />
      <div className="absolute left-[19%] top-[58%] hidden h-[92px] w-[140px] rounded-[14px] border border-white/50 bg-white/34 shadow-[0_10px_28px_-12px_rgba(15,23,42,0.12)] backdrop-blur-[8px] lg:block" />
    </div>
      {/* DARK — même verre mais sur zinc-950, halos plus denses pour rester vivant la nuit */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden bg-zinc-950 dark:block"
        style={{ backgroundColor: "#09090b" }}
      >
        <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <radialGradient id="af-dark-emerald" cx="22%" cy="18%" r="58%"><stop offset="0%" stopColor="#10b981" stopOpacity="0.20" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></radialGradient>
            <radialGradient id="af-dark-teal" cx="84%" cy="14%" r="54%"><stop offset="0%" stopColor="#14b8a6" stopOpacity="0.16" /><stop offset="100%" stopColor="#14b8a6" stopOpacity="0" /></radialGradient>
            <pattern id="af-dark-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 H 0 V 48" fill="none" stroke="#27272a" strokeOpacity="0.9" strokeWidth="0.6" /></pattern>
          </defs>
          <rect width="1440" height="900" fill="#09090b" />
          <rect width="1440" height="900" fill="url(#af-dark-grid)" />
          <ellipse cx="260" cy="180" rx="380" ry="300" fill="url(#af-dark-emerald)" />
          <ellipse cx="1100" cy="200" rx="420" ry="300" fill="url(#af-dark-teal)" />
          <rect width="1440" height="900" fill="white" fillOpacity="0" />
        </svg>
      </div>
    </>
  );
}

export function AuthHeroBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-zinc-950" style={{ backgroundColor: "#09090b" }}>
      <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="af-hero-grad-emerald" cx="30%" cy="24%" r="64%"><stop offset="0%" stopColor="#10b981" stopOpacity="0.26" /><stop offset="58%" stopColor="#10b981" stopOpacity="0.09" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></radialGradient>
          <radialGradient id="af-hero-grad-teal" cx="82%" cy="76%" r="60%"><stop offset="0%" stopColor="#14b8a6" stopOpacity="0.20" /><stop offset="58%" stopColor="#14b8a6" stopOpacity="0.07" /><stop offset="100%" stopColor="#14b8a6" stopOpacity="0" /></radialGradient>
          <pattern id="af-hero-grid" width="32" height="32" patternUnits="userSpaceOnUse" patternContentUnits="userSpaceOnUse"><path d="M 32 0 H 0 V 32" fill="none" stroke="#10b981" strokeOpacity="0.08" strokeWidth="0.75" /></pattern>
          <radialGradient id="af-hero-vignette" cx="50%" cy="42%" r="82%"><stop offset="66%" stopColor="white" stopOpacity="1" /><stop offset="100%" stopColor="white" stopOpacity="0" /></radialGradient>
          <mask id="af-hero-mask"><rect width="100%" height="100%" fill="url(#af-hero-vignette)" /></mask>
        </defs>
        <g mask="url(#af-hero-mask)">
          <ellipse id="af-hero-blob-a" cx="30%" cy="22%" rx="42%" ry="48%" fill="url(#af-hero-grad-emerald)" style={{ transformOrigin: "30% 22%" }} />
          <ellipse id="af-hero-blob-b" cx="82%" cy="74%" rx="38%" ry="44%" fill="url(#af-hero-grad-teal)" style={{ transformOrigin: "82% 74%" }} />
          <rect width="100%" height="100%" fill="url(#af-hero-grid)" />
        </g>
      </svg>
      <style>{`@keyframes af-hero-drift-a{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(1.8%,-1.4%,0) scale(1.05)}}@keyframes af-hero-drift-b{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(-1.6%,1.2%,0) scale(1.04)}}#af-hero-blob-a{animation:af-hero-drift-a 11s ease-in-out infinite}#af-hero-blob-b{animation:af-hero-drift-b 12s ease-in-out infinite}@media (prefers-reduced-motion: reduce){#af-hero-blob-a,#af-hero-blob-b{animation:none !important}}`}</style>
    </div>
  );
}
export function DotGridLight(){return(<div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden"><svg width="100%" height="100%" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden><defs><pattern id="af-dot-light-pattern" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1.25" cy="1.25" r="1.25" fill="#059669" fillOpacity="0.08" /></pattern><radialGradient id="af-dot-light-fade" cx="50%" cy="18%" r="78%"><stop offset="0%" stopColor="white" stopOpacity="1" /><stop offset="62%" stopColor="white" stopOpacity="0.55" /><stop offset="100%" stopColor="white" stopOpacity="0" /></radialGradient><mask id="af-dot-light-mask"><rect width="100%" height="100%" fill="url(#af-dot-light-fade)" /></mask></defs><rect width="100%" height="100%" fill="url(#af-dot-light-pattern)" mask="url(#af-dot-light-mask)" /></svg></div>)}
export function WavesLight(){return(<div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] overflow-hidden"><svg width="100%" height="100%" viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden><defs><linearGradient id="af-wave-fade2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="white" stopOpacity="0" /><stop offset="100%" stopColor="white" stopOpacity="1" /></linearGradient><mask id="af-wave-mask2"><rect width="1440" height="320" fill="url(#af-wave-fade2)" /></mask></defs><g mask="url(#af-wave-mask2)"><path d="M0,220 C240,260 480,180 720,200 C960,220 1200,260 1440,200 L1440,320 L0,320 Z" fill="#ecfdf5" /><path d="M0,250 C280,285 520,210 760,235 C1000,260 1180,285 1440,240 L1440,320 L0,320 Z" fill="#d1fae5" /><path d="M0,285 C300,310 600,250 900,270 C1120,285 1280,305 1440,280 L1440,320 L0,320 Z" fill="#a7f3d0" /></g></svg></div>)}
