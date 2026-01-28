# Plan de Purge – ESAG GED

Objectif : identifier tous les artefacts à supprimer/archiver avant refonte complète afin d’éviter la dette historique et repartir sur une base “type Pydio Cells”. Les éléments ci-dessous sont des **candidats à la suppression** ; valider avec les owners concernés avant exécution.

## 1. Backend Flask
| Path | Constats | Action recommandée | Risques / à valider |
| --- | --- | --- | --- |
| `AppFlask/routes/*.py` | Ancien jeu de routes “serveur” dupliquant la couche `AppFlask/api/` ; héritage Flask template. | Supprimer après confirmation que tout passe par API REST. | Vérifier qu’aucun front legacy n’utilise encore ces blueprints. |
| `AppFlask/static/{css,img,js}` | Assets pour templates Flask (CSS, JS, images). L’interface officielle est React. | Archiver ou supprimer après migration totale vers SPA. | Conserver ce qui est encore servi par emails ou PDF. |
| `AppFlask/utils/notification_service.py` vs `AppFlask/services/notification_service.py` | Duplication des logiques notifications. | Supprimer la version utilitaire et centraliser dans `services/`. | Confirmer qu’aucun import ne vise encore `utils.notification_service`. |
| `AppFlask/utils/trash_manager.py` | Gestion corbeille partielle; doublon avec `AppFlask/api/trash*.py`. | Supprimer après refactor du domaine “Trash”. | Vérifier scripts/cron éventuels. |
| `AppFlask/api/documents_unified.py`, `trash_unified.py` | Points d’entrée “unifiés” redondants avec endpoints spécifiques. | Supprimer ou fusionner dans modules par domaine. | Revoir routes front qui consommaient ces endpoints. |
| `AppFlask/api/document_processing.py` + `services/document_processing_service.py` | Couplage adhoc service/API; certaines fonctions mortes. | Supprimer le fichier API si la logique passe par service + nouveaux endpoints. | Conserver l’ocr/preview nécessaire aux workflows. |
| `AppFlask/middleware/notifications.py` | Middleware custom non branché (pas d’enregistrement dans app). | Supprimer ou re-écrire sous forme de hook signal. | Vérifier `AppFlask/app.py`. |
| `AppFlask/scripts/add_status_column.py` | Script de migration ponctuel. | Archiver dans `migrations/legacy/` ou supprimer. | S’assurer que la migration est bien appliquée en prod. |
| `check_workflow_instances.py`, `debug_workflow.py`, `main.py`, `run.py` | Multiples entrypoints. | Conserver un seul (ex `manage.py`). | Vérifier process déploiement actuel (Procfile). |
| `environment_variables.txt` | Fichier texte listant variables sensibles en clair. | Supprimer, déplacer vers documentation interne. | Exporter contenus utiles dans README sécurisé. |
| `Procfile`, `railway.json`, `runtime.txt` | Configs spécifiques Heroku/Railway/Render. | Supprimer si on standardise sur Docker Compose/K8s. | Vérifier plateformes encore actives. |

## 2. Frontend React
| Path | Constats | Action recommandée | Risques / à valider |
| --- | --- | --- | --- |
| `frontend/package-lock.json` + `../package-lock.json` | Deux lockfiles (root + frontend). Root `package.json` ne sert qu’à quelques dépendances chart. | Supprimer lock/root et consolider toutes dépendances dans `frontend/`. | Vérifier usages éventuels côté scripts Python. |
| `frontend/create_archivage_workflow.py` | Script Python isolé dans le dossier React. | Supprimer ou déplacer vers backend/scripts. | Confirmer qu’il n’est plus lancé manuellement. |
| Fichiers backup/temporaires (`ArchiveRequestModal.tsx.bak`, `.fixed`, `Settings.tsx.temp`, `SettingsTest.tsx`, `TrashTest.tsx`, `TrashSimple.tsx`, `SettingsSimple.tsx`) | Artefacts de debugging non importés. | Supprimer. | Faire un `rg` pour vérifier import éventuel avant suppression. |
| Doublons composant (`DocumentOCR.tsx`, `DocumentPreview.tsx`, `DocumentVersions.tsx`) présents à la racine *et* dans `components/Document/`. | Duplication du même composant. | Supprimer versions racine et ne garder qu’une hiérarchie `Document/`. | Synchroniser tous les imports (`import DocumentPreview...`). |
| `frontend/src/components/TestAPI.tsx` | Page utilitaire pour appels ad-hoc. | Supprimer. | Aucun route `App.tsx` ne doit la référencer. |
| `frontend/src/components/Settings/` + `Settings.tsx` | Arborescence hybride (dossier + fichiers multiples). | Supprimer variantes inutilisées (`Settings.tsx`, `SettingsSimple`, `SettingsTest`) et basculer vers structure feature-based. | Vérifier routing dans `pages/Settings`. |
| `frontend/src/components/TrashSimple.tsx`, `TrashTest.tsx`, `Trash.tsx` | Trois versions; ne conserver que celle utilisée. | Supprimer prototypes. | Confirmer usage via `rg "TrashSimple"`. |
| `frontend/src/components/NotificationModal.tsx` vs `NotificationCenter.tsx` | Ancien modal isolé. | Supprimer modal si non référencé; migrer vers centre notifs unifié. | Vérifier `Sidebar`/`Dashboard`. |
| `frontend/src/components/AdvancedSearchPage.tsx` + `SearchPage.tsx` + `Search.tsx` + `AdvancedSearch.tsx` | Plusieurs pages redondantes. | Purger les pages non routées. | Vérifier `frontend/src/pages`. |
| `frontend/src/components/Settings/fix-icons.js` | Script manuel pour nettoyage d’icônes. | Supprimer après régénération assets. | Vérifier qu’il n’est plus lancé via npm script. |

