# ArchiFlow — Prompt « Dark / Light propre » à coller dans OpenCode

> Fichier compagnon : le dossier `archiflow-theme-kit/` (globals.css, theme-provider.tsx,
> theme-toggle.tsx, backgrounds.tsx, scripts/theme-audit.mjs).
> Copie-le dans ton repo ArchiFlow sous `design/theme-kit/`, puis colle la section
> **PROMPT** ci-dessous à ton agent. Les blocs `@design/theme-kit/...` à la fin
> l'aident à charger les bons fichiers.

---

## 0. Comment l'utiliser (2 minutes)

```bash
# 1. dans le repo ArchiFlow
mkdir -p design/theme-kit/scripts
# 2. copier depuis le kit : globals.css, theme-provider.tsx, theme-toggle.tsx,
#    backgrounds.tsx, tailwind.v3.snippet.ts, scripts/theme-audit.mjs
git add design/theme-kit && git commit -m "chore(theme): kit de thème de référence"
# 3. lancer l'app en mode dev (elle doit répondre sur :3000)
npm run dev
```

Puis dans OpenCode :

```
@design/theme-kit/globals.css @design/theme-kit/backgrounds.tsx
@design/theme-kit/theme-provider.tsx @design/theme-kit/theme-toggle.tsx
@design/theme-kit/scripts/theme-audit.mjs

Lis ARCHIFLOW_THEME_PROMPT.md et exécute-le lot par lot, sans rien sauter.
À chaque lot : npm run build, puis node scripts/theme-audit.mjs, et tu me
restitues les chiffres. Ne passe au lot suivant que si le précédent est vert.
```

### Variante courte (si tu veux une première passe tout de suite)

À coller seule, sans le fichier, quand tu n'as pas envie de faire les 8 lots maintenant :

```
Contexte : le mode sombre d'ArchiFlow mélange clair et sombre (des panneaux restent
blancs sur fond noir, le rail se confond avec le canvas) et le mode clair a une arche
émeraude géante qui n'est pas pro.

Cause : des couleurs littérales (bg-white, text-zinc-900, border-zinc-200, dark:…) sont
écrites dans les composants au lieu de tokens sémantiques.

Tâche : crée une source unique de vérité de thème et migre les composants dessus.
1. Réécris globals.css avec deux palettes complètes en variables : background, foreground,
   card, popover, plane, muted, muted-foreground, subtle-foreground, overlay, border,
   border-strong, input, input-bg, ring, primary(+hover,+foreground), secondary, accent,
   accent-soft, success/warning/info/destructive (DEFAULT + soft + soft-foreground),
   sidebar (DEFAULT, foreground, muted, accent, active, active-foreground, border, brand),
   deco (halo-a, halo-b, dot, line) et une échelle d'élévations e1/e2/e3/pop/modal.
   Expose-les à Tailwind pour obtenir les classes bg-card, text-muted-foreground,
   border-border, shadow-e2. Modèle attendu : celui de shadcn/ui (mêmes noms de tokens).
2. Mode clair : canvas #f7f8fa, surfaces blanches, hairlines, profondeur = ombres.
   Mode sombre : canvas oklch(0.145), card oklch(0.19), popover oklch(0.225), sidebar
   oklch(0.175) (plus clair que le canvas), bordures = blanc à 9 %, profondeur = hairline
   + reflet interne. Jamais de #000 ni de #fff pur. color-scheme sur <html>.
3. Le rail suit le thème (clair en clair, sombre en sombre).
4. Migre TOUS les composants : plus aucune couleur littérale, plus AUCUN variant dark:.
   Va chercher chaque bg-white / bg-zinc-* / text-zinc-* / border-zinc-* / dark:* et
   remplace par le token équivalent. Les variantes sémantiques (succès, alerte, info,
   danger) gardent leur sens et ont une version sombre lisible.
5. Supprime l'arche émeraude géante. Le fond global devient : 2 halos très diffus en haut
   + une texture de points masquée qui disparaît avant le contenu dense + une remontée
   basse discrète. Statique, aria-hidden, pointer-events-none, jamais au-dessus du contenu,
   absent des pages d'auth. Halos plus dosés en sombre qu'en clair.
6. Ajoute un toggle Clair / Sombre / Système dans la topbar (next-themes, attribute="class",
   suppressHydrationWarning sur <html>, nonce si CSP).
Contraintes : ne touche pas à la logique métier, aux routes, aux libellés français.
Ne me dis pas « c'est fait » sans : npm run build vert + le nombre de couleurs littérales
restantes (doit être 0) + le nombre de dark: restants (0).
```

---

# PROMPT

Tu es développeur front senior spécialisé design systems. Tu travailles sur **ArchiFlow**, une GED
d'entreprise française (gestion électronique de documents + workflows d'approbation multi-étapes).

