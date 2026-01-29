# 📋 PLAN DE CORRECTIONS - ESAG GED

**Date**: 2026-01-28  
**Phase BMAD**: MODEL (Planification)  
**Analyste**: Landry

---

## 🎯 Objectif

Corriger **TOUTES** les erreurs identifiées dans l'analyse BREAK, en commençant par les plus critiques.

---

## 📊 Stratégie de correction

### Approche
1. **Priorité 1** - Erreurs critiques (bloquantes)
2. **Priorité 2** - Warnings importants (qualité)
3. **Priorité 3** - Nettoyage de code (maintenance)

### Méthode
- Corrections atomiques et testables
- Une correction = un commit potentiel
- Vérification après chaque correction
- Rollback facile si problème

---

## 🔴 PRIORITÉ 1 - CRITIQUE (Phase ACT immédiate)

### Correction 1.1: Colonne `workflow_instance.commentaire`

**Problème identifié**:
- La table `workflow_instance` n'a PAS de colonne `commentaire`
- Le code essaie d'utiliser `wi.commentaire` dans 2 fichiers
- Erreur PostgreSQL: `column wi.commentaire does not exist`

**Analyse de la structure actuelle**:
```sql
Table "workflow_instance"
- id
- workflow_id
- document_id
- statut
- etape_courante_id
- initiateur_id
- date_debut
- date_fin
- created_at
- updated_at
❌ PAS de colonne commentaire
```

**Occurrences dans le code**:
1. `AppFlask/services/validation_workflow_service.py:704`
   ```python
   wi.commentaire,  # ❌ N'existe pas
   ```

2. `AppFlask/models/workflow_instance.py:152`
   ```python
   COALESCE(wi.commentaire, 'Validation requise') as description  # ❌ N'existe pas
   ```

**Solutions possibles**:

#### Option A: Ajouter la colonne `commentaire` (RECOMMANDÉ)
**Avantages**:
- Permet de stocker des commentaires sur les instances de workflow
- Fonctionnalité utile pour les utilisateurs
- Cohérent avec l'intention du code

**Inconvénients**:
- Nécessite une modification de la base de données
- Doit mettre à jour la migration

**Actions**:
1. Ajouter la colonne à la base de données actuelle:
   ```sql
   ALTER TABLE workflow_instance 
   ADD COLUMN commentaire TEXT;
   ```

2. Mettre à jour la migration `20260128_0001_complete_schema.py`:
   ```python
   CREATE TABLE IF NOT EXISTS workflow_instance (
       ...
       commentaire TEXT,  # ← AJOUTER
       ...
   )
   ```

3. Aucune modification du code nécessaire

#### Option B: Supprimer les références à `commentaire`
**Avantages**:
- Pas de modification de base de données
- Correction rapide

**Inconvénients**:
- Perd une fonctionnalité potentiellement utile
- Doit modifier le code en 2 endroits

**Actions**:
1. `validation_workflow_service.py:704` - Supprimer la ligne
2. `workflow_instance.py:152` - Remplacer par:
   ```python
   'Validation requise' as description
   ```

**DÉCISION**: **Option A** - Ajouter la colonne
- Plus cohérent avec l'intention
- Fonctionnalité utile
- Pas de perte de fonctionnalité

---

## 🟡 PRIORITÉ 2 - IMPORTANTE (Phase ACT après P1)

### Correction 2.1: Imports TypeScript inutilisés

**Problème**: ~30 imports non utilisés dans le frontend

**Fichiers concernés**:
- `frontend/src/components/ActivityLog.tsx` (20+ imports)
- `frontend/src/components/Dashboard.tsx` (10+ imports)
- `frontend/src/components/CreateFolderModal.tsx` (2 imports)

**Solution**:
```bash
# Auto-fix avec ESLint
cd frontend
npx eslint --fix src/components/ActivityLog.tsx
npx eslint --fix src/components/Dashboard.tsx
npx eslint --fix src/components/CreateFolderModal.tsx
```

**Impact**: Réduit la taille du bundle de ~5-10 KB

---

### Correction 2.2: Variables React inutilisées

**Problème**: Variables déclarées mais jamais utilisées

**Fichiers concernés**:
- `Dashboard.tsx`: `selectedDocuments`, `setSelectedDocuments`, `isLoading`, `setIsLoading`, `user`, `handleGererStockage`

**Solution**:
```typescript
// Supprimer les lignes inutilisées
// OU commenter avec un TODO si utilisation future prévue
```

---

### Correction 2.3: Dépendances React Hooks

**Problème**: `useEffect` sans toutes les dépendances

