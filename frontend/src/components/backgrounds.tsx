"use client";

export function AppDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
    >
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

// Alias de compatibilité
export const AppBackgroundLight = AppDecor;

export function HeroDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[#0a0a0c]" />
      <div className="absolute -left-[20%] top-[-20%] h-[560px] w-[560px] rounded-full bg-[#10b981] opacity-[0.22] blur-[120px]" />
      <div className="absolute -bottom-[30%] right-[-15%] h-[620px] w-[620px] rounded-full bg-[#14b8a6] opacity-[0.16] blur-[130px]" />
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
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#10b981]/40 to-transparent" />
    </div>
  );
}

// Alias
export const AuthHeroBackground = HeroDecor;

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

// Alias pour compatibilité
export function DotGridLight() {
  return <PanelDecor />;
}