**Stack** : Next.js 15 (App Router) · TypeScript · Tailwind · Radix · Zustand · TanStack Query ·
Axios · Motion · Sonner · Lucide/Phosphor · Go 1.22 / Echo v4 côté API · PostgreSQL 15 · MinIO · Redis 7.
Surfaces : `/` (tableau de bord), `/mes-documents`, `/documents/[id]`, partagés, récents, favoris,
recherche, corbeille, `/importer`, `/ged/cells`, `/workflows`, `/approbations`, `/en-cours`,
`/termines`, `/instances/[id]`, admin (utilisateurs, workflows, politiques d'accès), paramètres.
Rôles : `admin`, `manager`, `validator`, `archivist`, `user`. **Toute l'UI est en français.**

**Contrainte absolue de travail : tu ne vois pas mes captures d'écran.** Donc tu ne dois PAS
« rendre ça plus joli » : tu dois appliquer des règles déterministes, mesurables, et vérifiables
par script. Chaque décision ci-dessous est un token ou une classe imposée. Si tu penses qu'une
règle est fausse, tu me le dis avant de coder, tu ne l'ignore pas en silence.

---

## 1. Diagnostic : ce qui ne va pas aujourd'hui (constat, décrit en mots)

### Mode clair
1. **Une immense arche émeraude/teal** traverse la colonne de contenu (≈ 40 % de la largeur,
   600 px de haut) : elle passe derrière les cartes KPI, sous le panneau « À traiter », jusqu'à
   la rangée « Récents ». Trop grande, trop saturée, trop visible → ça lit « page de vente générée
   par IA », pas « outil métier ». Le décor doit combler le vide, jamais s'imposer dans le contenu.
2. **Canvas quasi blanc + cartes blanches + hairline invisible** → aucune séparation, la grille
   paraît plate et pas finie.
3. **Trois CTA de poids identique** sur le même écran : « Importer » (topbar), le FAB rond émeraude,
   et un bouton noir « Parcourir les workflows » dans le panneau. Plus aucune hiérarchie.
4. **Panneau « À traiter »** : 380 px de blanc, une petite tuile verte perdue au milieu, aucun
   titre/sous-titre/action cohérents. Un état vide doit être *composé*, pas un vide avec une icône.
5. **Doublon d'information** : la topbar propose Importer/Rechercher, et « Accès rapide » propose
   Importer/Rechercher/Mes documents/Workflows, plus une rangée « Recherche globale ⌘K ». Le même
   contenu deux fois = l'impression d'un template rempli automatiquement.
6. **4 KPI dont 3 à `0`** et une carte « En un coup d'œil » avec une seule ligne → impression de
   produit vide / inachevé.
7. Texte secondaire en `#a1a1aa` sur blanc : sous le seuil AA, ça fait « pas fini » autant que
   « pas lisible ».

### Mode sombre (le vrai problème)
1. **Mélange clair/sombre dans le même écran** : canvas noir + cartes KPI sombres, mais les
   panneaux « À traiter », « Accès rapide », « Récents » et « En un coup d'œil » sont **blancs**.
   Dans le panneau blanc, il y a même un **bouton noir**. C'est exactement le « mélange farfelu ».
2. **Le rail de navigation et le canvas ont quasiment la même valeur** (≈ #0b0b0d vs #0a0a0a) :
   le rail disparaît, la structure de l'app s'efface.
3. **Les cartes sombres n'ont ni bordure ni relief** alors qu'en clair elles en avaient une :
   le langage d'élévation change selon le thème.
4. **Pas de `color-scheme: dark`** sur `<html>` : scrollbars, `<select>`, champs de date natifs
   restent clairs.
5. La grille décorative est visible jusqu'en bas, sans fondu, y compris derrière du contenu dense.

### Cause racine (à traiter, pas les symptômes)
1. **Pas de source unique de vérité.** Des couleurs littérales sont écrites dans les composants
   (`bg-white`, `text-zinc-900`, `border-zinc-200`, `bg-zinc-950`, `text-[#0f172a]`…). En mode
   sombre, seuls les composants qui possèdent un variant `dark:` basculent ; tous les autres
   restent clairs. **C'est la cause n°1 du rendu actuel.**
2. **Palettes incomplètes** : pas de tokens pour les bordures, les ombres, les surfaces élevées,
   le texte secondaire — donc chacun bricole localement et l'incohérence s'accumule.
3. **Élévation non pensée par mode.** En clair la profondeur vient de l'ombre ; en sombre elle
   vient de la **luminosité de la surface** + une hairline + un reflet interne. Recopier la même
   ombre dans les deux modes donne un rendu plat.
4. **Les décors ne sont pas thémés** et l'un d'eux est trop grand.

---

## 2. Le contrat : une seule source de vérité

### 2.1 Interdiction absolue dans les composants

Ces motifs ne doivent plus apparaître dans `src/**/*.tsx` (hors `globals.css`, hors SVG décoratif) :

```
bg-white  bg-black  text-white  text-black  border-white  border-black
bg-zinc-*  text-zinc-*  border-zinc-*  ring-zinc-*  divide-zinc-*  from-zinc-*  via-zinc-*  to-zinc-*
bg-gray-*  text-slate-*  border-neutral-*  … (gray, slate, stone, neutral)
bg-[#xxxxxx]  text-[#xxxxxx]  style={{ color: "#…" }}  style={{ background: "#…" }}
dark:bg-*  dark:text-*  dark:border-*     ← ⚠️ règle clé, voir ci-dessous
```

**Règle d'or : si tu écris `dark:quelquechose`, c'est qu'il manque un token.**
Tu ajoutes le token dans `globals.css` et tu utilises la classe sémantique. Les seules exceptions
autorisées sont listées en 2.5.

### 2.2 Un composant ne parle que ce vocabulaire

| Besoin | Classe autorisée |
|---|---|
| fond de page | `bg-background` |
| carte / panneau / ligne de tableau | `bg-card` + `border-border` + `shadow-e1` |
| menu, dropdown, popover, modale | `bg-popover` + `shadow-pop` |
| fond secondaire (th, footer, tag neutre) | `bg-muted` |
| survol neutre | `hover:bg-accent` |
| survol/sélection teinté marque | `bg-accent-soft` + `text-accent-soft-foreground` |
| texte principal | `text-foreground` |
| texte secondaire (obligatoire, lisible) | `text-muted-foreground` |
| texte méta non essentiel (optionnel) | `text-subtle-foreground` |
| séparateur | `border-border` · insistance : `border-border-strong` |
| action principale | `bg-primary text-primary-foreground hover:bg-primary-hover` |
| action douce (dans une carte) | `bg-accent-soft text-accent-soft-foreground` |
| succès / alerte / info / danger | `success`, `warning`, `info`, `destructive` (+ `-soft`, `-soft-foreground`) |
| rail de navigation | `bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-active`… |
| profondeur | `shadow-e1` → `shadow-e2` → `shadow-e3` → `shadow-pop` → `shadow-modal` |
| rayon | `rounded-sm` (contrôles) · `rounded-md` (petits blocs) · `rounded-lg` (cartes) · `rounded-xl` (modales, plans) · `rounded-full` (badges, avatars) |
| durée / courbe | `duration-150` (feedback) · `duration-200` (survol) · `duration-300` (panneaux) + `ease-flow` |

### 2.3 Les fichiers de référence (à reprendre tels quels)

- `@design/theme-kit/globals.css` → **remplace intégralement** `src/app/globals.css`.
  C'est la source unique : palettes claire et sombre complètes, exposition Tailwind
  (`bg-card`, `text-muted-foreground`, `shadow-e2`…), socle, scrollbar, sélection, `color-scheme`,
  squelette de chargement thémable, `prefers-reduced-motion`.
  Si le projet est en **Tailwind v3**, suivre `tailwind.v3.snippet.ts` (et lire les 4 pièges notés
  dedans) — mais ne mélange pas les deux approches.
- `@design/theme-kit/theme-provider.tsx` → `ThemeProvider` (`next-themes`, `attribute="class"`).
- `@design/theme-kit/theme-toggle.tsx` → sélecteur Clair / Sombre / Système (3 positions, accessible).
- `@design/theme-kit/backgrounds.tsx` → `<AppDecor/>`, `<HeroDecor/>`, `<PanelDecor/>`, `<WavesDecor/>`.
- `@design/theme-kit/scripts/theme-audit.mjs` → harnais de vérification (voir §7).

### 2.4 L'échelle de surfaces (à ne jamais casser)

| Niveau | Clair | Sombre | Usage |
|---|---|---|---|
| canvas | `#f7f8fa` | `oklch(0.145)` ≈ `#0a0a0c` | fond de page, toujours le plus bas |
| sidebar | `#fbfbfc` | `oklch(0.175)` ≈ `#0f0f12` | rail, **au-dessus du canvas** en sombre |
| card | `#ffffff` | `oklch(0.190)` ≈ `#131316` | cartes, tableaux, panneaux |
| popover | `#ffffff` | `oklch(0.225)` ≈ `#1a1a1e` | menus, modales, palette ⌘K |
| muted | `#f4f4f5` | `oklch(0.250)` ≈ `#1e1e23` | zones creuses, th de tableau |

**En clair on descend (#fff posé sur un canvas gris). En sombre on monte (les surfaces s'éclaircissent
avec l'élévation). On ne saute jamais une marche.** Aucun `#000` pur, aucun `#fff` pur en sombre.

### 2.5 Le rail suit le thème

Le rail est **clair en mode clair, sombre en mode sombre**. C'est ce qui supprime l'effet
« deux applications mélangées ». Décision produit assumée — ne la réinterprète pas.

> Si je veux garder un rail sombre dans les deux thèmes (variante B), je te le dirai : dans ce cas
> uniquement, on met `data-theme-allow-dark` sur le `<aside>` et on fige les tokens `--sidebar-*`
> sur les valeurs sombres. Sinon : rail adaptatif.

### 2.6 Exceptions autorisées (et seulement celles-là)

1. **Aperçu de document** (OnlyOffice / Collabora / image / PDF) : la page reste blanche, c'est
   normal — on l'entoure d'un cadre `border border-border rounded-lg bg-card p-1` et on met
   `data-theme-allow-light` sur ce conteneur, sinon l'audit le signalera.
2. **Panneau hero d'authentification** : `HeroDecor` est sombre dans les deux thèmes, c'est voulu
   (`data-theme-allow-dark`).
3. **Logos / illustrations** : assets, pas de traitement.
4. Ce sont les **seuls** endroits où une couleur littérale peut apparaître, et uniquement dans
   `backgrounds.tsx` (décors) ou dans le wrapper d'aperçu.

---

## 2.7 Les 7 pièges vérifiés — ne pas les réintroduire

Ces pièges ont été **reproduits en conditions réelles** sur un clone de ton interface. Chacun donne
exactement l'effet « dark mode pas propre ». Ils sont listés par fréquence.

1. **Une règle de base qui fixe `color` sur `h1, h2, h3`.** Un `@layer base { h1, h2, h3 { color: var(--foreground) } }`
   **écrase** l'héritage d'un parent (`text-white` sur un hero sombre). Résultat : en thème **clair**,
   le titre du panneau sombre devient noir sur fond noir → invisible. C'est l'un des « mélanges
   farfelus » les plus typiques. **Ne mets jamais `color` sur h1/h2/h3 dans le socle** ; laisse
   hériter (le kit est déjà corrigé ainsi).
2. **Le fond posé sur un enfant, pas sur le conteneur.** Si le fond du hero vient d'un composant
   absolu (`<HeroDecor/>`), le conteneur est *transparent* pour l'audit **et** pour l'accessibilité.
   Porte le fond sur l'élément lui-même (`bg-[#0a0a0c]` sur l'`<aside>`) en plus du décor.
3. **`dark:` disséminé un peu partout.** C'est le symptôme d'un token manquant. Chaque `dark:` doit
   disparaître au profit d'un token. Objectif : `rg '\bdark:' src -g '*.tsx'` → **0 résultat**.
4. **Les ombres identiques dans les deux modes.** `shadow-lg` en mode sombre sur un fond noir ne
   produit rien de visible : la carte paraît plate, la grille disparaît. En sombre : hairline blanche
   à ~9 % + reflet interne (`inset 0 1px 0 rgb(255 255 255 / .04)`).
5. **Le rail au même niveau de gris que le canvas.** Si le rail n'est pas distinct, la structure
   de l'app s'efface. En sombre le rail doit être **plus clair** que le canvas (0.175 vs 0.145),
   en clair **plus clair ou plus sombre, mais pas identique**.
6. **`color-scheme` oublié.** Sans `color-scheme: dark` sur `<html>`, les scrollbars, `<select>`,
   `<input type="date">` et les autofill restent clairs. Un seul détail natif clair fait « cassé ».
   Idem pour `scrollbar-gutter: stable` : sans lui, la barre de défilement qui apparaît décale
   toute la mise en page de 15 px.
7. **Tailwind v3 et les modificateurs d'opacité.** En v3, `bg-card/60` **ne fonctionne pas** sur une
   couleur déclarée `var(--card)`. Soit tu passes le token complet (`bg-plane`), soit tu définis une
   variable dédiée. En v4 (`@theme inline`) ça fonctionne — ne mélange pas les deux.

Piège transverse : **le flash au rechargement.** Si `next-themes` est configuré mais que la CSP
bloque le script inline (pas de `nonce`), le thème « revient au clair » à chaque navigation. C'est
le symptôme qu'on te décrit comme « le toggle ne fonctionne pas ». Vérifie-le explicitement.

---

## 2.8 Mesures de départ (à me donner AVANT de toucher au code)

Ces trois chiffres sont la ligne de base. Ils sont reproductibles, et ils descendent à 0 en fin de
Lot 7. Donne-les-moi dans ton premier message de compte rendu.

```bash
# a) couleurs littérales dans les composants (cible : 0, hors §2.6)
rg -c --glob '!**/*.svg' --glob '!**/globals.css' \
   -e '\b(bg|text|border|ring|from|via|to|fill|stroke|divide|outline|placeholder|decoration|caret|accent)-(white|black)\b' \
   -e '\b(bg|text|border|ring|from|via|to|fill|stroke|divide)-(zinc|gray|slate|neutral|stone)-[0-9]{2,3}\b' src | wc -l

# b) variants dark: de contournement (cible : 0)
rg -c '\bdark:' src -g '*.tsx' | wc -l

# c) hex en dur hors CSS/SVG (cible : 0)
rg -n '#[0-9a-fA-F]{6}\b' src --glob '!**/*.css' --glob '!**/*.svg' | wc -l
```

Référence mesurée sur un clone de ton interface, **avant** correction : `a) 62 fichiers concernés`,
`b) 0`, `c) une douzaine d'occurrences`, plus `~340 px` de zone « surface claire en mode sombre »
(le panneau « À traiter » et « Accès rapide » en blanc). Après application du kit : **a) 0, b) 0,
c) 0, 0 problème d'audit sur 6 combinaisons route × thème** (captures à l'appui). Tu n'es donc pas
en train de viser un idéal théorique : c'est atteignable et déjà atteint sur le clone.

