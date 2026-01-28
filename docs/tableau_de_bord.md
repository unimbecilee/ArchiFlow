# Tableau de Bord de Réussite – ESAG GED

## 1. Vision & Périmètre
- **Objectif** : aligner ESAG GED sur une qualité “type Pydio Cells”.
- **Axes** : Disponibilité, Sécurité, Expérience Utilisateur, Qualité Produit, Scalabilité/Innovation.
- **Périmètre** : Backend Flask, Frontend React, services externes (Cloudinary, DB distante), workflows opérationnels.

## 2. Axes Stratégiques & OKR
| Axe | Objectif clé | Résultat clé (KR) | Responsable |
| --- | --- | --- | --- |
| Disponibilité & Performance | SLA > 99.5 % | p95 API < 400 ms, upload 50 Mo < 5 s | Tech Lead Backend |
| Sécurité & Conformité | 0 incident critique | Audit logs 100 %, RGPD “vert” | Security Officer |
| Expérience Utilisateur | Adoption soutenue | WAU/MAU > 60 %, NPS > 40 | Product Manager |
| Qualité Produit | Production fiable | Couverture tests > 70 %, 0 déploiement rollback | QA Lead |
| Scalabilité & Innovation | Plateforme extensible | 3 intégrations clés, workflows dynamiques | CTO |

## 3. Indicateurs Clés (KPI)
### 3.1 Plateforme
- Uptime backend/frontend
- Temps de réponse API (p50/p95)
- Taux d’erreurs 4xx/5xx
- Capacité transactions/minute

### 3.2 Sécurité
- Taux d’échecs authentification (détection brute-force)
- Incidents sécurité/mois
- Couverture audit logs (documents, workflows, admin)
- État conformité RGPD/ISO (checklist)

### 3.3 Expérience Utilisateur
- WAU/MAU et DAU/MAU
- NPS trimestriel
- Taux réussite workflows sans intervention
- Temps d’onboarding moyen

### 3.4 Qualité & Delivery
- Couverture tests backend/frontend
- Taux de déploiements automatisés réussis
- Bugs critiques post-release
- MTTR (Mean Time To Resolution) incidents

### 3.5 Scalabilité & Innovation
- Nombre d’organisations actives supportées
- Intégrations tierces actives (S3, LDAP, suites bureautiques)
- Avancement roadmap innovation (% fonctionnalités livrées)

## 4. Instrumentation & Collecte
| Domaine | Outils | Sources | Fréquence |
| --- | --- | --- | --- |
| Observabilité | Prometheus/Grafana | Metrics Flask, Node, DB | Temps réel |
| Logs & Audit | ELK / Loki + S3 | API, Workers, Auth | Temps réel |
| Qualité | GitHub Actions, SonarQube | Tests, lint, couverture | Chaque pipeline |
| UX & Feedback | Posthog, NPS form | Frontend, support | Hebdo / Trimestriel |
| Sécurité | Wazuh, Dependabot, Snyk | Infra + code | Continu |

## 5. Gouvernance & Rituels
- **Weekly Ops** : revue incidents, disponibilité, alertes.
- **Monthly Product Review** : KPIs UX, feedback clients, roadmap.
- **Quarterly Security Board** : audits, accès, pentests.
- **Post-mortem standard** : gabarit partagé pour chaque incident P1/P2.

## 6. Backlog Structuré
1. **Sprint 0 – Foundations**
   - Normaliser environnements (Docker Compose, Makefile).
   - Activer pipelines CI/CD (tests, lint, sécurité).
   - Mettre en place collecte métriques de base.
2. **Sprint 1 – Observabilité**
   - Dashboard Grafana (Uptime, p95, erreurs).
   - Alerting Slack/PagerDuty.
   - Journalisation structurée (JSON logs).
3. **Sprint 2 – Qualité & Sécurité**
   - Couverture tests >50 %, scanners dépendances.
   - Audit logs complets (création, partage, workflow).
4. **Sprint 3 – Expérience & Adoption**
   - Instrumentation UX (WAU/MAU, funnels).
   - Process feedback + NPS.
5. **Continu – Scalabilité & Innovation**
   - Intégrations externes, workflows avancés, collaboration temps réel.

## 7. Templates & Livrables
- **Fiche KPI** : Description, formule, source, owner, seuils.
- **Rapport Mensuel** : synthèse chiffres, alertes, actions.
- **Playbook Incident** : procédure détection → résolution → post-mortem.
- **Guide Onboarding Client** : étapes, support, indicateurs adoption.

## 8. Prochaines Étapes
1. Valider cette structure avec les parties prenantes.
2. Prioriser les KPIs critiques et assigner les owners.
3. Créer les tickets/epics correspondants dans l’outil de gestion (Jira/Linear/Notion).
4. Démarrer Sprint 0 : instrumentation minimale + CI/CD.


