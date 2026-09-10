#!/usr/bin/env node
/**
 * ArchiFlow — theme-audit.mjs
 *
 * POURQUOI CE SCRIPT EXISTE
 * Un agent qui ne voit pas les captures d'écran ne peut pas juger "est-ce que
 * c'est propre". Il peut en revanche mesurer. Ce script transforme un problème
 * visuel flou en liste d'éléments fautifs, vérifiable et reproductible.
 *
 * CE QU'IL DÉTECTE
 *   1. SURFACE_CLAIR_EN_SOMBRE  : un bloc encore blanc en mode sombre (le bug
 *      n°1 des dark modes bricolés — bg-white oublié)
 *   2. SURFACE_SOMBRE_EN_CLAIR  : un grand bloc noir en mode clair
 *   3. CONTRASTE_FAIBLE         : texte sous 4.5:1 (3:1 pour le grand texte)
 *   4. COULEUR_HARDCODEE        : classes bg-white / text-zinc-500 / border-zinc-200
 *      au lieu des tokens sémantiques
 *   5. COLOR_SCHEME_MANQUANT    : <html> sans color-scheme -> scrollbars et
 *      contrôles natifs restent clairs en mode sombre
 *
 * USAGE
 *   node scripts/theme-audit.mjs --url=http://localhost:3000 \
 *        --routes=/,/mes-documents,/login --out=theme-audit
 *
 * Sortie : theme-audit/report.md + theme-audit/report.json + 1 PNG par
 * (route, thème). Code de sortie 1 si au moins un problème -> utilisable en CI.
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=") || "true"];
  }),
);

const BASE = args.get("url") ?? "http://localhost:3000";
const ROUTES = (args.get("routes") ?? "/")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const THEMES = (args.get("themes") ?? "light,dark").split(",");
const OUT = path.resolve(args.get("out") ?? "theme-audit");
const WIDTH = Number(args.get("width") ?? 1440);
const HEIGHT = Number(args.get("height") ?? 900);

fs.mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------------ */
/* Audit exécuté DANS la page                                          */
/* ------------------------------------------------------------------ */
function auditPage(expectedTheme) {
  const parseColor = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
  };
  const relLum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: fg.a + bg.a * (1 - fg.a),
  });
  const contrast = (a, b) => {
    const [l1, l2] = [relLum(a), relLum(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };
  const pathOf = (el) => {
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && parts.length < 5) {
      const cls = (cur.getAttribute("class") ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .join(".");
      parts.unshift(cur.tagName.toLowerCase() + (cls ? "." + cls : ""));
      cur = cur.parentElement;
    }
    return parts.join(" > ");
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cs = getComputedStyle(el);
    return (
      cs.visibility !== "hidden" &&
      cs.display !== "none" &&
      Number(cs.opacity) > 0.05
    );
  };
  const allowed = (el, attr) => {
    let cur = el;
    while (cur) {
      if (cur.hasAttribute?.(attr)) return true;
      cur = cur.parentElement;
    }
    return false;
  };
  /** Fond réellement perçu : on empile les ancêtres jusqu'à l'opacité pleine */
  const effectiveBg = (el) => {
    let acc = null;
    let cur = el;
    while (cur instanceof Element) {
      const c = parseColor(getComputedStyle(cur).backgroundColor);
      if (c && c.a > 0) acc = acc ? over(acc, c) : c;
      if (acc && acc.a > 0.995) break;
      cur = cur.parentElement;
    }
    if (!acc) return { r: 255, g: 255, b: 255, a: 1 };
    if (acc.a < 0.995) {
      const canvas = parseColor(
        getComputedStyle(document.documentElement).backgroundColor,
      ) ?? { r: 255, g: 255, b: 255, a: 1 };
      acc = over(acc, canvas);
    }
    return acc;
  };

  const issues = { surfaces: [], contrast: [], hardcoded: [], colorScheme: [] };
  const els = Array.from(document.querySelectorAll("body *")).filter(
    (el) => !el.closest("[aria-hidden='true']"),
  );

  /* --- 1 & 2 : surfaces incohérentes avec le thème --- */
  for (const el of els) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const area = r.width * r.height;
    if (area < 4000) continue;
    const cs = getComputedStyle(el);
    const own = parseColor(cs.backgroundColor);
    if (!own || own.a < 0.35) continue; // fond transparent ou simple voile
    const lum = relLum(own);
    const dark = expectedTheme === "dark";
    if (dark && lum > 0.55 && !allowed(el, "data-theme-allow-light")) {
      issues.surfaces.push({
        kind: "SURFACE_CLAIR_EN_SOMBRE",
        selector: pathOf(el),
        color: cs.backgroundColor,
        areaPx: Math.round(area),
        text: (el.textContent ?? "").trim().slice(0, 60),
      });
    }
    if (!dark && lum < 0.06 && area > 60000 && !allowed(el, "data-theme-allow-dark")) {
      issues.surfaces.push({
        kind: "SURFACE_SOMBRE_EN_CLAIR",
        selector: pathOf(el),
        color: cs.backgroundColor,
        areaPx: Math.round(area),
        text: (el.textContent ?? "").trim().slice(0, 60),
      });
    }
  }

  /* --- 3 : contraste du texte --- */
  for (const el of els) {
    if (!visible(el)) continue;
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType !== 3) continue;
      const txt = node.textContent?.trim() ?? "";
      if (txt.length < 3) continue;
      const cs = getComputedStyle(el);
      const fg = parseColor(cs.color);
      if (!fg) continue;
      const bg = effectiveBg(el);
      const size = parseFloat(cs.fontSize);
      const weight = Number(cs.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const ratio = contrast(fg, bg);
      const min = large ? 3 : 4.5;
      if (ratio < min) {
        issues.contrast.push({
          kind: "CONTRASTE_FAIBLE",
          selector: pathOf(el),
          ratio: Number(ratio.toFixed(2)),
          min,
          color: cs.color,
          bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
          text: txt.slice(0, 60),
        });
      }
      break; // un seul texte par élément suffit
    }
  }

  /* --- 4 : couleurs codées en dur --- */
  const HARD =
    /(?:^|[\s:])(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline|placeholder|shadow|decoration|caret|accent)-(?:white|black|zinc|neutral|stone|gray|slate)-\d{2,3}\b|(?:^|[\s:])(?:bg|text|border|fill|stroke)-(?:white|black)\b/;
  for (const el of els) {
    const raw = el.getAttribute("class") ?? "";
    const hits = raw.split(/\s+/).filter((c) => HARD.test(" " + c + " "));
    if (hits.length) {
      issues.hardcoded.push({
        kind: "COULEUR_HARDCODEE",
        selector: pathOf(el),
        classes: hits.slice(0, 4).join(" "),
      });
    }
    const inline = el.getAttribute("style") ?? "";
    if (/#[0-9a-fA-F]{3,8}\b/.test(inline)) {
      issues.hardcoded.push({
        kind: "COULEUR_HARDCODEE",
        selector: pathOf(el),
        classes: "style inline: " + (inline.match(/#[0-9a-fA-F]{3,8}/g) ?? []).slice(0, 3).join(","),
      });
    }
  }

  /* --- 5 : color-scheme natif --- */
  const htmlScheme = getComputedStyle(document.documentElement).colorScheme;
  const hasDarkClass = document.documentElement.classList.contains("dark");
  if (!htmlScheme.includes(expectedTheme)) {
    issues.colorScheme.push({
      kind: "COLOR_SCHEME_MANQUANT",
      selector: "html",
      color: `color-scheme="${htmlScheme}" attendu "${expectedTheme}"`,
      text: "",
      areaPx: 0,
    });
  }
  if (hasDarkClass !== (expectedTheme === "dark")) {
    issues.colorScheme.push({
      kind: "CLASSE_THEME_INCOHERENTE",
      selector: "html",
      color: `class 'dark' = ${hasDarkClass} attendu ${expectedTheme === "dark"}`,
      text:
        "Le thème n'est pas appliqué à <html> : persistance localStorage ou CSP (nonce) " +
        "qui bloque le script anti-flash.",
      areaPx: 0,
    });
  }

  return {
    theme: expectedTheme,
    htmlScheme,
    hasDarkClass,
    issues,
    counts: Object.fromEntries(
      Object.entries(issues).map(([k, v]) => [k, v.length]),
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Rendu du rapport                                                    */
/* ------------------------------------------------------------------ */
function dedupe(rows, key = (r) => r.selector + "|" + (r.classes ?? r.color)) {
  const seen = new Map();
  for (const r of rows) {
    const k = key(r);
    if (seen.has(k)) seen.get(k).count = (seen.get(k).count ?? 1) + 1;
    else seen.set(k, { ...r, count: 1 });
  }
  return [...seen.values()];
}

function section(title, rows, max = 25) {
  if (!rows.length) return `### ${title}\n\nAucun problème détecté. ✅\n`;
  const deduped = dedupe(rows).sort(
    (a, b) => (b.areaPx ?? 0) - (a.areaPx ?? 0),
  );
  const lines = deduped
    .slice(0, max)
    .map((r, i) => {
      const extra =
        r.ratio !== undefined
          ? ` — contraste **${r.ratio}:1** (min ${r.min})`
          : r.areaPx
            ? ` — ${r.areaPx.toLocaleString("fr-FR")} px²`
            : "";
      return `${i + 1}. \`${r.selector}\`${extra}\n   - ${r.color ?? ""} ${r.classes ?? ""}\n   - « ${(r.text ?? "").slice(0, 70)} »`;
    })
    .join("\n");
  const more =
    deduped.length > max ? `\n\n… et ${deduped.length - max} autres.` : "";
  return `### ${title} — ${deduped.length} problème(s)\n\n${lines}${more}\n`;
}

/* ------------------------------------------------------------------ */
/* Exécution                                                           */
/* ------------------------------------------------------------------ */
const browser = await chromium.launch();
const results = [];

for (const route of ROUTES) {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({
      viewport: { width: WIDTH, height: HEIGHT },
      colorScheme: theme === "dark" ? "dark" : "light",
      deviceScaleFactor: 1,
    });
    await ctx.addInitScript((t) => {
      try {
        window.localStorage.setItem("theme", t);
      } catch {
        /* ignore */
      }
      document.documentElement.classList.toggle("dark", t === "dark");
      document.documentElement.style.colorScheme = t;
    }, theme);
    const page = await ctx.newPage();
    const url = BASE.replace(/\/$/, "") + route;
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    } catch {
      console.error(`⚠️  ${url} : chargement incomplet, on analyse quand même.`);
    }
    await page.waitForTimeout(700);
    const data = await page.evaluate(auditPage, theme);
    const slug =
      (route.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "root") +
      `-${theme}`;
    const shot = path.join(OUT, `${slug}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    await ctx.close();
    results.push({ route, url, ...data, screenshot: shot });
    console.log(
      `[${theme}] ${route} -> ${Object.entries(data.counts)
        .map(([k, v]) => `${k}:${v}`)
        .join(" ")}`,
    );
  }
}

await browser.close();

const total = results.reduce(
  (n, r) => n + Object.values(r.counts).reduce((a, b) => a + b, 0),
  0,
);

const md = [
  "# ArchiFlow — audit de thème (clair / sombre)",
  "",
  `Généré le ${new Date().toISOString()} — cible ${BASE}`,
  `Routes : ${ROUTES.join(", ")} — thèmes : ${THEMES.join(", ")} — ${WIDTH}×${HEIGHT}`,
  "",
  `## Total : ${total} problème(s)`,
  "",
  "| route | thème | surfaces | contraste | hardcodes | color-scheme |",
  "|---|---|---|---|---|---|",
  ...results.map(
    (r) =>
      `| ${r.route} | ${r.theme} | ${r.counts.surfaces} | ${r.counts.contrast} | ${r.counts.hardcoded} | ${r.counts.colorScheme} |`,
  ),
  "",
  "## Détail",
  "",
  ...results.flatMap((r) => [
    `## ${r.route} — ${r.theme}`,
    "",
    `Capture : \`${path.relative(process.cwd(), r.screenshot)}\` (à ouvrir dans l'IDE, l'agent comme le dev la voient)`,
    "",
    section("Surfaces incohérentes avec le thème", r.issues.surfaces),
    section("Contrastes insuffisants", r.issues.contrast, 15),
    section("Couleurs codées en dur (à remplacer par des tokens)", r.issues.hardcoded),
    section("color-scheme / classe de thème", r.issues.colorScheme),
    "",
  ]),
].join("\n");

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(OUT, "report.md"), md);

console.log(
  `\n${total} problème(s) — rapport : ${path.join(OUT, "report.md")} (captures dans le même dossier)`,
);
process.exit(total > 0 ? 1 : 0);