## 3. Documentation & Fichiers Annexes
| Path | Constats | Action | Notes |
| --- | --- | --- | --- |
| `md/` | Dossiers “CORRECTIONS_*”, guides multiples obsolètes. | Archiver dans `/archive/docs/` ou supprimer. | Conserver ce qui est encore d’actualité pour déploiement. |
| `myUMLDiagrams/` | UML exportés (PNG + .puml) datant d’anciens flux. | Archiver hors repo (drive) ou ne garder que sources `.puml`. | Utile si on conserve doc d’archi; sinon nettoyer. |
| `docs/workflow*.md`, `docs/documents.md`, etc. | Doublons/versions divergentes. | Consolidation dans la nouvelle doc (ex `docs/architecture/`). | À faire après revue contenu. |
| `environment_variables.txt` | (Déjà listé) – doc sensible. | Supprimer du repo. |  |

## 4. Dépendances
| Contexte | Problème | Action |
| --- | --- | --- |
| `requirements.txt` | Libs lourdes OCR (opencv, PyMuPDF, pdf2image) peut-être plus utilisées si on externalise l’OCR. | Supprimer dépendances inutiles après audit des features. |
| `requirements.txt` | Outils dev (`pytest`, `black`, `flake8`) mélangés aux deps prod. | Scinder en `requirements/base.txt` + `requirements/dev.txt`. |
| `package.json` racine | Librairies UI (MUI, Chart.js) dupliquées avec `frontend/`. | Supprimer root package, déplacer dans `frontend/package.json`. |

## 5. Prochaine Étape
1. **Validation** : passer en revue cette liste avec l’équipe (backend, frontend, produit) et marquer chaque ligne “Delete / Keep / À migrer”.
2. **Ticketing** : créer un ticket par lot (Backend legacy routes, Frontend composants doublons, Docs, etc.).
3. **Exécution** : supprimer les éléments retenus, lancer linters/tests, ajuster imports.
4. **Revue** : vérifier que rien d’utile n’a disparu (logs, monitoring, scripts ops).

> Suggestion : exécuter `rg --files -g '*.bak'`, `rg --files -g '*Test*.tsx'`, `pip install pip-check` et `depcheck` côté Node pour objectiver la purge.

## Historique des purges effectuées (Batch 1)
- **Frontend** : suppression de `TestAPI`, composants `Trash*`, variantes `Settings*`, fichiers `.bak/.fixed`, duplication `Document/Document*`, script `create_archivage_workflow.py`, routage `/test-api` retiré.
- **Backend** : suppression complète du dossier `AppFlask/routes`, uniformisation de `AppFlask/app.py` autour des blueprints `AppFlask/api`, simplification de `AppFlask/__init__.py` et nettoyage des imports `main.py`.
- **Configs & secrets** : retrait de `environment_variables.txt`, `Procfile`, `railway.json`, `runtime.txt`, `package.json`/`package-lock.json` racine, script `AppFlask/scripts/add_status_column.py`.
- **Documentation** : mise à jour de ce plan + `docs/tableau_de_bord.md` pour refléter la nouvelle gouvernance.