**Fichiers concernés**:
- `ActivityLog.tsx:136` - Manque `fetchDocuments`, `fetchOperations`
- `Dashboard.tsx:122` - Manque `fetchData`

**Solution**:
```typescript
// Option 1: Ajouter les dépendances
useEffect(() => {
  fetchData();
}, [fetchData]); // ← Ajouter

// Option 2: Utiliser useCallback
const fetchData = useCallback(() => {
  // ...
}, []);
```

---

## 🟢 PRIORITÉ 3 - NETTOYAGE (Phase ACT optionnelle)

### Correction 3.1: Remplacer `print()` par `logger.debug()`

**Problème**: ~20 `print()` de debug dans le code backend

**Fichiers concernés**:
- `AppFlask/api/documents_unified.py` (8 occurrences)
- `AppFlask/api/search.py` (5 occurrences)

**Solution**:
```python
# Avant
print(f"🔍 [API DEBUG] user_id: {user_id}")

# Après
logger.debug(f"user_id: {user_id}")
```

**Script de remplacement automatique**:
```bash
cd AppFlask
find . -name "*.py" -exec sed -i 's/print(f"🔍 \[.*DEBUG\]/logger.debug(f"/g' {} \;
```

---

### Correction 3.2: Désactiver endpoint `/search/debug`

**Problème**: Endpoint de debug exposé en production

**Solution**:
```python
@bp.route('/search/debug', methods=['GET'])
@token_required
def debug_search(current_user):
    # Désactiver en production
    if os.getenv('FLASK_ENV') == 'production':
        return jsonify({'error': 'Not available in production'}), 403
    
    # Code de debug...
```

---

### Correction 3.3: TODOs documentés

**Problème**: 3 TODOs dans le code

**Actions**:
1. **Cloudinary** (`trash_manager.py:437`)
   - Créer une issue GitHub
   - Ou implémenter la suppression MinIO (déjà utilisé)

2. **Détection pages PDF** (`scan.py:292, 353`)
   - Créer une issue GitHub
   - Ou implémenter avec PyPDF2

---

## 📋 ORDRE D'EXÉCUTION (Phase ACT)

### Étape 1: Correction critique (5 min)
```bash
# 1. Ajouter colonne commentaire
docker exec esag_ged_postgres psql -U esag_user -d esag_ged -c \
  "ALTER TABLE workflow_instance ADD COLUMN commentaire TEXT;"

# 2. Mettre à jour la migration
# Éditer: migrations/versions/20260128_0001_complete_schema.py
```

### Étape 2: Nettoyage frontend (10 min)
```bash
cd frontend
npx eslint --fix src/components/*.tsx
npm run build  # Vérifier que tout compile
```

### Étape 3: Nettoyage backend (5 min)
```bash
# Remplacer print() par logger.debug()
cd AppFlask
# Édition manuelle ou script sed
```

### Étape 4: Sécurité (2 min)
```bash
# Protéger endpoint debug
# Éditer: AppFlask/api/search.py
```

### Étape 5: Vérification (5 min)
```bash
# Redémarrer backend
docker-compose restart backend

# Tester l'application
# Vérifier les logs
docker-compose logs -f backend
```

---

## ✅ CRITÈRES DE SUCCÈS

### Priorité 1
- [ ] Aucune erreur PostgreSQL dans les logs
- [ ] Workflows fonctionnent sans erreur 500
- [ ] Colonne `commentaire` existe dans `workflow_instance`

### Priorité 2
- [ ] Build frontend sans warnings ESLint
- [ ] Aucune variable React inutilisée
- [ ] Tous les `useEffect` ont les bonnes dépendances

### Priorité 3
- [ ] Aucun `print()` de debug dans le code
- [ ] Endpoint `/search/debug` protégé
- [ ] TODOs documentés dans GitHub Issues

---

## 🔄 ROLLBACK PLAN

Si problème après correction:

### Rollback colonne commentaire
```sql
ALTER TABLE workflow_instance DROP COLUMN commentaire;
```

### Rollback code frontend
```bash
git checkout -- frontend/src/components/
```

---

## 📊 ESTIMATION

| Priorité | Temps estimé | Complexité |
|----------|--------------|------------|
| P1 - Critique | 5 min | 🟢 Faible |
| P2 - Importante | 15 min | 🟡 Moyenne |
| P3 - Nettoyage | 10 min | 🟢 Faible |
| **TOTAL** | **30 min** | - |

---

## 🎯 PROCHAINE ÉTAPE

**Phase ACT** - Exécution des corrections selon ce plan

**Commencer par**: Priorité 1 - Correction critique `workflow_instance.commentaire`

---

**Fin de la planification MODEL**  
**Prochaine phase**: ACT (Exécution des corrections)
