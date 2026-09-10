"use client";

/**
 * ArchiFlow — décors de fond (façon Haikei), 100 % codés, 0 asset externe.
 *
 * Règles :
 *  - toujours `aria-hidden` + `pointer-events-none` + `overflow-hidden`
 *  - toujours derrière le contenu (`-z-10` dans un parent `relative`)
 *  - jamais au-dessus d'une table, d'un texte long ou d'un formulaire
 *  - STATIQUES : aucun fond d'application ne s'anime
 *  - tous les IDs SVG sont préfixés `af-` (pas de collision de <pattern>/<mask>)
 *
 * Les 4 décors et leur usage :
 *   <AppDecor/>    -> fond global de TOUTE l'app authentifiée (canvas)
 *   <HeroDecor/>   -> panneau sombre d'auth / marketing (hero)
 *   <PanelDecor/>  -> intérieur d'un grand panneau vide (états vides)
 *   <WavesDecor/>  -> pied de page / page d'erreur
 */

/* ------------------------------------------------------------------ */
/* Fond global de l'application                                        */
/* ------------------------------------------------------------------ */
export function AppDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
    >
      {/* 1. Deux halos très diffus, haut de page, en diagonale */}
      <div
        className="absolute -left-[12%] -top-[42%] h-[70vh] w-[62vw] rounded-full blur-3xl"
        style={{
          opacity: "var(--deco-halo-a-op)",
          background:
            "radial-gradient(closest-side, var(--deco-halo-a), transparent 72%)",
        }}
      />
      <div
        className="absolute -right-[16%] -top-[34%] h-[62vh] w-[56vw] rounded-full blur-3xl"
        style={{
          opacity: "var(--deco-halo-b-op)",
          background:
            "radial-gradient(closest-side, var(--deco-halo-b), transparent 72%)",
        }}
      />

      {/* 2. Texture de points, masquée : visible en haut, disparaît
             totalement avant les zones de contenu dense */}
      <div
        className="absolute inset-x-0 top-0 h-[68vh]"
        style={{
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 42%, transparent 84%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 42%, transparent 84%)",
        }}
      >
        <svg className="h-full w-full">
          <defs>
            <pattern
              id="af-decor-dots"
              width="22"
              height="22"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="1.4"
                cy="1.4"
                r="1.4"
                style={{ fill: "var(--deco-dot)" }}
              />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#af-decor-dots)"
            style={{ opacity: "var(--deco-dot-op)" }}
          />
        </svg>
      </div>

      {/* 3. Remontée basse : comble le vide sous les contenus courts
             (une liste de 3 lignes dans une page de 1000px) */}
      <div
        className="absolute inset-x-0 -bottom-[10%] h-[42vh]"
        style={{
          opacity: "calc(var(--deco-halo-a-op) * 0.7)",
          background:
            "radial-gradient(120% 100% at 50% 120%, var(--deco-halo-a), transparent 68%)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero sombre (login / register / page marketing)                     */
/* ------------------------------------------------------------------ */
export function HeroDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[#0a0a0c]" />
      {/* halos */}
      <div className="absolute -left-[20%] top-[-20%] h-[560px] w-[560px] rounded-full bg-[#10b981] opacity-[0.22] blur-[120px]" />
      <div className="absolute -bottom-[30%] right-[-15%] h-[620px] w-[620px] rounded-full bg-[#14b8a6] opacity-[0.16] blur-[130px]" />
      {/* grille fine */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(120% 90% at 20% 10%, #000 0%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(120% 90% at 20% 10%, #000 0%, transparent 75%)",
        }}
      />
      {/* contour lumineux en bas */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#10b981]/40 to-transparent" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Intérieur d'un grand panneau (états vides)                          */
/* ------------------------------------------------------------------ */
export function PanelDecor({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden " +
        (className ?? "")
      }
    >
      <div
        className="absolute inset-0"
        style={{
          opacity: "var(--deco-dot-op)",
          backgroundImage:
            "radial-gradient(var(--deco-dot) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage:
            "radial-gradient(80% 70% at 50% 0%, #000 0%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(80% 70% at 50% 0%, #000 0%, transparent 78%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--deco-halo-a), transparent)",
          opacity: "calc(var(--deco-halo-a-op) * 1.2)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vagues empilées (pied de page / erreur)                             */
/* ------------------------------------------------------------------ */
export function WavesDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-52 overflow-hidden"
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 224C180 288 360 160 540 160s360 128 540 128 360-96 360-96v128H0z"
          style={{ fill: "var(--deco-halo-b)" }}
          opacity="0.10"
        />
        <path
          d="M0 256C160 320 320 192 480 192s320 128 480 128 480-96 480-96v96H0z"
          style={{ fill: "var(--deco-halo-a)" }}
          opacity="0.14"
        />
        <path
          d="M0 288C160 352 320 224 480 224s320 128 480 128 480-96 480-96v64H0z"
          style={{ fill: "var(--deco-halo-a)" }}
          opacity="0.18"
        />
      </svg>
    </div>
  );
}