---

## 3. Plan d'exécution : 8 lots, un commit par lot

Ne saute pas d'étape, ne fais pas les 8 lots dans un seul message. Après chaque lot :
`npm run build` (zéro erreur, zéro warning ESLint) puis tu me donnes le résultat.

### Lot 0 — Inventaire (aucune modification de code)

```bash
rg -n --glob '!**/*.svg' --glob '!**/globals.css' \
   -e '\b(bg|text|border|ring|from|via|to|fill|stroke|divide|outline|placeholder|decoration|caret|accent)-(white|black)\b' \
   -e '\b(bg|text|border|ring|from|via|to|fill|stroke|divide)-(zinc|gray|slate|neutral|stone)-[0-9]{2,3}\b' \
   src | wc -l

rg -n '\bdark:' src | wc -l
rg -n '#[0-9a-fA-F]{6}\b' src --glob '!**/*.css' --glob '!**/*.svg'
rg -n "classList|localStorage|useTheme|theme" src/app/layout.tsx src/components -g '*.tsx' | head -40
```

Rends-moi les **4 chiffres** et la liste des 20 fichiers les plus touchés. Ces chiffres sont la
ligne de départ ; en fin de Lot 7 les trois premiers doivent tomber à **0** (ou aux exceptions §2.6).

### Lot 1 — Les tokens (aucun composant touché)

