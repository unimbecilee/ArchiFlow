# ArchiFlow — audit de thème (clair / sombre)

Généré le 2026-09-10T18:11:24.021Z — cible http://localhost:3000
Routes : /, /mes-documents, /workflows, /approbations, /parametres, /login — thèmes : light, dark — 1440×900

## Total : 128 problème(s)

| route | thème | surfaces | contraste | hardcodes | color-scheme |
|---|---|---|---|---|---|
| / | light | 0 | 3 | 9 | 0 |
| / | dark | 0 | 3 | 9 | 0 |
| /mes-documents | light | 0 | 3 | 9 | 0 |
| /mes-documents | dark | 0 | 3 | 9 | 0 |
| /workflows | light | 0 | 3 | 9 | 0 |
| /workflows | dark | 0 | 3 | 9 | 0 |
| /approbations | light | 0 | 0 | 3 | 0 |
| /approbations | dark | 2 | 0 | 3 | 0 |
| /parametres | light | 0 | 3 | 9 | 0 |
| /parametres | dark | 0 | 3 | 9 | 0 |
| /login | light | 0 | 3 | 9 | 0 |
| /login | dark | 0 | 3 | 9 | 0 |

## Détail

## / — light

Capture : `theme-audit\root-light.png` (à ouvrir dans l'IDE, l'agent comme le dev la voient)

### Surfaces incohérentes avec le thème

Aucun problème détecté. ✅

### Contrastes insuffisants — 3 problème(s)

1. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > p.text-sm.font-semibold` — contraste **1:1** (min 4.5)
   - rgb(255, 255, 255) 
   - « ArchiFlow »
2. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > h1.mt-10.max-w-lg` — contraste **1:1** (min 3)
   - rgb(255, 255, 255) 
   - « Vos documents, classés et trouvables. »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md` — contraste **2.56:1** (min 4.5)
   - rgb(161, 161, 170) 
   - « GED auto-hébergée pour ETI et administrations : métadonnées, »

### Couleurs codées en dur (à remplacer par des tokens) — 6 problème(s)

1. `html.__variable_8adcd2.__variable_46451f > body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden`
   -  text-white
   - «  »
2. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > div.flex.h-9`
   -  text-zinc-950
   - «  »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md`
   -  text-zinc-400
   - «  »
4. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border`
   -  border-zinc-800 bg-zinc-900
   - «  »
5. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-3.text-sm`
   -  text-white
   - «  »
6. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-1.text-sm`
   -  text-zinc-400
   - «  »

### color-scheme / classe de thème

Aucun problème détecté. ✅


## / — dark

Capture : `theme-audit\root-dark.png` (à ouvrir dans l'IDE, l'agent comme le dev la voient)

### Surfaces incohérentes avec le thème

Aucun problème détecté. ✅

### Contrastes insuffisants — 3 problème(s)

1. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > p.text-sm.font-semibold` — contraste **1:1** (min 4.5)
   - rgb(255, 255, 255) 
   - « ArchiFlow »
2. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > h1.mt-10.max-w-lg` — contraste **1:1** (min 3)
   - rgb(255, 255, 255) 
   - « Vos documents, classés et trouvables. »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md` — contraste **2.56:1** (min 4.5)
   - rgb(161, 161, 170) 
   - « GED auto-hébergée pour ETI et administrations : métadonnées, »

### Couleurs codées en dur (à remplacer par des tokens) — 6 problème(s)

1. `html.__variable_8adcd2.__variable_46451f > body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden`
   -  text-white
   - «  »
2. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > div.flex.h-9`
   -  text-zinc-950
   - «  »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md`
   -  text-zinc-400
   - «  »
4. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border`
   -  border-zinc-800 bg-zinc-900
   - «  »
5. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-3.text-sm`
   -  text-white
   - «  »
6. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-1.text-sm`
   -  text-zinc-400
   - «  »

### color-scheme / classe de thème

Aucun problème détecté. ✅


## /mes-documents — light

Capture : `theme-audit\mes-documents-light.png` (à ouvrir dans l'IDE, l'agent comme le dev la voient)

### Surfaces incohérentes avec le thème

Aucun problème détecté. ✅

### Contrastes insuffisants — 3 problème(s)

1. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > p.text-sm.font-semibold` — contraste **1:1** (min 4.5)
   - rgb(255, 255, 255) 
   - « ArchiFlow »
2. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > h1.mt-10.max-w-lg` — contraste **1:1** (min 3)
   - rgb(255, 255, 255) 
   - « Vos documents, classés et trouvables. »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md` — contraste **2.56:1** (min 4.5)
   - rgb(161, 161, 170) 
   - « GED auto-hébergée pour ETI et administrations : métadonnées, »

### Couleurs codées en dur (à remplacer par des tokens) — 6 problème(s)

1. `html.__variable_8adcd2.__variable_46451f > body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden`
   -  text-white
   - «  »
2. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > div.flex.h-9`
   -  text-zinc-950
   - «  »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md`
   -  text-zinc-400
   - «  »
4. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border`
   -  border-zinc-800 bg-zinc-900
   - «  »
5. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-3.text-sm`
   -  text-white
   - «  »
6. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-1.text-sm`
   -  text-zinc-400
   - «  »

### color-scheme / classe de thème

Aucun problème détecté. ✅


## /mes-documents — dark

Capture : `theme-audit\mes-documents-dark.png` (à ouvrir dans l'IDE, l'agent comme le dev la voient)

### Surfaces incohérentes avec le thème

Aucun problème détecté. ✅

### Contrastes insuffisants — 3 problème(s)

1. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > p.text-sm.font-semibold` — contraste **1:1** (min 4.5)
   - rgb(255, 255, 255) 
   - « ArchiFlow »
2. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > h1.mt-10.max-w-lg` — contraste **1:1** (min 3)
   - rgb(255, 255, 255) 
   - « Vos documents, classés et trouvables. »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md` — contraste **2.56:1** (min 4.5)
   - rgb(161, 161, 170) 
   - « GED auto-hébergée pour ETI et administrations : métadonnées, »

### Couleurs codées en dur (à remplacer par des tokens) — 6 problème(s)

1. `html.__variable_8adcd2.__variable_46451f > body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden`
   -  text-white
   - «  »
2. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > div.flex.h-9`
   -  text-zinc-950
   - «  »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md`
   -  text-zinc-400
   - «  »
4. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border`
   -  border-zinc-800 bg-zinc-900
   - «  »
5. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-3.text-sm`
   -  text-white
   - «  »
6. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-1.text-sm`
   -  text-zinc-400
   - «  »

### color-scheme / classe de thème

Aucun problème détecté. ✅


## /workflows — light

Capture : `theme-audit\workflows-light.png` (à ouvrir dans l'IDE, l'agent comme le dev la voient)

### Surfaces incohérentes avec le thème

Aucun problème détecté. ✅

### Contrastes insuffisants — 3 problème(s)

1. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > p.text-sm.font-semibold` — contraste **1:1** (min 4.5)
   - rgb(255, 255, 255) 
   - « ArchiFlow »
2. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > h1.mt-10.max-w-lg` — contraste **1:1** (min 3)
   - rgb(255, 255, 255) 
   - « Vos documents, classés et trouvables. »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md` — contraste **2.56:1** (min 4.5)
   - rgb(161, 161, 170) 
   - « GED auto-hébergée pour ETI et administrations : métadonnées, »

### Couleurs codées en dur (à remplacer par des tokens) — 6 problème(s)

1. `html.__variable_8adcd2.__variable_46451f > body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden`
   -  text-white
   - «  »
2. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > div.flex.h-9`
   -  text-zinc-950
   - «  »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md`
   -  text-zinc-400
   - «  »
4. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border`
   -  border-zinc-800 bg-zinc-900
   - «  »
5. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-3.text-sm`
   -  text-white
   - «  »
6. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-1.text-sm`
   -  text-zinc-400
   - «  »

### color-scheme / classe de thème

Aucun problème détecté. ✅


## /workflows — dark

Capture : `theme-audit\workflows-dark.png` (à ouvrir dans l'IDE, l'agent comme le dev la voient)

### Surfaces incohérentes avec le thème

Aucun problème détecté. ✅

### Contrastes insuffisants — 3 problème(s)

1. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > p.text-sm.font-semibold` — contraste **1:1** (min 4.5)
   - rgb(255, 255, 255) 
   - « ArchiFlow »
2. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > h1.mt-10.max-w-lg` — contraste **1:1** (min 3)
   - rgb(255, 255, 255) 
   - « Vos documents, classés et trouvables. »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md` — contraste **2.56:1** (min 4.5)
   - rgb(161, 161, 170) 
   - « GED auto-hébergée pour ETI et administrations : métadonnées, »

### Couleurs codées en dur (à remplacer par des tokens) — 6 problème(s)

1. `html.__variable_8adcd2.__variable_46451f > body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden`
   -  text-white
   - «  »
2. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > div.flex.h-9`
   -  text-zinc-950
   - «  »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md`
   -  text-zinc-400
   - «  »
4. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border`
   -  border-zinc-800 bg-zinc-900
   - «  »
5. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-3.text-sm`
   -  text-white
   - «  »
6. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-1.text-sm`
   -  text-zinc-400
   - «  »

### color-scheme / classe de thème

Aucun problème détecté. ✅


## /approbations — light

Capture : `theme-audit\approbations-light.png` (à ouvrir dans l'IDE, l'agent comme le dev la voient)

### Surfaces incohérentes avec le thème

Aucun problème détecté. ✅

### Contrastes insuffisants

Aucun problème détecté. ✅

### Couleurs codées en dur (à remplacer par des tokens) — 3 problème(s)

1. `html.__variable_8adcd2.__variable_46451f > body.min-h-[100dvh].bg-background > div.flex.min-h-[100dvh] > div.w-full.max-w-lg > div.flex.flex-col`
   -  border-zinc-200 bg-zinc-50/70
   - «  »
2. `body.min-h-[100dvh].bg-background > div.flex.min-h-[100dvh] > div.w-full.max-w-lg > div.flex.flex-col > h3.mt-3.text-sm`
   -  text-zinc-900
   - «  »
3. `body.min-h-[100dvh].bg-background > div.flex.min-h-[100dvh] > div.w-full.max-w-lg > div.flex.flex-col > p.mt-1.max-w-sm`
   -  text-zinc-500
   - «  »

### color-scheme / classe de thème

Aucun problème détecté. ✅


## /approbations — dark

Capture : `theme-audit\approbations-dark.png` (à ouvrir dans l'IDE, l'agent comme le dev la voient)

### Surfaces incohérentes avec le thème — 2 problème(s)

1. `html.__variable_8adcd2.__variable_46451f > body.min-h-[100dvh].bg-background > div.flex.min-h-[100dvh]` — 1 282 500 px²
   - rgb(246, 247, 249) 
   - « Ce document n’existe pas ou a été déplacéVérifiez le lien, o »
2. `html.__variable_8adcd2.__variable_46451f > body.min-h-[100dvh].bg-background > div.flex.min-h-[100dvh] > div.w-full.max-w-lg > div.flex.flex-col` — 136 192 px²
   - rgba(250, 250, 250, 0.7) 
   - « Ce document n’existe pas ou a été déplacéVérifiez le lien, o »

### Contrastes insuffisants

Aucun problème détecté. ✅

### Couleurs codées en dur (à remplacer par des tokens) — 3 problème(s)

1. `html.__variable_8adcd2.__variable_46451f > body.min-h-[100dvh].bg-background > div.flex.min-h-[100dvh] > div.w-full.max-w-lg > div.flex.flex-col`
   -  border-zinc-200 bg-zinc-50/70
   - «  »
2. `body.min-h-[100dvh].bg-background > div.flex.min-h-[100dvh] > div.w-full.max-w-lg > div.flex.flex-col > h3.mt-3.text-sm`
   -  text-zinc-900
   - «  »
3. `body.min-h-[100dvh].bg-background > div.flex.min-h-[100dvh] > div.w-full.max-w-lg > div.flex.flex-col > p.mt-1.max-w-sm`
   -  text-zinc-500
   - «  »

### color-scheme / classe de thème

Aucun problème détecté. ✅


## /parametres — light

Capture : `theme-audit\parametres-light.png` (à ouvrir dans l'IDE, l'agent comme le dev la voient)

### Surfaces incohérentes avec le thème

Aucun problème détecté. ✅

### Contrastes insuffisants — 3 problème(s)

1. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > p.text-sm.font-semibold` — contraste **1:1** (min 4.5)
   - rgb(255, 255, 255) 
   - « ArchiFlow »
2. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > h1.mt-10.max-w-lg` — contraste **1:1** (min 3)
   - rgb(255, 255, 255) 
   - « Vos documents, classés et trouvables. »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md` — contraste **2.56:1** (min 4.5)
   - rgb(161, 161, 170) 
   - « GED auto-hébergée pour ETI et administrations : métadonnées, »

### Couleurs codées en dur (à remplacer par des tokens) — 6 problème(s)

1. `html.__variable_8adcd2.__variable_46451f > body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden`
   -  text-white
   - «  »
2. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > div.flex.h-9`
   -  text-zinc-950
   - «  »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md`
   -  text-zinc-400
   - «  »
4. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border`
   -  border-zinc-800 bg-zinc-900
   - «  »
5. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-3.text-sm`
   -  text-white
   - «  »
6. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-1.text-sm`
   -  text-zinc-400
   - «  »

### color-scheme / classe de thème

Aucun problème détecté. ✅


## /parametres — dark

Capture : `theme-audit\parametres-dark.png` (à ouvrir dans l'IDE, l'agent comme le dev la voient)

### Surfaces incohérentes avec le thème

Aucun problème détecté. ✅

### Contrastes insuffisants — 3 problème(s)

1. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > p.text-sm.font-semibold` — contraste **1:1** (min 4.5)
   - rgb(255, 255, 255) 
   - « ArchiFlow »
2. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > h1.mt-10.max-w-lg` — contraste **1:1** (min 3)
   - rgb(255, 255, 255) 
   - « Vos documents, classés et trouvables. »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md` — contraste **2.56:1** (min 4.5)
   - rgb(161, 161, 170) 
   - « GED auto-hébergée pour ETI et administrations : métadonnées, »

### Couleurs codées en dur (à remplacer par des tokens) — 6 problème(s)

1. `html.__variable_8adcd2.__variable_46451f > body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden`
   -  text-white
   - «  »
2. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > div.flex.h-9`
   -  text-zinc-950
   - «  »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md`
   -  text-zinc-400
   - «  »
4. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border`
   -  border-zinc-800 bg-zinc-900
   - «  »
5. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-3.text-sm`
   -  text-white
   - «  »
6. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-1.text-sm`
   -  text-zinc-400
   - «  »

### color-scheme / classe de thème

Aucun problème détecté. ✅


## /login — light

Capture : `theme-audit\login-light.png` (à ouvrir dans l'IDE, l'agent comme le dev la voient)

### Surfaces incohérentes avec le thème

Aucun problème détecté. ✅

### Contrastes insuffisants — 3 problème(s)

1. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > p.text-sm.font-semibold` — contraste **1:1** (min 4.5)
   - rgb(255, 255, 255) 
   - « ArchiFlow »
2. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > h1.mt-10.max-w-lg` — contraste **1:1** (min 3)
   - rgb(255, 255, 255) 
   - « Vos documents, classés et trouvables. »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md` — contraste **2.56:1** (min 4.5)
   - rgb(161, 161, 170) 
   - « GED auto-hébergée pour ETI et administrations : métadonnées, »

### Couleurs codées en dur (à remplacer par des tokens) — 6 problème(s)

1. `html.__variable_8adcd2.__variable_46451f > body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden`
   -  text-white
   - «  »
2. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > div.flex.h-9`
   -  text-zinc-950
   - «  »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md`
   -  text-zinc-400
   - «  »
4. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border`
   -  border-zinc-800 bg-zinc-900
   - «  »
5. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-3.text-sm`
   -  text-white
   - «  »
6. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-1.text-sm`
   -  text-zinc-400
   - «  »

### color-scheme / classe de thème

Aucun problème détecté. ✅


## /login — dark

Capture : `theme-audit\login-dark.png` (à ouvrir dans l'IDE, l'agent comme le dev la voient)

### Surfaces incohérentes avec le thème

Aucun problème détecté. ✅

### Contrastes insuffisants — 3 problème(s)

1. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > p.text-sm.font-semibold` — contraste **1:1** (min 4.5)
   - rgb(255, 255, 255) 
   - « ArchiFlow »
2. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > h1.mt-10.max-w-lg` — contraste **1:1** (min 3)
   - rgb(255, 255, 255) 
   - « Vos documents, classés et trouvables. »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md` — contraste **2.56:1** (min 4.5)
   - rgb(161, 161, 170) 
   - « GED auto-hébergée pour ETI et administrations : métadonnées, »

### Couleurs codées en dur (à remplacer par des tokens) — 6 problème(s)

1. `html.__variable_8adcd2.__variable_46451f > body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden`
   -  text-white
   - «  »
2. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.flex.items-center > div.flex.h-9`
   -  text-zinc-950
   - «  »
3. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > p.mt-4.max-w-md`
   -  text-zinc-400
   - «  »
4. `body.min-h-[100dvh].bg-background > div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border`
   -  border-zinc-800 bg-zinc-900
   - «  »
5. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-3.text-sm`
   -  text-white
   - «  »
6. `div.grid.min-h-[100dvh] > section.relative.hidden > div.relative.z-10 > div.rounded-xl.border > p.mt-1.text-sm`
   -  text-zinc-400
   - «  »

### color-scheme / classe de thème

Aucun problème détecté. ✅

