# Guide de Démarrage Local - ESAG GED

Ce guide vous aidera à démarrer le projet ESAG GED en local pour le développement.

## 📋 Prérequis

- **Python 3.8+** (recommandé: 3.11)
- **Node.js 16+** et npm
- **PostgreSQL 12+**
- **Git**

## 🚀 Installation

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd esag_ged
```

### 2. Configuration de la base de données PostgreSQL

```bash
# Créer la base de données
createdb esag_ged

# Ou via psql
psql -U postgres
CREATE DATABASE esag_ged;
\q
```

### 3. Configuration des variables d'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer .env avec vos valeurs
nano .env  # ou vim, code, etc.
```

**Variables essentielles à configurer :**
- `SECRET_KEY` : Générer une clé secrète unique (ex: `openssl rand -hex 32`)
- `DATABASE_URL` : URL de connexion PostgreSQL
- `CORS_ALLOWED_ORIGINS` : URLs autorisées pour CORS

### 4. Installation des dépendances Python

```bash
# Créer un environnement virtuel (recommandé)
python3 -m venv venv

# Activer l'environnement virtuel
# Sur Linux/Mac:
source venv/bin/activate
# Sur Windows:
# venv\Scripts\activate

# Installer les dépendances
pip install --upgrade pip
pip install -r requirements/dev.txt
pip install -e .
```

### 5. Installation des dépendances Frontend

```bash
cd frontend
npm install
cd ..
```

## 🗄️ Initialisation de la base de données

Si vous avez des migrations Alembic :

```bash
alembic upgrade head
```

Sinon, vous devrez créer les tables manuellement selon votre schéma.

## ▶️ Démarrage

### Option 1 : Avec Makefile (recommandé)

⚠️ **Important** : Exécuter depuis la **racine** du projet

```bash
# Assurez-vous d'être à la racine du projet
cd /home/unimbecile/CodeAim/esag_ged

# Démarrer le backend
make run

# Dans un autre terminal, démarrer le frontend
cd frontend
npm start
```

### Option 2 : Manuellement

⚠️ **Important** : Le fichier `main.py` est à la **racine**, pas dans `AppFlask/`

**Backend :**
```bash
# Depuis la racine du projet (où se trouve main.py)
python main.py
```

**Frontend :**
```bash
cd frontend
npm start
```

### Option 3 : Avec les commandes individuelles

**Backend :**
```bash
# Activer l'environnement virtuel
source venv/bin/activate

# Lancer l'application
python main.py
```

**Frontend :**
```bash
cd frontend
npm start
```

## 🌐 Accès à l'application

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:5000
- **Documentation API** : http://localhost:5000/api/docs/

## ✅ Vérification

### Tester le backend

```bash
# Health check
curl http://localhost:5000/

# Test avec authentification
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

### Tester le frontend

Ouvrir http://localhost:3000 dans le navigateur.

## 🔧 Dépannage

### Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL est démarré
sudo systemctl status postgresql

# Vérifier la connexion
psql -U postgres -d esag_ged
```

### Erreur de port déjà utilisé

```bash
# Trouver le processus utilisant le port 5000
lsof -i :5000

# Tuer le processus
kill -9 <PID>
```

### Erreur de dépendances Python

```bash
# Réinstaller les dépendances
pip install --upgrade -r requirements/dev.txt
```

### Erreur de dépendances Node

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 📝 Commandes utiles

```bash
# Tests
make test
# ou
pytest AppFlask/tests/ -v

# Linting
make lint

# Formatage
make format

# Nettoyage
make clean
```

## 🐛 Mode Debug

Pour activer le mode debug, dans `.env` :

```env
FLASK_ENV=development
```

Ou directement dans le terminal :

```bash
export FLASK_ENV=development
python main.py
```

## 📦 Structure des ports

- **Backend Flask** : `5000`
- **Frontend React** : `3000`
- **PostgreSQL** : `5432`

## 🔐 Première connexion

Si vous n'avez pas encore d'utilisateur, vous devrez :

1. Créer un utilisateur directement dans PostgreSQL
2. Ou utiliser un script d'initialisation si disponible

## 📚 Ressources

- Documentation API : http://localhost:5000/api/docs/
- Documentation complète : `/docs/`
- Tableau de bord : `/docs/tableau_de_bord.md`

## ⚠️ Notes importantes

- Ne jamais commiter le fichier `.env` (déjà dans `.gitignore`)
- Utiliser des valeurs de test pour le développement local
- La base de données de production ne doit jamais être utilisée en local

---

**Besoin d'aide ?** Consultez la documentation complète dans `/docs/` ou ouvrez une issue.