Remplace `src/app/globals.css` par `@design/theme-kit/globals.css`. Configure Tailwind (§2.3).
Vérifie que `bg-card`, `text-muted-foreground`, `border-border`, `shadow-e2` compilent :
crée une page temporaire `/theme-check` (à supprimer ensuite) qui affiche 1 carte, 1 bouton,
1 badge, 1 champ, 1 tableau vide. `npm run build`. Commit : `feat(theme): tokens clair/sombre`.

> À ce stade, **l'app peut avoir l'air cassée** : c'est normal, les composants utilisent encore
> leurs anciennes couleurs. On ne juge rien avant le Lot 5.

### Lot 2 — Le thème et l'anti-flash

1. `src/app/layout.tsx` : `<html lang="fr" suppressHydrationWarning className={…}>` enveloppé dans
   `<ThemeProvider>`. Le `suppressHydrationWarning` est **obligatoire** (le script de thème modifie
   `<html>` avant l'hydratation).
2. **Si le projet a une CSP stricte** (probable vu ton score de sécu) : le script inline de
   `next-themes` sera **bloqué** → le thème « revient au clair au rechargement ». Passe `nonce`
   au provider (`<ThemeProvider nonce={nonce}>` avec le nonce issu des headers) ou ajoute un hash
   au `script-src`. **Vérifie ce point explicitement et dis-moi ce que tu trouves.**
3. Place `<ThemeToggle />` dans la topbar, à côté des notifications. Vérifie : toggle → F5 → le
   thème tient ; nouveau onglet → idem ; on ne doit voir **aucun flash blanc** au chargement en mode sombre.

### Lot 3 — Les primitives (`src/components/ui/`)

Réécris chaque primitive pour qu'elle **ne consomme que des tokens**. Aucune couleur littérale.
Recettes exactes :

**Button** (cva, 7 variantes / 4 tailles)
```
base   : inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm
         font-medium transition-[background-color,border-color,color,box-shadow] duration-150
         ease-flow select-none
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45
         focus-visible:ring-offset-2 focus-visible:ring-offset-background
         disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0
default: bg-primary text-primary-foreground shadow-e1 hover:bg-primary-hover
soft   : bg-accent-soft text-accent-soft-foreground hover:bg-accent-soft/70   ← l'action DANS une carte
outline: border border-border bg-card text-foreground hover:bg-accent hover:border-border-strong
ghost  : text-muted-foreground hover:bg-accent hover:text-foreground
danger : bg-destructive text-destructive-foreground hover:bg-destructive/90
link   : text-primary underline-offset-4 hover:underline
sm h-8 px-3 text-[13px] · md h-9 px-3.5 · lg h-10 px-4 text-[15px] · icon h-9 w-9
```
**Hiérarchie : un seul `default` visible par écran.** Dans une carte on utilise `soft` ou `outline`.
Le bouton noir « Parcourir les workflows » disparaît (il devient `outline`).

**Card**
```
conteneur : rounded-lg border border-border bg-card text-card-foreground shadow-e1
interactive : + transition-[border-color,box-shadow] duration-200 ease-flow
              hover:border-border-strong hover:shadow-e2 focus-within:border-primary/40
header px-5 py-4 (border-b border-border si séparé) · body p-5 · footer px-5 py-3.5 bg-muted/40
```

**Badge** (tons : neutral, brand, success, warning, info, danger)
```
base : inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5
neutral: border-border bg-muted text-muted-foreground
brand  : border-primary/20 bg-accent-soft text-accent-soft-foreground
success: border-success/25 bg-success-soft text-success-soft-foreground
warning: border-warning/25 bg-warning-soft text-warning-soft-foreground
info   : border-info/25 bg-info-soft text-info-soft-foreground
danger : border-destructive/25 bg-destructive-soft text-destructive-soft-foreground
+ point d'état : <span class="size-1.5 rounded-full bg-current opacity-70" />
```

**Input / Textarea / Select**
```
h-9 w-full rounded-md border border-input bg-input-bg px-3 text-sm text-foreground
transition-colors duration-150 placeholder:text-subtle-foreground
hover:border-border-strong
focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25
disabled:bg-muted disabled:opacity-60
aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20
```

**Table** (le composant le plus utilisé d'une GED — dense mais élégant)
```
enveloppe : overflow-hidden rounded-lg border border-border bg-card shadow-e1
table     : w-full border-separate border-spacing-0 text-sm
thead th  : sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-2.5 text-left
            text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground backdrop-blur
tbody tr  : border-b border-border last:border-0 transition-colors duration-150 hover:bg-accent/60
tbody td  : px-4 py-2.5 align-middle text-foreground
ligne sélectionnée : bg-accent-soft/60
colonnes numériques : class tnum text-right
```
Pas de zébrures. Hairline + survol. Lignes à 44–48 px de haut, pas 60.

**Dialog / Sheet / DropdownMenu / Tooltip / Tabs** : mêmes tokens. Overlay `bg-overlay backdrop-blur-sm`,
contenu `bg-popover text-popover-foreground shadow-modal` (modale) ou `shadow-pop` (menu),
`rounded-xl`. Item actif `bg-accent text-accent-foreground`. `kbd` :
`rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground`.

**Skeleton** : la classe `.skeleton` du kit (déjà thémable). **La forme du squelette doit épouser
la forme finale** (mêmes hauteurs de lignes, mêmes largeurs de colonnes), sinon on voit un « saut »
au chargement — c'est un des défauts les plus visibles d'une app bricolée.

**Toast (Sonner)** : passe les classes par `toastOptions.classNames` :
```
toast      : bg-popover text-popover-foreground border border-border shadow-pop rounded-lg
description: text-muted-foreground
actionButton: bg-primary text-primary-foreground
cancelButton: bg-muted text-muted-foreground
success    : text-success · error: text-destructive · warning: text-warning
```

### Lot 4 — Le shell (rail + topbar + contenu)

```
<aside>   : w-64 bg-sidebar border-r border-sidebar-border
            texte par défaut text-sidebar-foreground/85
item nav  : group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium
            text-sidebar-foreground/80 transition-colors duration-150
            hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
            data-[active=true]:bg-sidebar-active data-[active=true]:text-sidebar-active-foreground
            data-[active=true]:before:absolute data-[active=true]:before:left-0
            data-[active=true]:before:top-1/2 data-[active=true]:before:h-4
            data-[active=true]:before:w-[2px] data-[active=true]:before:-translate-y-1/2
            data-[active=true]:before:rounded-full data-[active=true]:before:bg-sidebar-brand
            + aria-current="page" quand actif
icône     : size-4 text-sidebar-muted group-data-[active=true]:text-sidebar-brand
groupe    : px-2.5 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-muted
topbar    : sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border
            bg-background/80 px-4 backdrop-blur-xl  (le décor passe dessous, effet verre léger)
contenu   : <main class="relative z-10 mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
```

**Plan de contenu (recommandé, c'est ce qui « comble les vides » proprement).** Encadre la colonne
de contenu dans un plan translucide posé sur le canvas décoré :

```
<div class="relative z-10 mx-auto w-full max-w-[1400px] p-3">
  <div class="plane p-5 sm:p-6 lg:p-8">   ← classe fournie par le kit (bg var(--plane) + hairline + radius-xl)
    … cartes et tableaux …
  </div>
</div>
```

Le décor reste visible dans la marge et **à travers** le plan (flou léger, très discret) : les zones
vides ne sont plus des trous blancs, ce sont des respirations. Fais ce lot en dernier réglage
esthétique et dis-moi si tu préfères sans — dans ce cas, garde simplement le canvas décoré.

### Lot 5 — Les décors (`src/components/backgrounds.tsx`)

Reprends `@design/theme-kit/backgrounds.tsx` **tel quel**, et :

1. Monte `<AppDecor/>` **une seule fois**, dans le shell, pas page par page :
   `fixed inset-0 z-0` + contenu en `relative z-10`. En clair comme en sombre.
2. **Supprime l'ancienne arche émeraude géante.** Le fond global, c'est :
   2 halos très diffus en haut + une texture de points masquée qui **disparaît avant les zones de
   contenu dense** + une remontée basse très douce pour combler le vide sous les pages courtes.
3. Étanchéité : `aria-hidden`, `pointer-events-none`, `overflow-hidden`. **Aucune animation** sur
   un fond d'application (il reste affiché des heures). `prefers-reduced-motion` respecté partout.
4. Les décors se déclinent par thème via `--deco-*` (déjà dans le kit) : en sombre les halos sont
   légèrement plus dosés (0.15/0.11) sinon ils sont invisibles.
5. Le fond global **ne s'applique pas** à `/login`, `/register`, `/changer-mot-de-passe` :
   ces écrans gardent `HeroDecor` + un panneau clair.
6. Si `/login` ou l'écran marketing doivent impressionner, c'est **là** (et seulement là) qu'on a
   le droit à plus d'effet : halos plus larges, grille fine, éventuellement une animation lente
   (≥ 12 s) désactivée sous `prefers-reduced-motion`. Dans l'app métier : sobre.

### Lot 6 — Les écrans, écran par écran

Pour chaque écran : mêmes 5 états (chargement / succès / vide / erreur / partiel), `bg-card` partout,
zéro couleur littérale. Priorité : `/` (tableau de bord), `/mes-documents`, `/documents/[id]`,
`/approbations`, `/workflows`, admin, paramètres.

Corrections UX imposées sur le tableau de bord (elles font plus pour l'effet « produit fini » que
n'importe quel dégradé) :
- **Une seule action principale par zone.** La topbar garde la recherche ; le bouton « Importer »
  de la topbar disparaît (le FAB suffit, et il porte déjà l'action principale).
- **« Accès rapide » reste, la rangée « Recherche globale ⌘K » disparaît** (doublon).
- **État vide « À traiter »** : composition imposée —
  `min-h-[260px] max-h-[320px]`, tuile d'icône `size-11 rounded-xl bg-accent-soft text-accent-soft-foreground`,
  titre `text-[15px] font-semibold`, une phrase `text-sm text-muted-foreground max-w-sm`,
  action `variant="soft"`. Jamais 400 px de vide.
- **KPI à zéro** : afficher `—` en `text-muted-foreground` (pas `0` en gras) + une phrase d'amorçage
  sous la valeur (« Aucune validation en attente »). Un tableau de bord qui affiche trois `0` géants
  donne l'impression d'une app vide.
- **« En un coup d'œil »** : soit 4 lignes minimum, soit on fusionne la carte avec « Accès rapide ».
  Une carte à une seule ligne disparaît, ce n'est pas un hasard.
- Carte vide ≠ carte grande : plafonne la hauteur des panneaux vides.

### Lot 7 — Purge et preuve

```bash
# a) plus aucune couleur littérale hors exceptions
rg -n --glob '!**/*.svg' --glob '!**/globals.css' \
   -e '\b(bg|text|border|ring|from|via|to|fill|stroke|divide|outline|placeholder|decoration|caret|accent)-(white|black)\b' \
   -e '\b(bg|text|border|ring|from|via|to|fill|stroke|divide)-(zinc|gray|slate|neutral|stone)-[0-9]{2,3}\b' \
   src
# b) plus aucun variant dark: bricolé
rg -n '\bdark:' src -g '*.tsx'
# c) plus aucun hex dans les composants
rg -n '#[0-9a-fA-F]{6}\b' src --glob '!**/*.css' --glob '!**/*.svg'
```
Les trois commandes doivent renvoyer **0 ligne** (hors §2.6). Puis l'audit automatique :

```bash
node scripts/theme-audit.mjs \
  --url=http://localhost:3000 \
  --routes=/,/mes-documents,/workflows,/approbations,/parametres \
  --out=theme-audit
```
Il produit `theme-audit/report.md`, `report.json` et **une capture par route et par thème**.
Objectif : `0` sur `surfaces`, `contraste`, `hardcodes`, `color-scheme`.

---

## 4. Goût : ce qui distingue un produit 2026 d'un template IA

Tu dois appliquer ces règles sans qu'on te les rappelle.

**Retenue.** Une seule couleur d'accent (émeraude). Un seul bouton principal par écran. Les couleurs
sémantiques uniquement pour du sens (succès/alerte/info/danger), jamais pour décorer.

**Hiérarchie typographique.** 12 / 13 / 14 / 16 / 20 / 24 px. Titre de page 20–24 px semibold avec
`tracking-[-0.02em]`. Libellés de KPI en `11px` majuscules `tracking-[0.08em] text-muted-foreground`.
Jamais trois tailles différentes dans la même carte. `text-wrap: balance` sur les titres.

**Densité maîtrisée.** Hauteur de ligne de tableau 44–48 px, padding de carte 20 px, gouttière 16–24 px,
largeur de contenu max 1400 px. Un outil métier dense et calme est plus « premium » qu'une page
aérée et vide.

**Profondeur sobre.** `shadow-e1` par défaut, `shadow-e2` au survol, `shadow-pop` pour les flottants.
Aucune ombre portée énorme et colorée. En sombre, une hairline blanche à 9 % et un reflet interne
valent mieux que n'importe quelle ombre.

**Interdits visuels (ça « pue le template IA ») :**
- dégradés violet → indigo génériques ; titres en dégradé ;
- gros blobs flous multicolores en fond de page produit ;
- glassmorphism partout (uniquement la topbar et les overlays) ;
- emojis dans les titres et les boutons (`🚀 ✨ 🎉`) ;
- « Welcome back! 👋 » → on écrit `Bonjour, Super — votre GED est à jour.` ;
- animations permanentes (`float`, `pulse`, `gradient-shift`) dans l'app métier ;
- rayons 16 px partout sans hiérarchie ; 
- trois CTA concurrents ; 
- texte gris trop clair pour « faire aéré » (c'est juste illisible : minimum `--muted-foreground`) ;
- cartes énormes contenant trois mots.

**Animations (à doser) :** 150 ms (survol, focus, boutons), 200–260 ms (apparition de carte, ouverture
de panneau), 300 ms (modale, drawer). Courbe `ease-flow`, jamais `linear`, jamais `bounce` dans
l'app. Stagger de 40–60 ms plafonné à ~300 ms. Transitions uniquement sur
`background-color, border-color, color, box-shadow, opacity, transform`. Le spectaculaire est réservé
à `/login` et à la landing.

**Détails qui font « pro » (à implémenter) :** `color-scheme` correct · scrollbars fines stylées ·
`::selection` aux couleurs de la marque · focus visible partout, jamais supprimé · `scrollbar-gutter: stable`
(pas de saut de 15 px quand la barre apparaît) · chiffres tabulaires sur tailles/dates/compteurs ·
dates et nombres via `Intl.DateTimeFormat("fr-FR")` / `Intl.NumberFormat("fr-FR")` · espaces insécables
avant `: ; ! ?` et dans `350,5 Ko` · états vides qui disent *quoi faire ensuite* · squelettes qui
épousent la mise en page finale · actions destructrices toujours accompagnées d'un
`Annuler` dans le toast · `aria-current="page"` sur la navigation active.

**CSS moderne à utiliser (et c'est ce qui date une interface en 2026 si c'est absent) :**
- `color-mix(in oklab, var(--primary) 12%, transparent)` pour dériver une teinte à partir d'un token,
  au lieu d'inventer une couleur — et ça fonctionne dans les deux thèmes automatiquement.
- `:has()` pour les états structurels sans JS : `[data-row]:has(input:checked) { background: var(--accent-soft) }`,
  `.card:has(:focus-visible) { border-color: color-mix(in oklab, var(--primary) 45%, transparent) }`.
- **Container queries** (`@container`) pour les cartes KPI et la liste de documents : la carte s'adapte
  à sa colonne, pas à la fenêtre. C'est ce qui distingue une grille responsive propre d'un
  `lg:grid-cols-4` posé au hasard.
- `text-wrap: pretty` sur les paragraphes, `balance` sur les titres (déjà dans le kit).
- `@starting-style` + `transition-behavior: allow-discrete` pour animer l'apparition d'un popover
  ou d'une modale sans librairie.
- **View Transitions** (`view-transition-name`) sur la navigation `/mes-documents → /documents/[id]` :
  la vignette du document devient l'en-tête de la fiche. C'est spectaculaire *et* utile, et c'est
  exactement le genre de détail qui fait « 2026 ». À faire seulement si le navigateur n'est pas ciblé
  en deçà de Chrome/Edge 111 + Safari 18 — sinon on reste sur une transition d'opacité de 150 ms.
- `@media (prefers-contrast: more)` : durcir les bordures et le texte secondaire. Personne ne le fait,
  ça se voit tout de suite sur un audit d'accessibilité sérieux.

---

## 5. Comment me rendre compte sans voir l'écran

Tu ne vois pas les captures : compense par les chiffres et par ce que tu me livres.

1. Après chaque lot : `npm run build` (résultat exact) + le nombre de fichiers modifiés.
2. Après le Lot 5, puis après le Lot 7 : lance
   `node scripts/theme-audit.mjs --url=http://localhost:3000 --routes=/,/mes-documents,/workflows,/approbations,/parametres --out=theme-audit`
   et **colle-moi le tableau de `theme-audit/report.md`** (le tableau récapitulatif uniquement, pas
   les 400 lignes). Les captures PNG générées par le script sont dans `theme-audit/` : je les ouvre, moi.
   **Vérifie d'abord que `themes:0` n'est pas un faux négatif** : ajoute temporairement un
   `<div class="bg-white h-64">` dans une page, relance, et assure-toi que l'audit le signale
   (`surfaces:1` en mode sombre). S'il ne le signale pas, ton script regarde mal ou la page n'a pas
   rendu le mode sombre — corrige ça avant de me donner des chiffres. (Calibrage déjà validé :
   il détecte bien une surface blanche injectée en mode sombre.)
3. Quand tu hésites entre deux options visuelles, ne tranche pas : propose-moi les deux avec la
   différence exacte en tokens. Je réponds en une ligne.
4. N'utilise **jamais** « c'est plus beau », « moderne », « épuré » comme justification. Justifie
   par : quel token, quelle classe, quelle valeur de contraste, quel résultat d'audit.

---

## 6. Definition of Done

- [ ] `src/app/globals.css` = version du kit ; palettes claire ET sombre complètes.
- [ ] Mode clair **et** mode sombre testés sur : `/`, `/mes-documents`, `/documents/[id]`,
      `/workflows`, `/approbations`, `/utilisateurs`, `/parametres`, `/login`, une modale,
      un menu déroulant, un état vide, un état d'erreur, un squelette de chargement.
- [ ] Le thème tient après F5, après nouvel onglet, et suit l'OS quand « Système » est choisi.
      Aucun flash blanc au chargement en mode sombre.
- [ ] Aucun élément clair isolé dans une page sombre, aucun élément sombre isolé dans une page claire.
- [ ] Les 3 commandes `rg` du Lot 7 renvoient 0 ligne.
- [ ] `theme-audit.mjs` : 0 surface, 0 contraste, 0 hardcode, 0 color-scheme.
- [ ] Tous les textes ≥ 4.5:1 (≥ 3:1 pour le grand texte) dans les deux thèmes.
- [ ] Chevauchements/thèmes vérifiés aussi à 390 px de large, et à 200 % de zoom.
- [ ] `prefers-reduced-motion: reduce` → aucune animation non essentielle.
- [ ] Le fond global est présent sur toutes les pages authentifiées, absent des pages d'auth.
- [ ] Zéro `dark:` dans les composants, hors §2.6.
- [ ] Un seul bouton principal par écran, hiérarchie vérifiée sur le tableau de bord.
- [ ] Build propre, ESLint propre, pas de `any` ajouté, pas de dépendance ajoutée.

---

## 7. Ce que tu ne dois pas faire

1. Ne pas ajouter `dark:` un peu partout « en attendant ». Un token manquant se règle dans
   `globals.css`, pas par un variant local.
2. Ne pas inventer une deuxième échelle de couleurs (ex. `--gray-100` parallèle aux tokens).
3. Ne pas garder l'arche émeraude géante « parce qu'elle est dans le design actuel ».
4. Ne pas réécrire un composant métier pour le plaisir : on change ses couleurs, son état et sa
   structure d'état, pas sa logique métier ni ses appels API.
5. Ne pas toucher aux exports, aux routes, aux noms de composants, aux libellés français.
6. Ne pas animer le fond d'application.
7. Ne pas utiliser `#000` / `#fff` purs.
8. Ne pas livrer un lot sans build vert.
9. Ne pas me dire « c'est fait » sans les chiffres de l'audit.

---

## 8. Rappel : le plus important en une phrase

> **Une seule source de vérité dans `globals.css`, deux palettes complètes, des composants qui ne
> parlent que de tokens sémantiques, et un langage d'élévation spécifique au mode sombre.**

C'est ça, et rien d'autre, qui transforme le rendu actuel en une interface de 2026 qui rassure.

---

## 9. Référence déjà construite (à consulter, pas à réinventer)

Un clone de ton interface a été corrigé avec exactement ce protocole. Le résultat est vérifiable,
et tu peux t'en servir comme cible :

- **Captures du résultat** (mode clair ET sombre) : dossier `theme-audit/` fourni avec ce brief —
  `apercu-light.png`, `apercu-dark.png`, `login-light.png`, `login-dark.png`, `report.md`, `report.json`.
  Ouvre-les si tu as un lecteur d'images ; sinon, compare-toi aux chiffres du rapport.
- **Le code de référence** : `archiflow-starter/` (même stack : Next.js 15 App Router, Tailwind v4,
  Radix-like, Motion, Sonner, Lucide, tokens shadcn-compatibles). Fichiers à lire en priorité :
  `src/app/globals.css`, `src/components/backgrounds.tsx`, `src/components/theme-provider.tsx`,
  `src/components/theme-toggle.tsx`, `src/components/app-shell.tsx` (rail + topbar + toggle),
  `src/components/ui/button.tsx` (hiérarchie des variantes).
- **Résultat mesuré sur ce clone** : 0 couleur littérale, 0 `dark:` de contournement,
  0 problème d'audit sur 6 combinaisons route × thème (surfaces, contrastes, hardcodes, color-scheme).
- **Calibrage de l'outil** : validé. Une `<div class="bg-white h-64">` injectée est bien détectée
  (`SURFACE_CLAIR_EN_SOMBRE` en mode sombre, `COULEUR_HARDCODEE` dans les deux thèmes) — donc si tu
  obtiens 0 partout dès le premier lancer, c'est que ton audit ne voit pas la page, pas que tout est propre.

Si tu dois t'écarter de cette référence, dis-le-moi avec l'impact en tokens : je tranche.
