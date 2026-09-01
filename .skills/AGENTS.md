# AGENTS.md — ArchiFlow frontend (règles pour OpenCode / agents IA)

> Règle de session : référence `@AGENTS.md` et `@docs/archiflow-ui-brief.md`
> à chaque demande UI/UX. Composants de référence vivants :
> `src/components/app-shell.tsx`, `src/components/states.tsx`,
> `src/components/documents-view.tsx`, `src/components/backgrounds.tsx`.

## Règle « arrière-plans décoratifs façon Haikei »

Quand un arrière-plan décoratif est demandé (écrans d'auth, héros, états
vides, pages d'erreur), le générer **en code** en suivant le style de
https://haikei.app/generators (blobs radiaux flous, grilles de points/lignes,
vagues en couches, vaguelettes) — **ne jamais télécharger ni référencer une
image externe** (le preview bac-à-sable et la CSP bloquent les assets
externes ; un SVG inline est de plus redimensionnable et imprime les tokens).

Contraintes impératives :

1. **Technique** : composant React qui rend un `<svg>` inline (ou pur SVG/CSS),
   `position: absolute inset-0`, enveloppé dans une div `aria-hidden` +
   `pointer-events-none` + `overflow-hidden`. IDs SVG uniques et préfixés
   (`af-…`) pour éviter les collisions entre composants.
2. **Couleurs** : exclusivement les tokens ArchiFlow — primaire émeraude
   (`#10b981` / emerald-500, `#059669` / emerald-600, `#34d399` / emerald-400,
   fonds doux emerald-50 `#ecfdf5`, emerald-100 `#d1fae5`, emerald-200
   `#a7f3d0`), teal `#14b8a6` en secondaire, neutres zinc (`zinc-950` `#09090b`
   sur les panneaux sombres, blanc / `#f6f7f9` sur les panneaux clairs).
   **Pas d'autre couleur, pas de dégradé multicolore.**
3. **Lisibilité avant tout** : opacités très basses (points/lignes 6–10 %,
   bords des blobs qui tombent à `stop-opacity="0"`), estompage par
   `radialGradient` + `mask` pour que le fond disparaisse sous le texte.
   Contraste du texte vérifié AA par-dessus.
4. **Choix du générateur Haikei selon le contexte** :
   - **FOND GLOBAL DE L'APPLICATION** (toutes les pages authentifiées, rendu
     une seule fois dans le shell, pas page par page) : texture de points
     émeraude à ~5-6 % d'opacité avec fondu radial depuis le haut + 1 ou 2
     halos radiaux émeraude/teal très faibles (stop-opacity 0,08–0,10 au
     centre → 0 sur les bords), posés sur le fond `#f6f7f9`. C'est le
     composant `AppBackgroundLight` : il comble les goulottes et grands
     espaces vides SANS toucher aux cartes (les surfaces blanches restent
     opaques par-dessus). **Statique** (visible toute la journée, donc zéro
     animation), en `position: fixed inset-0 z-0`, le contenu en `relative
     z-10`. Opacités encore plus basses que les fonds de panneau : ça doit se
     sentir sans se voir ;
   - panneau sombre d'auth / héros → **Blurry Gradients** (blobs radiaux
     émeraude/teal sur zinc-950) + surcouche **Grid Pattern** fine estompée ;
     les pages d'auth ont leur propre fond et n'héritent PAS du fond global ;
   - fond clair de formulaire / panneau local → **Dot Grid** émeraude à
     8–10 % d'opacité avec fondu radial ;
   - états vides / pied de panneau / pages 403-404 → **Layered Waves** ou
     **Wave** en 3 couches emerald-50/100/200 en bas de panneau ;
   - jamais de « Scattered/Shapes » bruyants ni de styles multicolores dans
     l'application (réservés à la landing marketing, et même là sobre).
5. **Mouvement & accessibilité** : toute animation du fond (dérive lente des
   blobs par ex.) doit être ≤ 12 s, en boucle, non distrayante, et
   **désactivée** sous `@media (prefers-reduced-motion: reduce)`. Pas de
   parallaxe au scroll dans l'app.
6. **Performance** : aucun asset externe, pas de bibliothèque dédiée ;
   l'arrière-plan ne doit pas ajouter de dépendance. Sur mobile, les blobs
   larges sont acceptés (SVG masqué, peu de nœuds) mais éviter plus de
   3 formes.

Composants existants à réutiliser/étendre (`src/components/backgrounds.tsx`) :
`AuthHeroBackground` (Blurry Gradients + grille, sombre), `DotGridLight`
(grille de points claire), `WavesLight` (vagues claires).
