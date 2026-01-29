# 🔍 DIAGNOSTIC COMPLET DES ERREURS - ESAG GED

**Date**: 2026-01-28 15:46
**Analyste**: Landry

---

## 📊 ERREURS IDENTIFIÉES

### 1. Routes manquantes - Erreur 404 → 500

**URLs en erreur** (frontend appelle sans `/api/`) :
- `http://localhost:5000/users/for-approval` ❌
- `http://localhost:5000/organizations` ❌
- `http://localhost:5000/sharing/roles` ❌

**Routes existantes** (avec `/api/`) :
- `/api/users/for-approval` ✅ (dans workflow.py)
- `/api/sharing/organizations` ✅ (dans documents_unified.py)
- `/api/sharing/roles` ✅ (dans documents_unified.py)

**Problème** : Le frontend appelle `/organizations` au lieu de `/api/sharing/organizations`

---

### 2. Route `/api/folders/` manquante

**Erreur** : `GET /api/folders/ → 404 Not Found`

**Cause** : Aucun blueprint pour la gestion des dossiers n'est enregistré

**Fichiers existants** :
- `AppFlask/models/folder.py` ✅ (modèle existe)
- Pas de `AppFlask/api/folders.py` ❌

---

### 3. Route `/api/history/` erreur 500

**Erreur dans les logs** :
```
werkzeug.exceptions.NotFound: 404 Not Found
File "flask/app.py", line 308, in send_static_file
```

**Cause** : Le blueprint history existe mais renvoie une erreur de fichier statique

---

## 🔧 SOLUTIONS

### Solution 1 : Créer l'API folders manquante

**Fichier à créer** : `AppFlask/api/folders.py`

Fonctionnalités nécessaires :
- `GET /api/folders/` - Liste tous les dossiers
- `GET /api/folders/<id>` - Détails d'un dossier
- `POST /api/folders/` - Créer un dossier
- `PUT /api/folders/<id>` - Modifier un dossier
- `DELETE /api/folders/<id>` - Supprimer un dossier

---

### Solution 2 : Corriger les URLs frontend

**Fichiers frontend à corriger** :
- Remplacer `/users/for-approval` → `/api/users/for-approval`
- Remplacer `/organizations` → `/api/sharing/organizations`
- Remplacer `/sharing/roles` → `/api/sharing/roles`

---

### Solution 3 : Vérifier le blueprint history

Le blueprint existe mais semble avoir un problème de routage.

---

## 📋 PLAN D'ACTION

1. ✅ Créer `AppFlask/api/folders.py`
2. ✅ Enregistrer le blueprint dans `app.py`
3. ✅ Vérifier que toutes les routes sont accessibles
4. ⏸️ Corriger les URLs frontend (optionnel si backend expose les bonnes routes)

---

## 🎯 ROUTES ATTENDUES PAR LE FRONTEND

D'après les logs, le frontend attend :
- `/api/folders/` ← À créer
- `/api/users/for-approval` ← Existe
- `/api/organizations` ← Devrait être `/api/sharing/organizations`
- `/api/sharing/roles` ← Existe
- `/api/history/` ← Existe mais erreur 500

---

**Prochaine étape** : Créer l'API folders complète
