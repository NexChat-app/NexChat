# NexChat — Refonte

Application de messagerie NexChat, réécrite en plusieurs fichiers (backend + frontend séparés).

## Structure

```
/frontend        Application web (HTML/CSS/JS vanilla, modules ES)
  index.html
  css/
  js/
  assets/        Logos officiels NexChat
/backend         API Node.js (Express) déployée sur Render
  server.js
  routes/
  utils/
firestore.rules  Règles Firestore à déposer dans la console Firebase
```

## Avancement (étape 1)

- [x] Authentification email + nom d'utilisateur (username), avec code de
      vérification envoyé par email (Brevo) avant validation du compte
- [x] Recherche d'utilisateurs par nom d'utilisateur + demande d'ami
- [x] Création de groupes (squelette : création + liste + messages Firestore)
- [x] Nouveau loader (écran de démarrage)
- [x] Règles Firestore de base (users, usernames, amis, groupes)
- [ ] Chat 1:1 complet (médias, édition/suppression de messages)
- [ ] Profils publics détaillés (façon Facebook)
- [ ] Statuts (stories)
- [ ] Marketplace
- [ ] Appels audio/vidéo

## Déploiement backend (Render)

1. Créer un nouveau "Web Service" sur Render, connecté à ce dépôt, dossier racine `backend/`
2. Build command : `npm install`
3. Start command : `npm start`
4. Variables d'environnement à renseigner (voir `backend/.env.example`) :
   - `BREVO_API_KEY`
   - `SENDER_EMAIL`
5. Une fois déployé, copier l'URL Render dans `frontend/js/firebase-config.js` (constante `BACKEND_URL`)

## Règles absolues du projet

- Pas d'emojis dans l'interface
- Pas de régression sur les fonctionnalités existantes
- Pas de couleurs néon, d'ombres ou d'effets arc-en-ciel
- Toute nouvelle règle Firestore nécessaire est ajoutée à `firestore.rules` et signalée
