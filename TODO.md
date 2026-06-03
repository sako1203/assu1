# TODO

- [ ] Corriger `frontend/src/pages/AdminDashboard.jsx` : sauvegarde AUTO backoffice
  - Remplacer `section: "backoffice"` par sauvegarde par section réelle (infosVictime, etatBlessures, protection, etc)
  - Appeler `POST /api/tableaux/backoffice/:declaration_at` avec `{ section, donnees }`
- [ ] Corriger `handleBackofficeSave` dans `AdminDashboard.jsx` (ne doit pas appeler `saveVictimeData` avec `backofficeValues`)
- [ ] (Optionnel) Vérifier / améliorer l’erreur côté backend dans `backend/controllers/tableaux.controller.js` si `section` invalide
- [ ] Tester manuellement : remplir une correction backoffice puis vérifier que les tableaux ne restent plus vides

