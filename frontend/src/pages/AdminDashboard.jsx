import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import "./AdminDashboard.css";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const COLORS = ['#1e40af', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ✅ COMPOSANT STATS SIMPLIFIÉ (SANS HOOKS COMPLEXES POUR ÉVITER L'ERREUR DISPATCHER)
function DashboardStats({ dossier, getSocieteName }) {
  if (!dossier || dossier.length === 0) return null;

  // Calcul des données directement dans le corps (plus sûr pour le dispatcher React 19)
  const socCount = {};
  const degreeCount = { benin: 0, moyen: 0, grave: 0, deces: 0, inconnu: 0 };

  dossier.forEach(v => {
    const name = getSocieteName(v.societe) || "Inconnue";
    socCount[name] = (socCount[name] || 0) + 1;
    const deg = (v.medecin?.degreBlessure || v.responsableLocal?.degreBlessure || "inconnu").toLowerCase();
    if (degreeCount.hasOwnProperty(deg)) degreeCount[deg]++;
    else degreeCount.inconnu++;
  });

  const societyStats = Object.entries(socCount).map(([name, count]) => ({ name, count }));
  const injuryStats = Object.entries(degreeCount).filter(([_, v]) => v > 0).map(([name, value]) => ({ name: name.toUpperCase(), value }));

  return (
    <div className="stats-section" style={{ marginTop: '50px', borderTop: '2px solid #e2e8f0', paddingTop: '30px' }}>
      <h2 style={{ textAlign: 'center', color: '#1e40af', marginBottom: '30px' }}>📊 Statistiques Globales des Sinistres</h2>
      
      <div className="counters-container">
        {societyStats.map((stat, idx) => (
          <div key={idx} className="counter-item">
            <span className="counter-label">{stat.name}</span>
            <span className="counter-value">{stat.count}</span>
            <span className="counter-sub">victimes</span>
          </div>
        ))}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Répartition par Société</h3>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <BarChart width={500} height={300} data={societyStats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} />
              <Tooltip cursor={{fill: '#f1f5f9'}} />
              <Bar dataKey="count" name="Nombre de victimes" fill="#1e40af" radius={[4, 4, 0, 0]} />
            </BarChart>
          </div>
        </div>

        <div className="stat-card">
          <h3>Gravité des Blessures</h3>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <PieChart width={400} height={300}>
              <Pie
                data={injuryStats}
                cx={200} cy={150}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {injuryStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [societes, setSocietes] = useState([]);
  const [societeSelected, setSocieteSelected] = useState("");
  const [dateSelected, setDateSelected] = useState("");
  const [nomSelected, setNomSelected] = useState("");

  // Helper function for ITT calculation
  const calculateIttProvisionnel = (joursArret, salaireJournalier) => {
    const calculJours = Math.max(0, (parseFloat(joursArret) || 0) - 1);
    return (calculJours * (2 / 3.0) * (parseFloat(salaireJournalier) || 0)); // Ensure floating-point division
  };
  const [dossier, setDossier] = useState([]);
  const [victimeSelected, setVictimeSelected] = useState(null);
  const [sectionSelected, setSectionSelected] = useState(null);
  const [editMode, setEditMode] = useState(null); // null, ou { champId, valeur }
  const [editValues, setEditValues] = useState({});
  const [isMounted, setIsMounted] = useState(false);
  const [pendingInitialReports, setPendingInitialReports] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [confirmedFields, setConfirmedFields] = useState({});
  const [isFinalized, setIsFinalized] = useState(false);
  const [localEdits, setLocalEdits] = useState({});
  const [sectionConfirmed, setSectionConfirmed] = useState({});
  const [certificats, setCertificats] = useState([]);
  const [aiStatus, setAiStatus] = useState({});
  const [savingStatus, setSavingStatus] = useState(""); // "saving", "saved", ""

  const [initialCert, setInitialCert] = useState({ id: 'initial', type: "certificat initial", dateStamp: "", dateEnvoi: "", fromDate: "", toDate: "", duree: 0, dateReception: "", dateVictime: "", backoffice: "" });
  const [repriseCert, setRepriseCert] = useState({ id: 'reprise', type: "certificat de reprise de travail", dateStamp: "", dateEnvoi: "", fromDate: "", toDate: "", duree: 0, dateReception: "", dateVictime: "", backoffice: "" });
  const [guerison, setGuerison] = useState({ id: 'guerison', type: "certificat de guérison", dateStamp: "", dateEnvoi: "", fromDate: "", toDate: "", duree: 0, dateReception: "", dateVictime: "", backoffice: "" });
  const [prolongations, setProlongations] = useState([]);
  const [quittances, setQuittances] = useState([]);
  const [reglements, setReglements] = useState([]);

  const [backofficeValues, setBackofficeValues] = useState({});

  const handleBackofficeChange = (victimeId, section, field, value) => {
    setBackofficeValues(prev => ({
      ...prev,
      [victimeId]: {
        ...prev[victimeId],
        [section]: { ...prev[victimeId]?.[section], [field]: value }
      }
    }));
  };

  // Combine all certificats
  const allCertificats = [initialCert, ...prolongations, guerison, repriseCert];

  const totalITT = prolongations.reduce((sum, c) => sum + (parseInt(c.duree) || 0), 0);
  const totalDureeArret = 
    (parseInt(initialCert.duree) || 0) + 
    (parseInt(repriseCert.duree) || 0) + 
    prolongations.reduce((sum, c) => sum + (parseInt(c.duree) || 0), 0);

  // Calcul de la durée totale calendaire (période du début à la fin)
  const allDates = allCertificats
    .flatMap(c => [c.fromDate, c.toDate])
    .filter(d => d)
    .map(d => new Date(d).getTime());
  const minDate = allDates.length ? new Date(Math.min(...allDates)) : null;
  const maxDate = allDates.length ? new Date(Math.max(...allDates)) : null;
  const dureeCalendaire = (minDate && maxDate) ? Math.ceil((maxDate - minDate) / 86400000) + 1 : 0;

  const sections = [
    { key: "infosVictime", label: "INFOS SUR LA VICTIME" },
    { key: "etatBlessures", label: "ÉTAT DES BLESSURES" },
    { key: "certificats", label: "CERTIFICATS" },
    { key: "quittances", label: "SUIVI DES QUITTANCES" },
    { key: "reglements", label: "SUIVI DES REGLEMENTS" },
    { key: "protection", label: "PROTECTION" }
  ];

  const champLabels = {
    createdAt: "Date AT",
    nom: "Nom",
    prenom: "Prénom",
    dateNaissance: "Date naissance",
    cin: "CIN",
    port1: "Téléphone 1",
    port2: "Téléphone 2",
    adresse: "Adresse",
    departement: "Département",
    fonction: "Fonction",
    activite: "Activité",
    salaireJournalier: "Salaire journalier",
    typeAccident: "Type accident",
    referenceCie: "Référence CIE",
    referenceSte: "Référence société",
    societe: "Société",
    avisResponsableVictime: "Avis du responsable sur la victime",
    temoinNom: "Nom Témoin",
    temoinPrenom: "Prénom Témoin",
    temoinCin: "CIN Témoin",
    temoinPort: "Port Témoin",
    victimePortaitEPI: "Portait EPI ?",
    quelEPI: "Quel EPI ?",
    resumeCirconstances: "Résumé des circonstances (Backoffice)",

    nomMedecin: "Médecin",
    partieCorps: "Partie corps",
    typeLesion: "Type lésion",
    typeLesionPrecise: "Type lésion (précis)",
    degreBlessure: "Degré blessure",
    joursArret: "Jours arrêt",
    rapport: "Rapport",
    rapportsDetailles: "Rapports détaillés",
    circonstancesDetailles: "Circonstances détaillées",
    nomIntervenants: "Nom Intervenants",
    temoinsIntervenant: "Témoins Intervenant",
    conclusionEnquete: "Conclusion enquête",
    temoinIdentite: "Identité Témoin",
    avisVictimeCorrection: "Avis Victime (Backoffice)",
    decisionFinale: "Décision Finale (Backoffice)",
    certificat: "Certificat",

    epiObligatoire: "Victime devait -elle porter un EPI (O/N)",
    epiPorte: "le portait-elle (O/N) ?",
    lienDirectEPI: "Y-a -t'il un lien direct entre l'AT et l'absence de port de l'EPI",
    fauteCible: "A qui incombe la faute ?",
    epiImposeContrat: "EPI imposé dans le contrat ?",
    epiImposeAutre: "EPI imposé d'une autre manière ?"
  };

  const getSocieteName = useCallback((societeId) =>
    societes.find((s) => s._id === societeId)?.nomSociete || "", [societes]);

  // =========================
  // NOTIFICATIONS LOGIC
  // =========================
  useEffect(() => {
    // Récupérer les rapports médicaux qui attendent d'être déclarés par le Service AT
    axios.get("https://assu1-production.up.railway.app/api/rapport-medecin?role=service-at")
      .then(res => setPendingInitialReports(res.data))
      .catch(err => console.error("Erreur notifications Service AT:", err));
  }, [dossier]); // On rafraîchit si le dossier change (après une action)

  const allNotifications = useMemo(() => {
    let alerts = [];
    
    // 1. Alertes Service AT (Rapports médicaux reçus mais déclaration non créée)
    pendingInitialReports.forEach(r => {
      alerts.push({ 
        id: `at-${r._id}`, 
        victim: `${r.nom} ${r.prenom}`, 
        missing: ["Déclaration AT (Siège)"], 
        role: "Service AT", 
        color: "#1e40af", 
        victimId: null,
        isNewReport: true,
        fullData: r
      });
    });

    // 2. Alertes sur les dossiers existants (formulaires manquants)
    dossier.forEach(v => {
      const victimName = `${v.nom} ${v.prenom}`;
      let missing = [];
      if (!v.responsableLocal) missing.push("Formulaire Responsable");
      if (!v.enqueteur) missing.push("Rapport Enquêteur");

      if (missing.length > 0) {
        alerts.push({ 
          id: `missing-${v._id}`, 
          victim: victimName, 
          missing: missing, 
          role: missing.length > 1 ? "Multiple" : (v.responsableLocal ? "Enquêteur" : "Responsable Local"), 
          color: missing.length > 1 ? "#dc2626" : "#f59e0b", 
          victimId: v._id, 
          fullData: v,
          isNewReport: false
        });
      }
    });

    return alerts;
  }, [pendingInitialReports, dossier]);

  // =========================
  // IA ANALYSIS LOGIC
  // =========================
  const runAIAnalysis = () => {
    if (!victimeSelected) return;
    const v = victimeSelected;
    const victId = v._id;

    const newBackoffice = { ...(backofficeValues[victId] || {}) };
    const newAiStatus = { ...(aiStatus[victId] || {}) };

    // 1. Analyse INFOS VICTIME (Comparaison AT vs Médecin)
    newBackoffice.infosVictime = { ...(newBackoffice.infosVictime || {}) };
    newAiStatus.infosVictime = { ...(newAiStatus.infosVictime || {}) };

    getChampsParSection("infosVictime").forEach(f => {
      let valAT = (v[f] || "").toString().toLowerCase().trim();
      let valMed = "";
      
      if (f === "createdAt") {
        valAT = v[f] ? new Date(v[f]).toISOString().split('T')[0] : ""; // Compare ISO date strings
        valMed = v.medecin?.dateAT ? new Date(v.medecin.dateAT).toISOString().split('T')[0] : ""; // Compare ISO date strings
      } else if (f === "nom" || f === "prenom") {
        valMed = (v.medecin?.[f] || "").toString().toLowerCase().trim();
      } else {
        valMed = ""; // Pas de comparaison prévue pour les autres champs, on passera au else if
      }

      if (valAT && valMed) {
        if (valAT === valMed) {
          newBackoffice.infosVictime[f] = (f === "createdAt") ? valAT : (v[f] || valMed);
          newAiStatus.infosVictime[f] = "ok";
        } else {
          newAiStatus.infosVictime[f] = "error";
        }
      } else if (valAT || valMed) {
        // Pas de comparaison possible car une donnée manque : on prend celle qui existe
        newBackoffice.infosVictime[f] = valAT ? (f === "createdAt" ? valAT : v[f]) : (f === "createdAt" ? valMed : (v.medecin?.[f] || ""));
        newAiStatus.infosVictime[f] = "ok";
      }
    });

    // 2. Analyse ETAT DES BLESSURES (Médecin vs Responsable)
    newBackoffice.etatBlessures = { ...(newBackoffice.etatBlessures || {}) };
    newAiStatus.etatBlessures = { ...(newAiStatus.etatBlessures || {}) };
    
    getChampsParSection("etatBlessures").forEach(f => {
      const valMed = (v.medecin?.[f] || "").toString().toLowerCase().trim();
      let valResp = "";

      if (f === "typeLesion" || f === "degreBlessure") {
        const respF = f === "typeLesion" ? "typeBlessure" : f; // Corrected: respF was not used before
        valResp = (v.responsableLocal?.[respF] || "").toString().toLowerCase().trim();
      }

      if (valMed && valResp) {
        if (valMed === valResp) {
          newBackoffice.etatBlessures[f] = v.medecin?.[f];
          newAiStatus.etatBlessures[f] = "ok";
        } else {
          newAiStatus.etatBlessures[f] = "error";
        }
      } else if (valMed || valResp) {
        // On remplit avec la valeur disponible si l'une des deux manque
        newBackoffice.etatBlessures[f] = valMed ? v.medecin?.[f] : v.responsableLocal?.[f === "typeLesion" ? "typeBlessure" : f];
        newAiStatus.etatBlessures[f] = "ok";
      }
    });

    // 3. Analyse PROTECTION (Remplissage direct)
    newBackoffice.protection = { ...(newBackoffice.protection || {}) };
    newAiStatus.protection = { ...(newAiStatus.protection || {}) };
    getChampsParSection("protection").forEach(f => {
      newBackoffice.protection[f] = v.responsableLocal?.[f] || "";
      newAiStatus.protection[f] = "ok";
    });

    setBackofficeValues(prev => ({ ...prev, [victId]: newBackoffice }));
    setAiStatus(prev => ({ ...prev, [victId]: newAiStatus }));
  };

  // =========================
  // LOAD SOCIETES
  // =========================
  useEffect(() => {
    axios
      .get("https://assu1-production.up.railway.app/api/societe")
      .then((res) => setSocietes(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (sections.every(s => sectionConfirmed[s.key])) {
      setIsFinalized(true);
    }
  }, [sectionConfirmed, sections]);

  // =========================
  // AUTO-SAVE CERTIFICATS
  // =========================
  useEffect(() => {
    if (!victimeSelected || !victimeSelected._id) return;
    
    const autoSaveTimer = setTimeout(async () => {
      try {
        setSavingStatus("saving");
        const data = {
          certificats: allCertificats
        };
        await axios.post(
          `https://assu1-production.up.railway.app/api/tableaux/certificats/${victimeSelected._id}`,
          data,
          { headers: { "Content-Type": "application/json" } }
        );
        console.log("💾 Certificats auto-sauvegardés");
        setSavingStatus("saved");
        setTimeout(() => setSavingStatus(""), 2000); // Effacer le statut après 2 sec
      } catch (error) {
        console.error("❌ Erreur auto-sauvegarde certificats:", error);
        setSavingStatus("error");
        setTimeout(() => setSavingStatus(""), 2000);
      }
    }, 1000); // Debounce 1 seconde

    return () => clearTimeout(autoSaveTimer);
  }, [allCertificats, victimeSelected]);

  // =========================
  // AUTO-SAVE QUITTANCES
  // =========================
  useEffect(() => {
    if (!victimeSelected || !victimeSelected._id) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        setSavingStatus("saving");
        const data = {
          quittances: quittances
        };
        await axios.post(
          `https://assu1-production.up.railway.app/api/tableaux/quittances/${victimeSelected._id}`,
          data,
          { headers: { "Content-Type": "application/json" } }
        );
        console.log("💾 Quittances auto-sauvegardées");
        setSavingStatus("saved");
        setTimeout(() => setSavingStatus(""), 2000);
      } catch (error) {
        console.error("❌ Erreur auto-sauvegarde quittances:", error);
        setSavingStatus("error");
        setTimeout(() => setSavingStatus(""), 2000);
      }
    }, 1000); // Debounce 1 seconde

    return () => clearTimeout(autoSaveTimer);
  }, [quittances, victimeSelected]);

  // =========================
  // AUTO-SAVE REGLEMENTS
  // =========================
  useEffect(() => {
    if (!victimeSelected || !victimeSelected._id) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        setSavingStatus("saving");
        const data = {
          reglements: reglements
        };
        await axios.post(
          `https://assu1-production.up.railway.app/api/tableaux/reglements/${victimeSelected._id}`,
          data,
          { headers: { "Content-Type": "application/json" } }
        );
        console.log("💾 Règlements auto-sauvegardés");
        setSavingStatus("saved");
        setTimeout(() => setSavingStatus(""), 2000);
      } catch (error) {
        console.error("❌ Erreur auto-sauvegarde règlements:", error);
        setSavingStatus("error");
        setTimeout(() => setSavingStatus(""), 2000);
      }
    }, 1000); // Debounce 1 seconde

    return () => clearTimeout(autoSaveTimer);
  }, [reglements, victimeSelected]);

  // =========================
  // AUTO-SAVE BACKOFFICE VALUES
  // (sauvegarde par section réelle: infosVictime, etatBlessures, protection, etc)
  // =========================
  useEffect(() => {
    if (!victimeSelected || !victimeSelected._id) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        setSavingStatus("saving");

        const current = backofficeValues[victimeSelected._id] || {};
        const sectionsToSave = [
          "infosVictime",
          "etatBlessures",
          "certificats",
          "quittances",
          "reglements",
          "protection"
        ];

        await Promise.all(
          sectionsToSave.map(async (sectionKey) => {
            const donnees = current?.[sectionKey];
            if (!donnees || typeof donnees !== "object") return;

            const payload = { section: sectionKey, donnees };
            await axios.post(
              `https://assu1-production.up.railway.app/api/tableaux/backoffice/${victimeSelected._id}`,
              payload,
              { headers: { "Content-Type": "application/json" } }
            );
          })
        );

        console.log("💾 Données BackOffice auto-sauvegardées");
        setSavingStatus("saved");
        setTimeout(() => setSavingStatus(""), 2000);
      } catch (error) {
        console.error("❌ Erreur auto-sauvegarde backoffice:", error);
        setSavingStatus("error");
        setTimeout(() => setSavingStatus(""), 2000);
      }
    }, 1000); // Debounce 1 seconde

    return () => clearTimeout(autoSaveTimer);
  }, [backofficeValues, victimeSelected]);


  // =========================
  // UPDATE MAIN TABLE WITH EDITED DATA
  // =========================
  useEffect(() => {
    if (!victimeSelected || !victimeSelected._id) return;

    // Calculer les montants totaux depuis les RÈGLEMENTS (Source pour le suivi du paiement réel)
    const montantTotalVerse = reglements.reduce((sum, r) => sum + (parseFloat(r.montant) || 0), 0);
    const joursArret = parseFloat(victimeSelected?.medecin?.joursArret) || 0;
    const salaireDeclare = parseFloat(victimeSelected?.salaireJournalier) || 0;
    const totalJoursPayes = reglements.reduce((sum, r) => sum + (parseFloat(r.nbJours) || 0), 0);
    const ittProvisionnel = calculateIttProvisionnel(joursArret, salaireDeclare); // Use helper
    const montantRestant = ittProvisionnel - montantTotalVerse;

    // Récupérer le taux IPP depuis le certificat de guérison
    const tauxIPP = guerison?.tauxIPP || "-";

    // Mettre à jour la victime dans le dossier
    setDossier(prev =>
      prev.map(v =>
        v._id === victimeSelected._id
          ? {
              ...v,
              medecin: {
                ...(v.medecin || {}),
                joursArret: victimeSelected?.medecin?.joursArret || joursArret
              },
              // Ajouter des données temporaires pour l'affichage
              ittProvisionnel: ittProvisionnel.toFixed(2),
              montantRegle: montantTotalVerse.toFixed(2),
              totalJoursPayes: totalJoursPayes,
              montantRestant: montantRestant.toFixed(2), // Corrected calculation
              tauxIPP: tauxIPP
            }
          : v
      )
    );

    // SAUVEGARDER CES TOTAUX DANS LA BD POUR LES CONSERVER
    const autoSaveTimer = setTimeout(async () => {
      try {
        const data = {
          montantTotalVerse: montantTotalVerse.toFixed(2),
          tauxIPP: tauxIPP,
          totalJoursPayes: totalJoursPayes
        };
        await axios.put(
          `https://assu1-production.up.railway.app/api/declaration-at/${victimeSelected._id}`,
          data,
          { headers: { "Content-Type": "application/json" } }
        );
        console.log("💾 Totaux sauvegardés dans la BD");
      } catch (error) {
        console.error("❌ Erreur sauvegarde totaux:", error);
      }
    }, 1500);

    return () => clearTimeout(autoSaveTimer);
  }, [quittances, reglements, guerison, victimeSelected]);

  // =========================
  // SEARCH DOSSIER
  // =========================
  const chercherVictimes = async (societeId) => {
    const societe = societeId || societeSelected;

    let res;
    console.log("Recherche de victimes pour la société:", societe || "Toutes les sociétés");
    if (societe) {
      res = await axios.get(
        "https://assu1-production.up.railway.app/api/dashboard/recherche",
        { params: { societe } }
      );
    } else {
      // Fetch all victims if no société is selected
      res = await axios.get(
        "https://assu1-production.up.railway.app/api/dashboard/recherche"
      );
    }

    console.log("📊 Données reçues du dashboard:", res.data);
    if (!res.data || !Array.isArray(res.data)) return;

    // Ajouter les montants totaux et tauxIPP sauvegardés à chaque victime
    const dossierAvecTotaux = res.data.map(v => ({
      ...v,
      montantRegle: v.montantTotalVerse || "-",
      totalJoursPayes: v.totalJoursPayes || "-",
      tauxIPP: v.tauxIPP || "-",
      montantRestant: v.montantTotalVerse 
        ? ((Math.max(0, parseFloat(v.medecin?.joursArret || 0) - 1) * (2 / 3) * parseFloat(v.salaireJournalier || 0)) - parseFloat(v.montantTotalVerse)).toFixed(2)
        : "-"
    }));

    setDossier(dossierAvecTotaux);
    setVictimeSelected(null);
    setSectionSelected(null);
  };

  useEffect(() => {
    // Fetch all victims from all companies on load without filtering
    chercherVictimes(null);
  }, []);

  const resetRecherche = () => {
    setSocieteSelected("");
    setDateSelected("");
    setNomSelected("");
    setDossier([]);
    setVictimeSelected(null);
    setSectionSelected(null);
  };

  const computeIttValue = (item) => {
    const jours = parseFloat(item.medecin?.joursArret) || 0;
    const salaire = parseFloat(item.salaireJournalier) || 0;
    if (!jours || !salaire) return "-";
    const valeur = calculateIttProvisionnel(jours, salaire); // Use helper
    return valeur.toFixed(2);
  };

  // =========================
  // LOAD VICTIME DATA
  // =========================
  const loadVictimeData = async (victimeId) => {
    if (!victimeId) return;
    
    try {
      console.log("🔄 Chargement des données pour la victime (ID):", victimeId);
      const victimeRes = await axios.get(`https://assu1-production.up.railway.app/api/declaration-at/${victimeId}`);
      const victimeData = victimeRes.data;
      console.log("✅ Données victime chargées (API brute):", victimeData);
      
      // Fusionner avec l'état précédent pour conserver les objets déjà peuplés (médecin, enquêteur, responsable)
      setVictimeSelected(prev => {
        if (prev && prev._id === victimeId) {
          const merged = { ...prev, ...victimeData };
          // Empêcher l'écrasement des objets complets par des IDs (strings) s'ils existent déjà dans le state
          if ((typeof victimeData.medecin === 'string' || (typeof victimeData.medecin === 'object' && Object.keys(victimeData.medecin).length === 0)) && typeof prev.medecin === 'object') merged.medecin = prev.medecin;
          if ((typeof victimeData.enqueteur === 'string' || (typeof victimeData.enqueteur === 'object' && Object.keys(victimeData.enqueteur || {}).length === 0)) && typeof prev.enqueteur === 'object') merged.enqueteur = prev.enqueteur;
          if ((typeof victimeData.responsableLocal === 'string' || (typeof victimeData.responsableLocal === 'object' && Object.keys(victimeData.responsableLocal).length === 0)) && typeof prev.responsableLocal === 'object') merged.responsableLocal = prev.responsableLocal;
          return merged;
        }
        return victimeData;
      });

      // Charger les certificats depuis la nouvelle collection
      try {
        const certRes = await axios.get(`https://assu1-production.up.railway.app/api/tableaux/certificats/${victimeId}`);
        const certs = certRes.data || [];
        
        const initialCert = certs.find(c => c.type === "certificat initial") || { id: 'initial', type: "certificat initial", dateStamp: "", dateEnvoi: "", fromDate: "", toDate: "", duree: 0 };
        const repriseCert = certs.find(c => c.type === "certificat de reprise de travail") || { id: 'reprise', type: "certificat de reprise de travail", dateStamp: "", dateEnvoi: "", fromDate: "", toDate: "", duree: 0 };
        const guerison = certs.find(c => c.type === "certificat de guérison") || { id: 'guerison', type: "certificat de guérison", dateStamp: "", dateEnvoi: "", fromDate: "", toDate: "", duree: 0 };
        const prolongations = certs.filter(c => c.type === "certificat de prolongation") || [];

        setInitialCert(initialCert);
        setRepriseCert(repriseCert);
        setGuerison(guerison);
        setProlongations(prolongations);
      } catch (e) {
        console.warn("⚠️ Aucun certificat trouvé:", e);
        setInitialCert({ id: 'initial', type: "certificat initial", dateStamp: "", dateEnvoi: "", fromDate: "", toDate: "", duree: 0 });
        setRepriseCert({ id: 'reprise', type: "certificat de reprise de travail", dateStamp: "", dateEnvoi: "", fromDate: "", toDate: "", duree: 0 });
        setGuerison({ id: 'guerison', type: "certificat de guérison", dateStamp: "", dateEnvoi: "", fromDate: "", toDate: "", duree: 0 });
        setProlongations([]);
      }

      // Charger les quittances depuis la nouvelle collection (Bug fix: axios.get was missing)
      try { 
        const qRes = await axios.get(`https://assu1-production.up.railway.app/api/tableaux/quittances/${victimeId}`);
        setQuittances(qRes.data || []);
      } catch (e) {
        // If no quittances are found, it's not an error, just an empty array.
        // Only log a warning if the error is not a 404 or similar "not found" status.
        console.warn("⚠️ Aucune quittance trouvée:", e);
        setQuittances([]);
      }

      // Charger les règlements depuis la nouvelle collection
      try {
        const rRes = await axios.get(`https://assu1-production.up.railway.app/api/tableaux/reglements/${victimeId}`);
        setReglements(rRes.data || []);
      } catch (e) {
        console.warn("⚠️ Aucun règlement trouvé:", e);
        setReglements([]);
      }

      // Charger les corrections backoffice depuis la nouvelle collection
      try {
        const bRes = await axios.get(`https://assu1-production.up.railway.app/api/tableaux/backoffice/${victimeId}`);
        const backofficeData = bRes.data || [];
        if (backofficeData.length > 0) {
          const merged = {};
          backofficeData.forEach(b => {
            merged[b.section] = b.donnees;
          });
          setBackofficeValues(prev => ({ ...prev, [victimeId]: merged }));
        }
      } catch (e) {
        console.warn("⚠️ Aucune donnée backoffice trouvée:", e);
      }

    } catch (error) {
      console.error("❌ Erreur lors du chargement des données de la victime:", error);
      resetCertificatesAndQuittances(); // Use the helper function
    }
  };

  // =========================
  // SAVE VICTIME DATA
  // =========================
  const saveVictimeData = async (victimeId, data) => {
    try {
      await axios.put(
        `https://assu1-production.up.railway.app/api/declaration-at/${victimeId}`,
        data,
        { headers: { "Content-Type": "application/json" } }
      );
      console.log("✅ Données sauvegardées avec succès");
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
      alert("Erreur lors de la sauvegarde des données");
    }
  };

  const saveCertificats = async (victimeId) => {
    try {
      const data = {
        certificats: allCertificats
      };
      await axios.post(
        `https://assu1-production.up.railway.app/api/tableaux/certificats/${victimeId}`,
        data,
        { headers: { "Content-Type": "application/json" } }
      );
      console.log("✅ Certificats sauvegardés");
    } catch (error) {
      console.error("❌ Erreur sauvegarde certificats:", error);
      alert("Erreur lors de la sauvegarde des certificats");
    }
  };

  const saveQuittances = async (victimeId) => {
    try {
      const data = {
        quittances: quittances
      };
      await axios.post(
        `https://assu1-production.up.railway.app/api/tableaux/quittances/${victimeId}`,
        data,
        { headers: { "Content-Type": "application/json" } }
      );
      console.log("✅ Quittances sauvegardées");
    } catch (error) {
      console.error("❌ Erreur sauvegarde quittances:", error);
      alert("Erreur lors de la sauvegarde des quittances");
    }
  };

  const saveReglements = async (victimeId) => {
    try {
      const data = {
        reglements: reglements
      };
      await axios.post(
        `https://assu1-production.up.railway.app/api/tableaux/reglements/${victimeId}`,
        data,
        { headers: { "Content-Type": "application/json" } }
      );
      console.log("✅ Règlements sauvegardés");
    } catch (error) {
      console.error("❌ Erreur sauvegarde règlements:", error);
      alert("Erreur lors de la sauvegarde des règlements");
    }
  };

  // =========================
  // CHAMPS PAR SECTION
  // =========================
  const getChampsParSection = (sectionKey) => {
    switch (sectionKey) {
      case "infosVictime":
        return [
          "createdAt",
          "nom",
          "prenom",
          "dateNaissance",
          "cin",
          "port1",
          "port2",
          "adresse",
          "departement",
          "fonction",
          "activite",
          "salaireJournalier",
          "typeAccident",
          "referenceCie",
          "referenceSte",
          "societe",
          "avisResponsableVictime",
          "temoinNom",
          "temoinPrenom",
          "temoinCin",
          "temoinPort",
          "resumeCirconstances"
        ];

      case "etatBlessures":
        return [
          "nomMedecin",
          "partieCorps",
          "typeLesion",
          "typeLesionPrecise",
          "degreBlessure",
          "joursArret",
          "rapport",
          "rapportsDetailles",
          "circonstancesDetailles",
          "nomIntervenants",
          "temoinsIntervenant",
          "conclusionEnquete",
          "temoinIdentite",
          "avisVictimeCorrection",
          "decisionFinale",
          "certificat"
        ];

      case "quittances":
        return ["quittances"];

      case "protection":
        return [
          "epiObligatoire",
          "epiPorte",
          "lienDirectEPI",
          "fauteCible",
          "victimePortaitEPI",
          "quelEPI",
          "epiImposeContrat",
          "epiImposeAutre"
        ];

      case "reglements":
        return ["reglements"];

      default:
        return [];
    }
  };

  // =========================
  // TABLE RENDER
  // =========================
  const renderTable = (victime, champs, section) => {
    const fieldsEditables = ["lienDirectEPI", "fauteCible"];
    
    // ✅ SECTION ETAT BLESSURES - TABLEAU SPÉCIAL
    if (section === "etatBlessures") {
      return (
        <div className="table-container" key={section}>
          <table className="dashboard-table" style={{ border: "2px solid #1e293b", borderCollapse: "collapse", width: "auto", margin: "0 auto" }}>
            <thead>
              <tr className="dashboard-table-header" style={{ backgroundColor: "#1e293b", color: "white" }}>
                <th className="dashboard-th" style={{ fontSize: "15px" }}>Informations</th>
                <th className="dashboard-th accent">
                  1ER.MEDECIN<br />
                  <span style={{ fontSize: "12px", fontWeight: "normal" }}>nom - prénom-phone</span>
                </th>
                <th className="dashboard-th accent">
                  SUPERVISEUR LOCAL<br />
                  <span style={{ fontSize: "12px", fontWeight: "normal" }}>nom - prénom-phone</span>
                </th>
                <th className="dashboard-th" style={{ fontSize: "15px" }}>MEDECIN TRAITANT</th>
                <th className="dashboard-th accent">
                  SERVICE AT CLIENT<br />
                  <span style={{ fontSize: "12px", fontWeight: "normal" }}>nom prenom - phone</span>
                </th>
                <th className="dashboard-th accent">
                  ENQUETEUR<br />
                  <span style={{ fontSize: "12px", fontWeight: "normal" }}>nom - prenom-phone</span>
                </th>
                <th className="dashboard-th accent">
                  BOX OFFICE<br />
                  <span style={{ fontSize: "12px", fontWeight: "normal" }}>nom-prénom-phone</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Infos blessure de la victime */}
              <tr style={{ borderTop: "4px solid #1e293b", backgroundColor: "transparent" }}>
                <td colSpan="7" className="key-cell" style={{ border: "1px solid #d1d5db", padding: "15px", color: "#1e40af", fontWeight: "bold", fontSize: "18px" }}>🩹 Infos blessure de la victime</td>
              </tr>
              <tr>
                 <td className="key-cell">Type de blessures (utiliser cambio des blessures)</td>
                 <td>{victime?.medecin?.typeLesion || "-"}</td>
                 <td>{victime?.responsableLocal?.typeBlessure || "-"}</td>
                 <td>-</td>
                 <td>-</td>
                 <td>{victime?.enqueteur?.typeLesion || "-"}</td>
                 <td style={{ padding: "4px" }}>
                   <textarea 
                     placeholder="Saisie Backoffice" 
                     value={backofficeValues[victime._id]?.etatBlessures?.typeLesion || ""} 
                     onChange={(e) => handleBackofficeChange(victime._id, "etatBlessures", "typeLesion", e.target.value)}
                     style={{ width: "100%", minHeight: "40px", fontSize: "10px", padding: "4px" }}
                   />
                 </td>
              </tr>

              {/* Type de blessures plus précis */}
              <tr>
                 <td className="key-cell">Type de blessures (plus précis)</td>
                 <td>{victime?.medecin?.typeLesion || "-"}</td>
                 <td>-</td>
                 <td>-</td>
                 <td>-</td>
                 <td>-</td>
                 <td style={{ padding: "4px" }}>
                   <textarea 
                     placeholder="Saisie Backoffice" 
                     value={backofficeValues[victime._id]?.etatBlessures?.typeLesionPrecise || ""} 
                     onChange={(e) => handleBackofficeChange(victime._id, "etatBlessures", "typeLesionPrecise", e.target.value)}
                     style={{ width: "100%", minHeight: "40px", fontSize: "10px", padding: "4px" }}
                   />
                 </td>
              </tr>

              {/* Degré de blessures */}
              <tr>
                 <td className="key-cell">Degré de blessures (bénin - moyen - grave - décès)</td>
                 <td>{victime?.medecin?.degreBlessure || "-"}</td>
                 <td>{victime?.responsableLocal?.degreBlessure || "-"}</td>
                 <td>-</td>
                 <td>-</td>
                 <td>-</td>
                 <td style={{ padding: "4px" }}>
                   <textarea 
                     placeholder="Saisie Backoffice" 
                     value={backofficeValues[victime._id]?.etatBlessures?.degreBlessure || ""} 
                     onChange={(e) => handleBackofficeChange(victime._id, "etatBlessures", "degreBlessure", e.target.value)}
                     style={{ width: "100%", minHeight: "40px", fontSize: "10px", padding: "4px" }}
                   />
                 </td>
              </tr>

              {/* Partie du corps affectée */}
              <tr>
                <td className="key-cell">Partie du corps affectée</td>
                <td>{victime?.medecin?.partieCorps || "-"}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td style={{ padding: "4px" }}>
                  <textarea 
                    placeholder="Saisie Backoffice" 
                    value={backofficeValues[victime._id]?.etatBlessures?.partieCorps || ""} 
                    onChange={(e) => handleBackofficeChange(victime._id, "etatBlessures", "partieCorps", e.target.value)}
                    style={{ width: "100%", minHeight: "40px", fontSize: "10px", padding: "4px" }}
                  />
                </td>
              </tr>

              {/* Jours d'arrêt */}
              <tr>
                <td className="key-cell">Nombre de jours d'arrêt</td>
                <td>{victime?.medecin?.joursArret || "-"}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td style={{ padding: "4px" }}>
                  <textarea 
                    placeholder="Saisie Backoffice" 
                    value={backofficeValues[victime._id]?.etatBlessures?.joursArret || ""} 
                    onChange={(e) => handleBackofficeChange(victime._id, "etatBlessures", "joursArret", e.target.value)}
                    style={{ width: "100%", minHeight: "40px", fontSize: "10px", padding: "4px" }}
                  />
                </td>
              </tr>

              {/* Rapport */}
              <tr>
                <td className="key-cell">Rapport médical</td>
                <td>
                  {victime?.medecin?.rapport ? (
                    <textarea value={victime.medecin.rapport} readOnly style={{ width: "100%", height: "60px", fontSize: "10px", padding: "4px" }} />
                  ) : "-"}
                </td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td style={{ padding: "4px" }}>
                  <textarea 
                    placeholder="Saisie Backoffice" 
                    value={backofficeValues[victime._id]?.etatBlessures?.rapport || ""} 
                    onChange={(e) => handleBackofficeChange(victime._id, "etatBlessures", "rapport", e.target.value)}
                    style={{ width: "100%", minHeight: "40px", fontSize: "10px", padding: "4px" }}
                  />
                </td>
              </tr>

              {/* Circonstances détaillées */}
              <tr style={{ borderTop: "4px solid #1e293b", backgroundColor: "transparent" }}>
                <td colSpan="7" className="key-cell" style={{ border: "1px solid #d1d5db", padding: "10px", color: "#1e40af", fontWeight: "bold", fontSize: "18px" }}>🗣️ Rapports et Circonstances par intervenant</td>
              </tr>

              <tr>
                <td className="key-cell">Rapports détaillés</td>
                <td>
                  <textarea 
                    placeholder="Rapport du médecin" 
                    value={victime?.medecin?.rapport || ""}
                    readOnly
                    style={{ width: "100%", height: "120px", fontSize: "13px", padding: "8px", borderRadius: "4px", backgroundColor: "#f8fafc" }} 
                  />
                </td>
                <td>
                  <textarea 
                    placeholder="Rapport du superviseur" 
                    value={victime?.responsableLocal?.rapport || ""}
                    readOnly
                    style={{ width: "100%", height: "120px", fontSize: "13px", padding: "8px", borderRadius: "4px", backgroundColor: "#f8fafc" }} 
                  />
                </td>
                <td>-</td>
                <td>-</td>
                <td>
                  <textarea 
                    placeholder="Description de l'incident" 
                    value={victime?.enqueteur?.description || ""}
                    readOnly
                    style={{ width: "100%", height: "120px", fontSize: "13px", padding: "8px", borderRadius: "4px", backgroundColor: "#f8fafc" }} 
                  />
                </td>
                <td style={{ padding: "4px" }}>
                  <textarea 
                    placeholder="Correction/Synthèse" 
                    value={backofficeValues[victime._id]?.etatBlessures?.rapportsDetailles || ""} 
                    onChange={(e) => handleBackofficeChange(victime._id, "etatBlessures", "rapportsDetailles", e.target.value)}
                    style={{ width: "100%", height: "120px", fontSize: "10px", padding: "4px" }}
                  />
                </td>
              </tr>

              <tr>
                <td className="key-cell">Circonstances détaillées</td>
                <td>-</td>
                <td>
                  <textarea 
                    placeholder="Circonstances (superviseur)" 
                    value={victime?.responsableLocal?.circonstances || ""}
                    readOnly
                    style={{ width: "100%", height: "120px", fontSize: "13px", padding: "8px", borderRadius: "4px", backgroundColor: "#fdfdfd" }} 
                  />
                </td>
                <td>-</td>
                <td>-</td>
                <td>
                  <textarea 
                    placeholder="Circonstances (enquêteur)" 
                    value={victime?.enqueteur?.circonstancesEnquete || ""}
                    readOnly
                    style={{ width: "100%", height: "120px", fontSize: "13px", padding: "8px", borderRadius: "4px", backgroundColor: "#fdfdfd" }} 
                  />
                </td>
                <td>-</td>
              </tr>

              <tr>
                <td className="key-cell">Intervenant (Nom)</td>
                <td style={{ padding: "10px", fontSize: "13px" }}>{victime?.medecin?.nomMedecin || "-"}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td style={{ padding: "10px", fontSize: "13px" }}>{victime?.enqueteur?.nomEnqueteur || "-"}</td>
                <td style={{ padding: "4px" }}>
                  <textarea 
                    placeholder="Noms Backoffice" 
                    value={backofficeValues[victime._id]?.etatBlessures?.nomIntervenants || ""} 
                    onChange={(e) => handleBackofficeChange(victime._id, "etatBlessures", "nomIntervenants", e.target.value)}
                    style={{ width: "100%", minHeight: "40px", fontSize: "10px", padding: "4px" }}
                  />
                </td>
              </tr>

              <tr>
                <td className="key-cell">Témoins rapportés</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td style={{ padding: "10px", fontSize: "13px" }}>{victime?.enqueteur?.temoins || "-"}</td>
                <td style={{ padding: "4px" }}>
                  <textarea 
                    placeholder="Témoins Backoffice" 
                    value={backofficeValues[victime._id]?.etatBlessures?.temoinsIntervenant || ""} 
                    onChange={(e) => handleBackofficeChange(victime._id, "etatBlessures", "temoinsIntervenant", e.target.value)}
                    style={{ width: "100%", minHeight: "40px", fontSize: "10px", padding: "4px" }}
                  />
                </td>
              </tr>

              <tr>
                <td className="key-cell">Conclusion enquête</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td style={{ padding: "10px", fontWeight: "bold", color: "#1e40af", fontSize: "14px" }}>
                  {victime?.enqueteur?.conclusion || "-"}
                </td>
                <td style={{ padding: "4px" }}>
                  <textarea 
                    placeholder="Saisie Backoffice" 
                    value={backofficeValues[victime._id]?.etatBlessures?.conclusionEnquete || ""} 
                    onChange={(e) => handleBackofficeChange(victime._id, "etatBlessures", "conclusionEnquete", e.target.value)}
                    style={{ width: "100%", minHeight: "40px", fontSize: "10px", padding: "4px" }}
                  />
                </td>
              </tr>

              {/* Témoins */}
              <tr style={{ borderTop: "4px solid #1e293b", backgroundColor: "transparent" }}>
                <td colSpan="7" className="key-cell" style={{ border: "1px solid #d1d5db", padding: "15px", color: "#1e40af", fontWeight: "bold", fontSize: "18px" }}>👥 Informations des Témoins</td>
              </tr>

              <tr>
                <td className="key-cell">Témoin (nom prenom CIN)</td>
                <td colSpan="5">{victime?.responsableLocal?.temoinNom && victime?.responsableLocal?.temoinPrenom ? `${victime.responsableLocal.temoinNom} ${victime.responsableLocal.temoinPrenom}` : "-"}{victime?.responsableLocal?.temoinCin ? ` (CIN: ${victime.responsableLocal.temoinCin})` : ""}</td>
                <td style={{ padding: "4px" }}>
                  <textarea 
                    placeholder="Identité Témoin" 
                    value={backofficeValues[victime._id]?.etatBlessures?.temoinIdentite || ""} 
                    onChange={(e) => handleBackofficeChange(victime._id, "etatBlessures", "temoinIdentite", e.target.value)}
                    style={{ width: "100%", minHeight: "40px", fontSize: "10px", padding: "4px" }}
                  />
                </td>
              </tr>

              <tr>
                <td className="key-cell">Avis de la victime</td>
                <td colSpan="5">
                  <textarea 
                    value={victime?.responsableLocal?.avisVictime || ""}
                    readOnly
                    style={{ width: "100%", height: "60px", fontSize: "11px", padding: "6px" }} 
                  />
                </td>
                <td style={{ padding: "4px" }}>
                  <textarea 
                    placeholder="Avis Backoffice" 
                    value={backofficeValues[victime._id]?.etatBlessures?.avisVictimeCorrection || ""} 
                    onChange={(e) => handleBackofficeChange(victime._id, "etatBlessures", "avisVictimeCorrection", e.target.value)}
                    style={{ width: "100%", height: "60px", fontSize: "10px", padding: "4px" }}
                  />
                </td>
              </tr>

              {/* Résumé des circonstances par box office */}
              <tr style={{ borderTop: "4px solid #1e293b", backgroundColor: "transparent" }}>
                <td colSpan="7" className="key-cell" style={{ border: "1px solid #d1d5db", padding: "15px", color: "#1e40af", fontWeight: "bold", fontSize: "18px" }}>📝 Résumé des circonstances par box office</td>
              </tr>

              <tr>
                <td colSpan="7">
                  <textarea 
                    placeholder="Résumé de synthèse" 
                    value={backofficeValues[victime._id]?.infosVictime?.resumeCirconstances || ""}
                    onChange={(e) => handleBackofficeChange(victime._id, "infosVictime", "resumeCirconstances", e.target.value)}
                    style={{ width: "100%", height: "80px", fontSize: "11px", padding: "6px" }} 
                  />
                </td>
              </tr>

              {/* EPI */}
              <tr style={{ borderTop: "4px solid #1e293b", backgroundColor: "transparent" }}>
                <td colSpan="7" className="key-cell" style={{ border: "1px solid #d1d5db", padding: "15px", color: "#1e40af", fontWeight: "bold", fontSize: "18px" }}>🛡️ Équipement de Protection Individuelle (EPI)</td>
              </tr>

              <tr>
                <td className="key-cell">Victime devait-elle porter un EPI (O/N)?</td>
                <td colSpan="5"><strong>{victime?.responsableLocal?.epiObligatoire && (victime.responsableLocal.epiObligatoire.toLowerCase() === "oui" ? "✅ OUI" : (victime.responsableLocal.epiObligatoire.toLowerCase() === "non" ? "❌ NON" : "-")) || "-"}</strong></td>
                <td style={{ padding: "4px" }}>
                  <textarea 
                    placeholder="Correction" 
                    value={backofficeValues[victime._id]?.protection?.epiObligatoire || ""} 
                    onChange={(e) => handleBackofficeChange(victime._id, "protection", "epiObligatoire", e.target.value)}
                    style={{ width: "100%", minHeight: "40px", fontSize: "10px", padding: "4px" }}
                  />
                </td>
              </tr>

              <tr>
                <td className="key-cell">Le portait-elle (O/N)?</td>
                <td colSpan="5"><strong>{victime?.responsableLocal?.epiPorte && (victime.responsableLocal.epiPorte.toLowerCase() === "oui" ? "✅ OUI" : (victime.responsableLocal.epiPorte.toLowerCase() === "non" ? "❌ NON" : "-")) || "-"}</strong></td>
                <td style={{ padding: "4px" }}>
                  <textarea 
                    placeholder="Correction" 
                    value={backofficeValues[victime._id]?.protection?.epiPorte || ""} 
                    onChange={(e) => handleBackofficeChange(victime._id, "protection", "epiPorte", e.target.value)}
                    style={{ width: "100%", minHeight: "40px", fontSize: "10px", padding: "4px" }}
                  />
                </td>
              </tr>

              <tr>
                <td className="key-cell">Y-a-t-il un lien direct entre l'AT et l'absence de port de l'EPI?</td>
                <td colSpan="5">
                  <textarea 
                    value={victime?.responsableLocal?.lienDirectEPI || ""}
                    readOnly
                    style={{ width: "100%", height: "60px", fontSize: "11px", padding: "6px" }} 
                  />
                </td>
                <td style={{ padding: "4px" }}>
                  <textarea 
                    placeholder="Correction" 
                    value={backofficeValues[victime._id]?.protection?.lienDirectEPI || ""} 
                    onChange={(e) => handleBackofficeChange(victime._id, "protection", "lienDirectEPI", e.target.value)}
                    style={{ width: "100%", height: "60px", fontSize: "10px", padding: "4px" }}
                  />
                </td>
              </tr>

              <tr>
                <td className="key-cell">À qui incombe la faute?</td>
                <td colSpan="5">
                  <textarea 
                    value={victime?.responsableLocal?.fauteCible || ""}
                    readOnly
                    style={{ width: "100%", height: "60px", fontSize: "11px", padding: "6px" }} 
                  />
                </td>
                <td style={{ padding: "4px" }}>
                  <textarea 
                    placeholder="Correction" 
                    value={backofficeValues[victime._id]?.protection?.fauteCible || ""} 
                    onChange={(e) => handleBackofficeChange(victime._id, "protection", "fauteCible", e.target.value)}
                    style={{ width: "100%", height: "60px", fontSize: "10px", padding: "4px" }}
                  />
                </td>
              </tr>

              {/* Conclusions EPI par Box Office */}
              <tr style={{ borderTop: "4px solid #1e293b", backgroundColor: "transparent" }}>
                <td colSpan="7" className="key-cell" style={{ border: "1px solid #d1d5db", padding: "15px", color: "#1e40af", fontWeight: "bold", fontSize: "18px" }}>✅ Décision et Conclusions Finales</td>
              </tr>

              <tr>
                <td className="key-cell">Décision Finale</td>
                <td colSpan="5">
                  <textarea 
                    value={victime?.responsableLocal?.decision || ""}
                    readOnly
                    style={{ width: "100%", height: "80px", fontSize: "11px", padding: "6px" }} 
                  />
                </td>
                <td style={{ padding: "4px" }}>
                  <textarea 
                    placeholder="Décision Backoffice" 
                    value={backofficeValues[victime._id]?.etatBlessures?.decisionFinale || ""} 
                    onChange={(e) => handleBackofficeChange(victime._id, "etatBlessures", "decisionFinale", e.target.value)}
                    style={{ width: "100%", height: "80px", fontSize: "10px", padding: "4px" }}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: "15px", display: "flex", gap: "10px", justifyContent: "center" }}>
            <button onClick={() => window.print()} style={{ padding: "10px 15px", background: "#64748b", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
              🖨️ Imprimer ce tableau
            </button>
          </div>
        </div>
      );
    }
  

    const fieldsEditables_rest = ["lienDirectEPI", "fauteCible"];
    
    const handleEditStart = (campo) => {
      let currentValue = "-";
      if (section === "infosVictime") {
        currentValue = localEdits[victime._id]?.[section]?.[campo] ?? victime?.[campo] ?? "";
      } else if (section === "etatBlessures") {
        currentValue = localEdits[victime._id]?.[section]?.[campo] ?? victime?.medecin?.[campo] ?? "";
      } else if (section === "protection") {
        currentValue = localEdits[victime._id]?.[section]?.[campo] ?? victime?.responsableLocal?.[campo] ?? "";
      } else if (section === "quittances") {
        currentValue = localEdits[victime._id]?.[section]?.[campo] ?? victime?.[campo] ?? "";
      } else if (section === "reglements") {
        currentValue = localEdits[victime._id]?.[section]?.[campo] ?? victime?.[campo] ?? "";
      }
      setEditMode(campo);
      setEditValues({
        [campo]: currentValue
      });
    };

    const handleEditSave = async (campo) => {
      setLocalEdits(prev => ({
        ...prev,
        [victime._id]: {
          ...prev[victime._id],
          [section]: {
            ...prev[victime._id]?.[section],
            [campo]: editValues[campo]
          }
        }
      }));
      setEditMode(null);
      setEditValues({});
    };

    const handleEditCancel = () => {
      setEditMode(null);
      setEditValues({});
    };

  const handleBackofficeSave = async () => {
    // sauvegarder par section via /api/tableaux/backoffice/:declaration_at
    const current = backofficeValues[victime._id] || {};
    const sectionsToSave = [
      "infosVictime",
      "etatBlessures",
      "certificats",
      "quittances",
      "reglements",
      "protection"
    ];

    await Promise.all(
      sectionsToSave.map(async (sectionKey) => {
        const donnees = current?.[sectionKey];
        if (!donnees || typeof donnees !== "object") return;

        await axios.post(
          `https://assu1-production.up.railway.app/api/tableaux/backoffice/${victime._id}`,
          { section: sectionKey, donnees },
          { headers: { "Content-Type": "application/json" } }
        );
      })
    );
  };


    const handleConfirmChange = (campo, value) => {
      setConfirmedFields(prev => ({
        ...prev,
        [victime._id]: {
          ...prev[victime._id],
          [section]: {
            ...prev[victime._id]?.[section],
            [campo]: value
          }
        }
      }));
    };

    const isAllConfirmed = section === "infosVictime" ? true : champs.every(c => confirmedFields[victime._id]?.[section]?.[c]);

    const handleConfirmer = async () => {
      // For certs, quittances, reglements, the save functions handle the data.
      // For other sections, handleBackofficeSave is called.
      if (section !== "certificats" && section !== "quittances" && section !== "reglements") {
        await handleBackofficeSave();
      }
      setSectionConfirmed(prev => ({ ...prev, [section]: true }));
    };

    if (section === "certificats") {
      const handleAddProlongation = () => {
        setProlongations(prev => [...prev, { 
          id: Date.now(), 
          type: "certificat de prolongation", 
          du: "",
          au: "",
          nombreJours: 0,
          nbJoursMedicins: "",
          ecart: "",
          validation: "",
          dateValidation: "",
          dateAapposer: "",
          envoisieg: "",
          receptionagence: "",
          dateenvoicourrier: "",
          envoiassurance: "",
          inspectiontravail: ""
        }]);
      };

      const handleRemoveProlongation = (id) => {
        setProlongations(prev => prev.filter(c => c.id !== id));
      };

      const handleCertificatChange = (id, field, value) => {
        if (id === 'initial') {
          setInitialCert(prev => ({ ...prev, [field]: value }));
        } else if (id === 'reprise') {
          setRepriseCert(prev => ({ ...prev, [field]: value }));
        } else if (id === 'guerison') {
          setGuerison(prev => ({ ...prev, [field]: value }));
        } else {
          setProlongations(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
        }
      };

      const salaireJournalier = parseFloat(victime?.salaireJournalier) || 0;
      const salaireMensuel = (salaireJournalier * 30).toFixed(2);
      const salaireAnnuel = (salaireJournalier * 360).toFixed(2);
      const salaireHoraire = (salaireJournalier / 8).toFixed(2);

      // Calcul du nombre de jours total
      const totalJours = allCertificats.reduce((sum, c) => {
        if (c.du && c.au) {
          const start = new Date(c.du);
          const end = new Date(c.au);
          const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }
        return sum + (parseInt(c.nombreJours) || 0);
      }, 0);

      return (
        <div className="table-container" key={section}>
          <h4 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "15px", color: "#1e40af", textAlign: "center" }}>📋 SUIVI DES CERTIFICATS MÉDICAUX</h4>

          {/* Section Salaires */}
          <div style={{ marginBottom: "20px", padding: "12px", background: "transparent", borderRadius: "8px", border: "2px solid #1e40af" }}>
            <p style={{ margin: "0 0 10px 0", fontWeight: "bold", color: "#1e40af" }}>Salaire journalier déclaré à la Chios :</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", fontSize: "12px" }}>
              <div style={{ padding: "8px", background: "#ffffff", borderRadius: "4px", border: "1px solid #1e40af" }}>
                <p style={{ margin: "0 0 5px 0", fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>SALAIRE MENSUEL</p>
                <p style={{ margin: "0", fontWeight: "bold", color: "#1e40af" }}>{salaireMensuel} DH</p>
              </div>
              <div style={{ padding: "8px", background: "#ffffff", borderRadius: "4px", border: "1px solid #1e40af" }}>
                <p style={{ margin: "0 0 5px 0", fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>SAL JOURNALIER</p>
                <p style={{ margin: "0", fontWeight: "bold", color: "#1e40af" }}>{salaireJournalier.toFixed(2)} DH</p>
              </div>
              <div style={{ padding: "8px", background: "#ffffff", borderRadius: "4px", border: "1px solid #1e40af" }}>
                <p style={{ margin: "0 0 5px 0", fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>SAL HORAIRE</p>
                <p style={{ margin: "0", fontWeight: "bold", color: "#1e40af" }}>{salaireHoraire} DH</p>
              </div>
              <div style={{ padding: "8px", background: "#ffffff", borderRadius: "4px", border: "1px solid #1e40af" }}>
                <p style={{ margin: "0 0 5px 0", fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>SAL ANNUEL</p>
                <p style={{ margin: "0", fontWeight: "bold", color: "#1e40af" }}>{salaireAnnuel} DH</p>
              </div>
            </div>
          </div>

          {/* Tableau principal */}
          <div style={{ overflowX: "auto", marginBottom: "20px" }}>
            <table style={{ fontSize: "10px", borderCollapse: "collapse", width: "auto", border: "2px solid #1e293b", margin: "0 auto" }}>
              <thead>
                <tr style={{ backgroundColor: "#1e293b", color: "white", height: "50px" }}>
                  <th style={{ padding: "8px", border: "2px solid #1e293b", minWidth: "120px", textAlign: "left", fontWeight: "bold", fontSize: "11px" }}>
                    TYPE CERTIFICAT
                  </th>
                  <th style={{ padding: "8px", border: "2px solid #1e293b", fontWeight: "bold", fontSize: "9px", minWidth: "70px" }}>DU</th>
                  <th style={{ padding: "8px", border: "2px solid #1e293b", fontWeight: "bold", fontSize: "9px", minWidth: "70px" }}>AU</th>
                  <th style={{ padding: "8px", border: "2px solid #1e293b", fontWeight: "bold", fontSize: "9px", minWidth: "60px" }}>NOMBRE JOUR EFFET ECHEANCE</th>
                  <th style={{ padding: "8px", border: "2px solid #1e293b", fontWeight: "bold", fontSize: "9px", minWidth: "70px" }}>NB J MÉD</th>
                  <th style={{ padding: "8px", border: "2px solid #1e293b", fontWeight: "bold", fontSize: "9px", minWidth: "60px" }}>ÉCART</th>
                  <th style={{ padding: "8px", border: "2px solid #1e293b", fontWeight: "bold", fontSize: "9px", minWidth: "70px" }}>VALID</th>
                  <th style={{ padding: "8px", border: "2px solid #1e293b", fontWeight: "bold", fontSize: "9px", minWidth: "70px" }}>DATE VAL</th>
                  <th style={{ padding: "8px", border: "2px solid #1e293b", fontWeight: "bold", fontSize: "9px", minWidth: "80px" }}>DATE ACCUSE RECEPTION</th>
                  <th style={{ padding: "8px", border: "2px solid #1e293b", fontWeight: "bold", fontSize: "9px", minWidth: "80px" }}>DATE ENVOI SIÈGE</th>
                  <th style={{ padding: "8px", border: "2px solid #1e293b", fontWeight: "bold", fontSize: "9px", minWidth: "80px" }}>RÉC AGENCE</th>
                  <th style={{ padding: "8px", border: "2px solid #1e293b", fontWeight: "bold", fontSize: "9px", minWidth: "80px" }}>ENVOI COURRIER</th>
                  <th style={{ padding: "8px", border: "2px solid #1e293b", fontWeight: "bold", fontSize: "9px", minWidth: "90px" }}>ENVOI ASSURANCE</th>
                  <th style={{ padding: "8px", border: "2px solid #1e293b", fontWeight: "bold", fontSize: "9px", minWidth: "70px" }}>INSP TRAVAIL</th>
                  <th style={{ padding: "8px", border: "2px solid #1e293b", fontWeight: "bold", fontSize: "9px", minWidth: "90px" }}>MONTANT PROV.</th>
                </tr>
              </thead>

              <tbody>
                {/* CERTIFICAT INITIAL */}
                {(() => {
                  const days = initialCert.du && initialCert.au ? Math.ceil((new Date(initialCert.au) - new Date(initialCert.du)) / (1000 * 60 * 60 * 24)) + 1 : 0;
                  const ecart = initialCert.nbJoursMedicins && days ? (parseInt(initialCert.nbJoursMedicins) || 0) - days : "-";
                  return (
                <tr style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", height: "50px" }}>
                  <td style={{ padding: "6px", border: "1px solid #d1d5db", fontWeight: "bold", fontSize: "10px", color: "#1e293b" }}>Certificat Initial</td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#eff6ff" }}>
                    <input type="date" value={initialCert.du || ""} onChange={(e) => handleCertificatChange('initial', 'du', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                  </td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#eff6ff" }}>
                    <input type="date" value={initialCert.au || ""} onChange={(e) => handleCertificatChange('initial', 'au', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                  </td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#eff6ff", textAlign: "center", fontWeight: "bold", fontSize: "9px" }}>
                    {days || "-"}
                  </td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db" }}>
                    <input type="text" value={initialCert.nbJoursMedicins || ""} onChange={(e) => handleCertificatChange('initial', 'nbJoursMedicins', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                  </td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db", textAlign: "center", fontWeight: "bold", fontSize: "10px", color: ecart !== "-" && ecart !== 0 ? (ecart < 0 ? "#be123c" : "#059669") : "inherit" }}>
                    {ecart}
                  </td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db" }}>
                    <input type="text" value={initialCert.validation || ""} onChange={(e) => handleCertificatChange('initial', 'validation', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                  </td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db" }}>
                    <input type="date" value={initialCert.dateValidation || ""} onChange={(e) => handleCertificatChange('initial', 'dateValidation', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                  </td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#fef3c7" }}>
                    <input type="date" value={initialCert.dateAapposer || ""} onChange={(e) => handleCertificatChange('initial', 'dateAapposer', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                  </td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#fef3c7" }}>
                    <input type="date" value={initialCert.envoisieg || ""} onChange={(e) => handleCertificatChange('initial', 'envoisieg', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                  </td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#fef3c7" }}>
                    <input type="date" value={initialCert.receptionagence || ""} onChange={(e) => handleCertificatChange('initial', 'receptionagence', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                  </td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#fef3c7" }}>
                    <input type="date" value={initialCert.dateenvoicourrier || ""} onChange={(e) => handleCertificatChange('initial', 'dateenvoicourrier', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                  </td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#fef3c7" }}>
                    <input type="date" value={initialCert.envoiassurance || ""} onChange={(e) => handleCertificatChange('initial', 'envoiassurance', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                  </td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db" }}>
                    <input type="text" value={initialCert.inspectiontravail || ""} onChange={(e) => handleCertificatChange('initial', 'inspectiontravail', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                  </td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#ffe4e6", fontWeight: "bold", fontSize: "9px", textAlign: "center", color: "#be123c" }}>
                    {initialCert.du && initialCert.au ? (Math.max(0, Math.ceil((new Date(initialCert.au) - new Date(initialCert.du)) / (1000 * 60 * 60 * 24))) * (2 / 3.0) * salaireJournalier).toFixed(2) : "-"} DH
                  </td>
                </tr>
                  );
                })()}

                {/* PROLONGATIONS */}
                {prolongations.map((cert, idx) => {
                  const days = cert.du && cert.au ? Math.ceil((new Date(cert.au) - new Date(cert.du)) / (1000 * 60 * 60 * 24)) + 1 : 0;
                  const ecart = cert.nbJoursMedicins && days ? (parseInt(cert.nbJoursMedicins) || 0) - days : "-";
                  return (
                  <tr key={cert.id} style={{ backgroundColor: idx % 2 === 0 ? "#f8fafc" : "#ffffff", borderBottom: "1px solid #e2e8f0", height: "40px" }}>
                    <td style={{ padding: "6px", border: "1px solid #d1d5db", fontWeight: "bold", fontSize: "10px", color: "#1e293b" }}>
                      Prolongation {idx + 1}
                      <button onClick={() => handleRemoveProlongation(cert.id)} style={{ marginLeft: "5px", backgroundColor: "#ef4444", color: "white", border: "none", padding: "2px 5px", borderRadius: "3px", cursor: "pointer", fontSize: "9px" }}>✕</button>
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#eff6ff" }}>
                      <input type="date" value={cert.du || ""} onChange={(e) => handleCertificatChange(cert.id, 'du', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#eff6ff" }}>
                      <input type="date" value={cert.au || ""} onChange={(e) => handleCertificatChange(cert.id, 'au', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#eff6ff", textAlign: "center", fontWeight: "bold", fontSize: "9px" }}>
                      {days || "-"}
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #d1d5db" }}>
                      <input type="text" value={cert.nbJoursMedicins || ""} onChange={(e) => handleCertificatChange(cert.id, 'nbJoursMedicins', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #d1d5db", textAlign: "center", fontWeight: "bold", fontSize: "10px", color: ecart !== "-" && ecart !== 0 ? (ecart < 0 ? "#be123c" : "#059669") : "inherit" }}>
                      {ecart}
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #d1d5db" }}>
                      <input type="text" value={cert.validation || ""} onChange={(e) => handleCertificatChange(cert.id, 'validation', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #d1d5db" }}>
                      <input type="date" value={cert.dateValidation || ""} onChange={(e) => handleCertificatChange(cert.id, 'dateValidation', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#fef3c7" }}>
                      <input type="date" value={cert.dateAapposer || ""} onChange={(e) => handleCertificatChange(cert.id, 'dateAapposer', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#fef3c7" }}>
                      <input type="date" value={cert.envoisieg || ""} onChange={(e) => handleCertificatChange(cert.id, 'envoisieg', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#fef3c7" }}>
                      <input type="date" value={cert.receptionagence || ""} onChange={(e) => handleCertificatChange(cert.id, 'receptionagence', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#fef3c7" }}>
                      <input type="date" value={cert.dateenvoicourrier || ""} onChange={(e) => handleCertificatChange(cert.id, 'dateenvoicourrier', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#fef3c7" }}>
                      <input type="date" value={cert.envoiassurance || ""} onChange={(e) => handleCertificatChange(cert.id, 'envoiassurance', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #d1d5db" }}>
                      <input type="text" value={cert.inspectiontravail || ""} onChange={(e) => handleCertificatChange(cert.id, 'inspectiontravail', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#ffe4e6", fontWeight: "bold", fontSize: "9px", textAlign: "center", color: "#be123c" }}>
                      {cert.du && cert.au ? (Math.max(0, Math.ceil((new Date(cert.au) - new Date(cert.du)) / (1000 * 60 * 60 * 24))) * (2 / 3.0) * salaireJournalier).toFixed(2) : "-"} DH
                    </td>
                  </tr>
                  );
                })}

                {/* CERTIFICAT REPRISE */}
                <tr style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", height: "40px" }}>
                  <td style={{ padding: "6px", border: "1px solid #d1d5db", fontWeight: "bold", fontSize: "10px", color: "#1e293b" }}>Certificat de Reprise</td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#eff6ff" }}>
                    <input type="date" value={repriseCert.du || ""} onChange={(e) => handleCertificatChange('reprise', 'du', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                  </td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#eff6ff" }}>
                    <input type="date" value={repriseCert.au || ""} onChange={(e) => handleCertificatChange('reprise', 'au', e.target.value)} style={{ width: "90%", fontSize: "9px", padding: "2px" }} />
                  </td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#eff6ff", textAlign: "center", fontWeight: "bold", fontSize: "9px" }}>
                    {repriseCert.du ? new Date(repriseCert.du).toLocaleDateString() : "-"}
                  </td>
                  <td colSpan="10" style={{ padding: "4px", border: "1px solid #d1d5db" }}></td>
                  <td style={{ padding: "4px", border: "1px solid #d1d5db", backgroundColor: "#ffe4e6" }}></td>
                </tr>
              </tbody>

              <tfoot>
                <tr style={{ backgroundColor: "#fef3c7", fontWeight: "bold", height: "40px", borderBottom: "2px solid #1e293b" }}>
                  <td style={{ padding: "8px", border: "1px solid #d1d5db", fontSize: "11px", color: "#1e293b" }}>TOTAL NB JOURS</td>
                  <td colSpan="2" style={{ padding: "8px", border: "1px solid #d1d5db", textAlign: "center", fontSize: "12px", fontWeight: "bold", color: "#059669" }}>TOTAL: {totalJours}</td>
                  <td style={{ padding: "8px", border: "1px solid #d1d5db", textAlign: "center", fontSize: "12px", fontWeight: "bold", color: "#059669" }}>JOURS: {totalJours}</td>
                  <td colSpan="10" style={{ padding: "8px", border: "1px solid #d1d5db" }}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* CERTIFICAT DE GUÉRISON */}
          <div style={{ marginTop: "15px", padding: "12px", background: "transparent", borderRadius: "8px", border: "2px solid #1e40af" }}>
            <h5 style={{ margin: "0 0 12px 0", color: "#1e40af", fontWeight: "bold", fontSize: "18px" }}>✅ CERTIFICAT DE GUÉRISON</h5>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", alignItems: "center" }}>
              <div style={{ fontWeight: "bold", fontSize: "11px", color: "#1e293b" }}>Certificat de Guérison</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#1e40af" }}>DATE :</label>
                <input type="date" value={guerison.du || ""} onChange={(e) => handleCertificatChange('guerison', 'du', e.target.value)} style={{ padding: "6px", fontSize: "10px", flex: 1, border: "1px solid #1e40af", borderRadius: "4px" }} />
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#1e40af" }}>TAUX IPP (%):</label>
                <input type="text" placeholder="Ex: 15%" value={guerison.tauxIPP || ""} onChange={(e) => handleCertificatChange('guerison', 'tauxIPP', e.target.value)} style={{ padding: "6px", fontSize: "10px", flex: 1, border: "1px solid #1e40af", borderRadius: "4px" }} />
              </div>
            </div>
          </div>

          {/* Information ITT */}
          <div style={{ marginTop: "15px", padding: "12px", background: "transparent", borderRadius: "8px", border: "2px solid #1e40af", display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px", alignItems: "center" }}>
            <div style={{ fontSize: "16px" }}>ℹ️</div>
            <p style={{ margin: "0", fontSize: "11px", color: "#7c2d12", fontWeight: "bold" }}>
              Montant IT Provisionnel = (Nb jours arrêt - 1) × 2/3 × Salaire journalier
            </p>
          </div>

          <div style={{ marginTop: "15px", display: "flex", gap: "10px", justifyContent: "center" }}>
            <button 
              onClick={handleAddProlongation}
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "white",
                border: "none",
                padding: "10px 15px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "13px"
              }}
            >
              + Ajouter Prolongation
            </button>
            <button 
              onClick={async () => {
                await saveCertificats(victime._id);
                handleConfirmer();
                await loadVictimeData(victime._id);
                alert('✅ Certificats sauvegardés');
              }} 
              style={{
                background: "linear-gradient(135deg, #3b82f6, #1e40af)",
                color: "white",
                border: "none",
                padding: "10px 15px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              ✔️ Confirmer les données
            </button>
            <button
              onClick={() => window.print()}
              style={{
                background: "#64748b",
                color: "white",
                border: "none",
                padding: "10px 15px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              🖨️ Imprimer
            </button>
          </div>
        </div>
      );
    }

    if (section === "quittances") {
      const handleAddQuittance = () => {
        setQuittances(prev => [...prev, { 
          id: Date.now(), 
          numero: "",
          dateReception: "", 
          dateSignatureVictime: "", 
          du: "",
          au: "",
          montantVerse: "",
          statut: "",
          signature: "",
          dateEnvoi: "",
          backoffice: ""
        }]);
      };

      const handleRemoveQuittance = (id) => {
        setQuittances(prev => prev.filter(q => q.id !== id));
      };

      const handleQuittanceChange = (id, field, value) => {
        setQuittances(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
      };

      const salaireJournalier = parseFloat(victime?.salaireJournalier) || 0;
      const montantTotal = quittances.reduce((sum, q) => sum + (parseFloat(q.montantVerse) || 0), 0).toFixed(2);
      const joursArret = parseFloat(victime?.medecin?.joursArret) || 0;
      const nombreJoursPayes = reglements.reduce((sum, r) => sum + (parseFloat(r.nbJours) || 0), 0);
      const calculJours = Math.max(0, joursArret - 1);
      const ittProvisionnel = (calculJours * (2 / 3) * salaireJournalier).toFixed(2);
      const montantRestant = (parseFloat(ittProvisionnel) - parseFloat(montantTotal)).toFixed(2);

      return (
        <div className="table-container" key={section}>
          <h4 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "15px", color: "#1e40af", textAlign: "center" }}>📋 SUIVI DES QUITTANCES</h4>

          {/* Montant Provisionnel Info */}
          <div style={{ marginBottom: "20px", padding: "12px", background: "transparent", borderRadius: "8px", border: "2px solid #1e40af" }}>
            <p style={{ margin: "0 0 12px 0", fontWeight: "bold", color: "#1e40af", fontSize: "18px" }}>📊 MONTANT PROVISIONNEL IT</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px", fontSize: "11px" }}>
              <div style={{ padding: "10px", background: "#ffffff", borderRadius: "4px", border: "2px solid #1e40af" }}>
                <p style={{ margin: "0 0 6px 0", fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>MONTANT PROVISIONNEL</p>
                <p style={{ margin: "0", fontWeight: "bold", color: "#1e40af", fontSize: "14px" }}>{ittProvisionnel} DH</p>
              </div>
              <div style={{ padding: "10px", background: "#ffffff", borderRadius: "4px", border: "2px solid #10b981" }}>
                <p style={{ margin: "0 0 6px 0", fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>MONTANT TOTAL VERSÉ</p>
                <p style={{ margin: "0", fontWeight: "bold", color: "#059669", fontSize: "14px" }}>{montantTotal} DH</p>
              </div>
              <div style={{ padding: "10px", background: "#ffffff", borderRadius: "4px", border: "2px solid #f97316" }}>
                <p style={{ margin: "0 0 6px 0", fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>MONTANT RESTANT</p>
                <p style={{ margin: "0", fontWeight: "bold", color: "#dc2626", fontSize: "14px" }}>{montantRestant} DH</p>
              </div>
            </div>
          </div>

          <div style={{ overflowX: "auto", marginBottom: "20px" }}>
            <table style={{ fontSize: "10px", borderCollapse: "collapse", width: "auto", border: "2px solid #1e293b", margin: "0 auto" }}>
              <thead>
                <tr style={{ backgroundColor: "#1e293b", color: "white", height: "60px" }}>
                  <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "100px", textAlign: "left", fontWeight: "bold", fontSize: "11px" }}>N° QUITTANCE</th>
                  <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "110px", fontWeight: "bold", fontSize: "10px" }}>DATE RÉCEPTION<br/>(Siège)</th>
                  <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "100px", fontWeight: "bold", fontSize: "10px" }}>NUMÉRO</th>
                  <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "110px", fontWeight: "bold", fontSize: "10px" }}>DATE SIGNATURE<br/>(Victime)</th>
                  <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "90px", fontWeight: "bold", fontSize: "10px" }}>DU</th>
                  <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "90px", fontWeight: "bold", fontSize: "10px" }}>AU</th>
                  <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "100px", fontWeight: "bold", fontSize: "10px" }}>MONTANT<br/>(DH)</th>
                  <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "90px", fontWeight: "bold", fontSize: "10px" }}>STATUT</th>
                  <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "100px", fontWeight: "bold", fontSize: "10px" }}>DATE ENVOI</th>
                  <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "120px", fontWeight: "bold", fontSize: "10px" }}>BACKOFFICE</th>
                  
                </tr>
              </thead>
              <tbody>
                {quittances.map((quittance, index) => (
                  <tr key={quittance.id} style={{ 
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    height: "50px"
                  }}>
                    <td style={{ padding: "6px", border: "1px solid #d1d5db", fontWeight: "bold", color: "#1e293b", textAlign: "center", fontSize: "11px" }}>
                      QUT-{String(index + 1).padStart(3, '0')}
                    </td>
                    <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                      <input type="date" value={quittance.dateReception || ""} onChange={(e) => handleQuittanceChange(quittance.id, 'dateReception', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px" }} />
                    </td>
                    <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                      <input type="text" placeholder="Ex: QT-001" value={quittance.numero || ""} onChange={(e) => handleQuittanceChange(quittance.id, 'numero', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px", textAlign: "center", fontWeight: "bold" }} />
                    </td>
                    <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                      <input type="date" value={quittance.dateSignatureVictime || ""} onChange={(e) => handleQuittanceChange(quittance.id, 'dateSignatureVictime', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px" }} />
                    </td>
                    <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                      <input type="date" value={quittance.du || ""} onChange={(e) => handleQuittanceChange(quittance.id, 'du', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px" }} />
                    </td>
                    <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                      <input type="date" value={quittance.au || ""} onChange={(e) => handleQuittanceChange(quittance.id, 'au', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px" }} />
                    </td>
                    <td style={{ padding: "6px", border: "1px solid #d1d5db", fontWeight: "bold" }}>
                      <input type="number" placeholder="0.00" value={quittance.montantVerse || ""} onChange={(e) => handleQuittanceChange(quittance.id, 'montantVerse', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px", textAlign: "right" }} />
                    </td>
                    <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                      <select value={quittance.statut || ""} onChange={(e) => handleQuittanceChange(quittance.id, 'statut', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px" }}>
                        <option value="">--</option>
                        <option value="✓ Reçue">✓ Reçue</option>
                        <option value="⏳ Attente">⏳ Attente</option>
                        <option value="✍️ Signée">✍️ Signée</option>
                      </select>
                    </td>
                    <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                      <input type="date" value={quittance.dateEnvoi || ""} onChange={(e) => handleQuittanceChange(quittance.id, 'dateEnvoi', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px" }} />
                    </td>
                    <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                      <textarea placeholder="DECISION FINALE " value={quittance.backoffice || ""} onChange={(e) => handleQuittanceChange(quittance.id, 'backoffice', e.target.value)} style={{ width: "95%", minHeight: "35px", fontSize: "9px", padding: "3px" }} />
                    </td>
                    <td style={{ padding: "6px", border: "1px solid #d1d5db", textAlign: "center" }}>
                      <button onClick={() => handleRemoveQuittance(quittance.id)} style={{ backgroundColor: "#ef4444", color: "white", border: "none", padding: "4px 6px", borderRadius: "4px", cursor: "pointer", fontSize: "9px" }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: "bold", height: "40px" }}>
                  <td colSpan="4" style={{ padding: "8px", border: "1px solid #d1d5db", textAlign: "right", fontSize: "11px", color: "#1e40af" }}>💰 TOTAL MONTANT VERSÉ :</td>
                  <td style={{ padding: "8px", border: "1px solid #d1d5db", color: "#059669", fontWeight: "bold", textAlign: "right", fontSize: "11px" }}>{montantTotal} DH</td>
                  <td colSpan="4" style={{ padding: "8px", border: "1px solid #d1d5db" }}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", justifyContent: "center" }}>
            <button onClick={handleAddQuittance} style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white", border: "none", padding: "10px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}>+ Ajouter Quittance</button>
            <span style={{ fontSize: "12px", fontWeight: "bold", color: "#134e4a", alignSelf: "center" }}>Total: {quittances.length} quittance(s)</span>
          </div>

          {/* Récapitulatif */}
          <div style={{ marginTop: "15px", padding: "15px", background: "transparent", borderRadius: "8px", border: "2px solid #1e40af" }}>
            <h5 style={{ marginBottom: "10px", color: "#1e40af", fontWeight: "bold", fontSize: "18px" }}>📄 RÉCAPITULATIF</h5>
            <table style={{ fontSize: "10px", width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #1e40af" }}>
                  <th style={{ padding: "8px", border: "1px solid #d1d5db", textAlign: "left", fontWeight: "bold", minWidth: "80px" }}>N° QUT</th>
                  <th style={{ padding: "8px", border: "1px solid #d1d5db", textAlign: "left", fontWeight: "bold", minWidth: "100px" }}>DATE RÉC</th>
                  <th style={{ padding: "8px", border: "1px solid #d1d5db", textAlign: "left", fontWeight: "bold", minWidth: "100px" }}>DATE SIGN</th>
                  <th style={{ padding: "8px", border: "1px solid #d1d5db", textAlign: "left", fontWeight: "bold", minWidth: "100px" }}>DATE RENVOI</th>
                  <th style={{ padding: "8px", border: "1px solid #d1d5db", textAlign: "right", fontWeight: "bold", minWidth: "80px" }}>MONTANT (DH)</th>
                
                </tr>
              </thead>
              <tbody>
                {quittances.length > 0 ? quittances.map((q, index) => (
                  <tr key={q.id} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f0fdf4", borderBottom: "1px solid #ccfbf1" }}>
                    <td style={{ padding: "6px", border: "1px solid #ccfbf1", fontWeight: "bold" }}>QUT-{String(index + 1).padStart(3, '0')}</td>
                    <td style={{ padding: "6px", border: "1px solid #ccfbf1" }}>{q.dateReception || "-"}</td>
                    <td style={{ padding: "6px", border: "1px solid #ccfbf1" }}>{q.dateSignatureVictime || "-"}</td>
                    <td style={{ padding: "6px", border: "1px solid #ccfbf1" }}>{q.dateEnvoi || "-"}</td>
                    <td style={{ padding: "6px", border: "1px solid #ccfbf1", textAlign: "right", color: "#1e40af", fontWeight: "bold" }}>{parseFloat(q.montantVerse || 0).toFixed(2)} DH</td>
                    <td style={{ padding: "6px", border: "1px solid #ccfbf1" }}>{q.statut || "-"}</td>
                  </tr>
                )) : <tr><td colSpan="5" style={{ textAlign: "center", padding: "15px", color: "#64748b" }}>Aucune quittance enregistrée</td></tr>}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "15px", display: "flex", gap: "10px", justifyContent: "center" }}>
            <button onClick={async () => { await saveQuittances(victime._id); handleConfirmer(); await loadVictimeData(victime._id); alert('✅ Quittances sauvegardées'); }} style={{ background: "linear-gradient(135deg, #3b82f6, #1e40af)", color: "white", border: "none", padding: "10px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>✔️ Confirmer les données</button>
            <button onClick={() => window.print()} style={{ background: "#64748b", color: "white", border: "none", padding: "10px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>🖨️ Imprimer</button>
          </div>
        </div>
      );
    }

    if (section === "reglements") {
      const handleAddReglement = () => {
        setReglements(prev => [...prev, { 
          id: Date.now(), 
          dateReception: "", 
          dateReceptionMontant: "", 
          typePaiement: "", 
          montant: "", 
          dateRemise: "",
          dateRglVictime: "",
          modeRglt: "",
          banque: "",
          dateDebutBancaire: "",
          ecartDate: "",
          backoffice: ""
        }]);
      };

      const handleRemoveReglement = (id) => {
        setReglements(prev => prev.filter(r => r.id !== id));
      };

      const handleReglementChange = (id, field, value) => {
        setReglements(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
        setReglements(prev => prev.map(r => {
          if (r.id === id) {
            let updated = { ...r, [field]: value };
            // Calcul automatique du montant basé sur le nombre de jours payés
            if (field === 'nbJours') {
              const days = parseFloat(value) || 0;
              const salaire = parseFloat(victime?.salaireJournalier) || 0;
              updated.montant = (days * (2 / 3) * salaire).toFixed(2);
            }
            return updated;
          }
          return r;
        }));
      };

      const joursArret = parseFloat(victime?.medecin?.joursArret) || 0;
      const salaireDeclare = parseFloat(victime?.salaireJournalier) || 0;
      const calculJours = Math.max(0, joursArret - 1);
      const ittProvisionnel = (calculJours * (2 / 3) * salaireDeclare).toFixed(2);
      const montantTotalRegle = reglements.reduce((sum, r) => sum + (parseFloat(r.montant) || 0), 0).toFixed(2);
      const nombreJoursPayes = reglements.reduce((sum, r) => sum + (parseFloat(r.nbJours) || 0), 0);
      const montantRestant = (parseFloat(ittProvisionnel) - parseFloat(montantTotalRegle)).toFixed(2);

      return (
        <div className="table-container" key={section}>
          <h4 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "15px", color: "#1e40af", textAlign: "center" }}>💳 SUIVI DES RÈGLEMENTS</h4>

          {/* Montant Provisionnel Info */}
          <div style={{ marginBottom: "20px", padding: "12px", background: "transparent", borderRadius: "8px", border: "2px solid #1e40af" }}>
            <p style={{ margin: "0 0 12px 0", fontWeight: "bold", color: "#1e40af", fontSize: "18px" }}>📊 MONTANT PROVISIONNEL ITT</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", fontSize: "11px" }}>
              <div style={{ padding: "10px", background: "#ffffff", borderRadius: "4px", border: "2px solid #1e40af" }}>
                <p style={{ margin: "0 0 6px 0", fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>NOMBRE DE JOURS PAYÉS</p>
                <p style={{ margin: "0", fontWeight: "bold", color: "#1e40af", fontSize: "14px" }}>{nombreJoursPayes} JOURS</p>
              </div>
              <div style={{ padding: "10px", background: "#ffffff", borderRadius: "4px", border: "2px solid #1e40af" }}>
                <p style={{ margin: "0 0 6px 0", fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>MONTANT PROVISIONNEL</p>
                <p style={{ margin: "0", fontWeight: "bold", color: "#1e40af", fontSize: "14px" }}>{ittProvisionnel} DH</p>
              </div>
              <div style={{ padding: "10px", background: "#ffffff", borderRadius: "4px", border: "2px solid #10b981" }}>
                <p style={{ margin: "0 0 6px 0", fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>MONTANT TOTAL RÉGLÉ</p>
                <p style={{ margin: "0", fontWeight: "bold", color: "#059669", fontSize: "14px" }}>{montantTotalRegle} DH</p>
              </div>
              <div style={{ padding: "10px", background: "#ffffff", borderRadius: "4px", border: "2px solid #f97316" }}>
                <p style={{ margin: "0 0 6px 0", fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>MONTANT RESTANT</p>
                <p style={{ margin: "0", fontWeight: "bold", color: "#dc2626", fontSize: "14px" }}>{montantRestant} DH</p>
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: "20px" }}>
            <h5 style={{ fontSize: "13px", fontWeight: "bold", color: "#1e40af", marginBottom: "10px" }}>📥 RÈGLEMENTS REÇUS DE LA COMPAGNIE/COURTIER</h5>
            <div style={{ overflowX: "auto" }}>
              <table style={{ fontSize: "10px", borderCollapse: "collapse", width: "auto", border: "2px solid #1e293b", margin: "0 auto" }}>
                <thead>
                  <tr style={{ backgroundColor: "#1e293b", color: "white", height: "60px" }}>
                    <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "110px", fontWeight: "bold", fontSize: "10px" }}>DATE RÉC.<br/>(Compagnie)</th>
                    <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "110px", fontWeight: "bold", fontSize: "10px" }}>DATE RÈGLT.<br/>(CT)</th>
                    <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "80px", fontWeight: "bold", fontSize: "10px" }}>NB JOURS</th>
                    <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "110px", fontWeight: "bold", fontSize: "10px" }}>MONTANT<br/>(DH)</th>
                    <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "100px", fontWeight: "bold", fontSize: "10px" }}>MODE RGLT</th>
                    <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "100px", fontWeight: "bold", fontSize: "10px" }}>BANQUE</th>
                    <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "110px", fontWeight: "bold", fontSize: "10px" }}>DATE DÉBIT<br/>BANCAIRE</th>
                    <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "70px", fontWeight: "bold", fontSize: "10px" }}>ÉCART</th>
                    <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "50px", fontWeight: "bold", fontSize: "10px" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {reglements.map((reglement, index) => (
                    <tr key={reglement.id} style={{ 
                      backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      height: "50px"
                    }}>
                      <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                        <input type="date" value={reglement.dateReceptionMontant || ""} onChange={(e) => handleReglementChange(reglement.id, 'dateReceptionMontant', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px" }} />
                      </td>
                      <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                        <input type="date" value={reglement.dateRglVictime || ""} onChange={(e) => handleReglementChange(reglement.id, 'dateRglVictime', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px" }} />
                      </td>
                      <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                        <input type="number" value={reglement.nbJours || ""} onChange={(e) => handleReglementChange(reglement.id, 'nbJours', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px", textAlign: "center" }} />
                      </td>
                      <td style={{ padding: "6px", border: "1px solid #d1d5db", fontWeight: "bold" }}>
                        <input type="number" placeholder="0.00" value={reglement.montant || ""} onChange={(e) => handleReglementChange(reglement.id, 'montant', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px", textAlign: "right" }} />
                      </td>
                      <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                        <select value={reglement.modeRglt || ""} onChange={(e) => handleReglementChange(reglement.id, 'modeRglt', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px" }}>
                          <option value="">--</option>
                          <option value="Espèces">Espèces</option>
                          <option value="Chèque">Chèque</option>
                          <option value="Virement">Virement</option>
                        </select>
                      </td>
                      <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                        <input type="text" placeholder="BQ" value={reglement.banque || ""} onChange={(e) => handleReglementChange(reglement.id, 'banque', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px" }} />
                      </td>
                      <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                        <input type="date" value={reglement.dateDebutBancaire || ""} onChange={(e) => handleReglementChange(reglement.id, 'dateDebutBancaire', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px" }} />
                      </td>
                      <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                        <input type="number" placeholder="0" value={reglement.ecartDate || ""} onChange={(e) => handleReglementChange(reglement.id, 'ecartDate', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px", textAlign: "center" }} />
                      </td>
                      <td style={{ padding: "6px", border: "1px solid #d1d5db", textAlign: "center" }}>
                        <button onClick={() => handleRemoveReglement(reglement.id)} style={{ backgroundColor: "#ef4444", color: "white", border: "none", padding: "4px 6px", borderRadius: "4px", cursor: "pointer", fontSize: "9px" }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: "bold", height: "40px" }}>
                    <td colSpan="3" style={{ padding: "8px", border: "1px solid #d1d5db", textAlign: "right", fontSize: "11px", color: "#1e40af" }}>💰 TOTAL MONTANTS VERSÉS :</td>
                    <td style={{ padding: "8px", border: "1px solid #d1d5db", color: "#059669", fontWeight: "bold", textAlign: "right", fontSize: "11px" }}>{montantTotalRegle} DH</td>
                    <td colSpan="5" style={{ padding: "8px", border: "1px solid #d1d5db" }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button onClick={handleAddReglement} style={{ marginTop: "10px", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", border: "none", padding: "10px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px", display: "block", margin: "10px auto" }}>+ Ajouter Règlement</button>
          </div>

          <div style={{ marginTop: "20px", padding: "15px", background: "transparent", borderRadius: "8px", border: "2px solid #1e40af", textAlign: "center" }}>
            <h5 style={{ marginBottom: "15px", color: "#1e40af", fontWeight: "bold", fontSize: "18px" }}>📊 SYNTHÈSE - MONTANT IT PROVISIONNEL</h5>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
              <div style={{ padding: "10px", background: "#ffffff", borderRadius: "6px", border: "1px solid #1e40af" }}>
                <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#64748b" }}>Jours payés</p>
                <p style={{ margin: "0", fontWeight: "bold", fontSize: "16px", color: "#059669" }}>{nombreJoursPayes} jours</p>
              </div>
              <div style={{ padding: "10px", background: "#ffffff", borderRadius: "6px", border: "1px solid #1e40af" }}>
                <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#64748b" }}>Jours d'arrêt</p>
                <p style={{ margin: "0", fontWeight: "bold", fontSize: "16px", color: "#dc2626" }}>{joursArret} jours</p>
              </div>
              <div style={{ padding: "10px", background: "#ffffff", borderRadius: "6px", border: "1px solid #1e40af" }}>
                <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#64748b" }}>Salaire journalier</p>
                <p style={{ margin: "0", fontWeight: "bold", fontSize: "16px", color: "#1e40af" }}>{salaireDeclare.toFixed(2)} DH</p>
              </div>
              <div style={{ padding: "10px", background: "#ffffff", borderRadius: "6px", border: "1px solid #1e40af" }}>
                <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#64748b" }}>IT Provisionnel (2/3)</p>
                <p style={{ margin: "0", fontWeight: "bold", fontSize: "16px", color: "#1e40af" }}>{ittProvisionnel} DH</p>
              </div>
              <div style={{ padding: "10px", background: "#ffffff", borderRadius: "6px", border: "1px solid #10b981" }}>
                <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#64748b" }}>Total versé</p>
                <p style={{ margin: "0", fontWeight: "bold", fontSize: "16px", color: "#059669" }}>{montantTotalRegle} DH</p>
              </div>
              <div style={{ padding: "10px", background: "#ffffff", borderRadius: "6px", border: "1px solid #f97316" }}>
                <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#64748b" }}>Montant restant</p>
                <p style={{ margin: "0", fontWeight: "bold", fontSize: "16px", color: "#dc2626" }}>{montantRestant} DH</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <h5 style={{ fontSize: "13px", fontWeight: "bold", color: "#1e40af", marginBottom: "10px" }}>📤 PAIEMENTS À LA VICTIME</h5>
            <div style={{ overflowX: "auto" }}>
              <table style={{ fontSize: "10px", borderCollapse: "collapse", width: "auto", border: "2px solid #1e293b", margin: "0 auto" }}>
                <thead>
                  <tr style={{ backgroundColor: "#1e293b", color: "white", height: "60px" }}>
                    <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "120px", fontWeight: "bold", fontSize: "11px" }}>N° RÈGLEMENT</th>
                    <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "130px", fontWeight: "bold", fontSize: "10px" }}>DATE RÉC.<br/>RÈGLEMENT</th>
                    <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "130px", fontWeight: "bold", fontSize: "10px" }}>DATE REMISE<br/>À LA VICTIME</th>
                    <th style={{ padding: "8px", border: "1px solid #1e293b", minWidth: "50px", fontWeight: "bold", fontSize: "10px" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {reglements.map((reglement, index) => (
                    <tr key={reglement.id} style={{ 
                      backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      height: "50px"
                    }}>
                      <td style={{ padding: "6px", border: "1px solid #d1d5db", fontWeight: "bold", color: "#1e293b", textAlign: "center", fontSize: "11px" }}>
                        RGL-{String(index + 1).padStart(3, '0')}
                      </td>
                      <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                      <input type="date" value={reglement.dateReception || ""} onChange={(e) => handleReglementChange(reglement.id, 'dateReception', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px" }} />
                      </td>
                      <td style={{ padding: "6px", border: "1px solid #d1d5db" }}>
                        <input type="date" value={reglement.dateRemise || ""} onChange={(e) => handleReglementChange(reglement.id, 'dateRemise', e.target.value)} style={{ width: "95%", padding: "4px", fontSize: "10px" }} />
                      </td>
                      <td style={{ padding: "6px", border: "1px solid #d1d5db", textAlign: "center" }}>
                        <button onClick={() => handleRemoveReglement(reglement.id)} style={{ backgroundColor: "#ef4444", color: "white", border: "none", padding: "4px 6px", borderRadius: "4px", cursor: "pointer", fontSize: "9px" }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: "15px", display: "flex", gap: "10px", justifyContent: "center" }}>
            <button onClick={async () => { await saveReglements(victime._id); handleConfirmer(); await loadVictimeData(victime._id); alert('✅ Règlements sauvegardés'); }} style={{ background: "linear-gradient(135deg, #3b82f6, #1e40af)", color: "white", border: "none", padding: "10px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>✔️ Confirmer les données</button>
            <button onClick={() => window.print()} style={{ background: "#64748b", color: "white", border: "none", padding: "10px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>🖨️ Imprimer</button>
          </div>
        </div>
      );
    }

    return (
      <div className="table-container" key={section}>
        <table style={{ fontSize: "14px", borderCollapse: "collapse", width: "auto", border: "2px solid #1e293b", margin: "0 auto" }}>
          <thead>
            <tr style={{ backgroundColor: "#1e293b", color: "white" }}>
              <th style={{ padding: "4px 6px", border: "1px solid #d1d5db", fontWeight: "bold", textAlign: "left" }}>Champ</th>
              {section === "infosVictime" && <th style={{ padding: "4px 6px", border: "1px solid #d1d5db", fontWeight: "bold" }}>Médecin</th>}
              {section === "etatBlessures" && (
                <>
                  <th style={{ padding: "4px 6px", border: "1px solid #d1d5db", backgroundColor: "#1e40af", fontWeight: "bold" }}>Médecin</th>
                  <th style={{ padding: "4px 6px", border: "1px solid #d1d5db", backgroundColor: "#1e40af", fontWeight: "bold" }}>Enquêteur</th>
                  <th style={{ padding: "4px 6px", border: "1px solid #d1d5db", backgroundColor: "#1e40af", fontWeight: "bold" }}>Responsable Local</th>
                </>
              )}
              <th style={{ padding: "4px 6px", border: "1px solid #d1d5db", fontWeight: "bold" }}>Service-AT</th>
              <th style={{ padding: "4px 6px", border: "1px solid #d1d5db", fontWeight: "bold" }}>Backoffice (Correction)</th>
              {section !== "infosVictime" && (
                <th style={{ padding: "4px 6px", border: "1px solid #d1d5db", fontWeight: "bold", textAlign: "center" }}>Action</th>
              )}
            </tr>
          </thead>

          <tbody>
            {champs.map((c, index) => {
              let valeur = "-";
              let valeurMedecin = "-";
              let valeurEnqueteur = "-";
              let valeurResponsable = "-";

              // INFOS VICTIME
              if (section === "infosVictime") {
                valeur = localEdits[victime._id]?.[section]?.[c] ?? victime?.[c] ?? "-";

                // Comparaison avec les données saisies par le médecin
                if (c === "nom") valeurMedecin = victime?.medecin?.nom || "-";
                if (c === "prenom") valeurMedecin = victime?.medecin?.prenom || "-";
                if (c === "createdAt") {
                  valeurMedecin = victime?.medecin?.dateAT ? new Date(victime.medecin.dateAT).toLocaleDateString() : "-";
                }
              }

              // ETAT BLESSURES - Utiliser victime.medecin
              else if (section === "etatBlessures") {
                valeur = localEdits[victime._id]?.[section]?.[c] ?? victime?.medecin?.[c] ?? "-";
                
                valeurMedecin = victime?.medecin?.[c] || "-";
                // Enquêteur : On récupère les données si elles existent (basé sur le nommage standard)
                // Correction du nom de l'objet : enqueteur au lieu de rapportEnqueteur
                valeurEnqueteur = victime?.enqueteur?.[c] || "-";
                const respField = c === "typeLesion" ? "typeBlessure" : c;
                valeurResponsable = victime?.responsableLocal?.[respField] || "-";
              }

              // PROTECTION
              else if (section === "protection") {
                valeur = localEdits[victime._id]?.[section]?.[c] ?? victime?.responsableLocal?.[c] ?? "-";
              }

              // QUITTANCES
              else if (section === "quittances") {
                valeur = localEdits[victime._id]?.[section]?.[c] ?? victime?.[c] ?? "-";
              }

              const isInEditMode = editMode === c;
              const isAiError = section === "infosVictime" && aiStatus[victime._id]?.[section]?.[c] === "error";

              return (
                <tr key={c} style={{
                  backgroundColor: index % 2 === 0 ? "#f8fafc" : "#ffffff",
                  borderBottom: "1px solid #d1d5db",
                  ...(isAiError ? { borderLeft: "4px solid #ef4444" } : {})
                }}>
                  <td style={{ padding: "2px 6px", border: "1px solid #d1d5db", fontWeight: "bold", fontSize: "14px", color: "#1e293b" }}>{champLabels[c] || c}</td>
                  {section === "infosVictime" && (
                    <td style={{ padding: "2px 6px", border: "1px solid #d1d5db", fontWeight: "500", color: "#1e40af", fontSize: "14px" }}>
                      {valeurMedecin}
                    </td>
                  )}
                  {section === "etatBlessures" && (
                    <>
                      <td style={{ padding: "2px 6px", border: "1px solid #d1d5db", backgroundColor: "#f0fdf4", fontWeight: "500", color: "#166534", fontSize: "14px" }}>{valeurMedecin}</td>
                      <td style={{ padding: "2px 6px", border: "1px solid #d1d5db", backgroundColor: "#fdf2f8", fontWeight: "500", color: "#9d174d", fontSize: "14px" }}>{valeurEnqueteur}</td>
                      <td style={{ padding: "2px 6px", border: "1px solid #d1d5db", backgroundColor: "#fff7ed", fontWeight: "500", color: "#9a3412", fontSize: "14px" }}>{valeurResponsable}</td>
                    </>
                  )}
                  <td style={{ padding: "2px 6px", border: "1px solid #d1d5db", fontSize: "14px" }}>
                    {isInEditMode ? (
                      <textarea
                        value={editValues[c] || ""}
                        onChange={(e) => setEditValues({ ...editValues, [c]: e.target.value })}
                        style={{ width: "100%", minHeight: "22px", padding: "2px 4px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "14px" }}
                      />
                    ) : c === "certificat" && valeur !== "-" ? (
                      <a href={valeur} target="_blank" rel="noopener noreferrer" style={{ color: "#1e40af", textDecoration: "underline" }}>Télécharger certificat</a>
                    ) : (
                      valeur
                    )}
                  </td>
                  <td style={{ padding: "2px 6px", border: "1px solid #d1d5db", fontSize: "14px" }}>
                    <textarea
                      placeholder="Réponse correcte"
                      value={backofficeValues[victime._id]?.[section]?.[c] || ""}
                      onChange={(e) => handleBackofficeChange(victime._id, section, c, e.target.value)}
                      style={{ width: "100%", minHeight: "22px", fontSize: "14px", padding: "2px 4px", border: "1px solid #d1d5db", borderRadius: "4px" }}
                    />
                  </td>
                  {section !== "infosVictime" && (
                  <td style={{ padding: "2px 6px", border: "1px solid #d1d5db", textAlign: "center", fontSize: "14px" }}>
                    {isInEditMode ? (
                      <>
                        <button onClick={() => handleEditSave(c)} style={{ padding: "4px 8px", background: "#10b981", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", marginRight: "4px" }}>✔</button>
                        <button onClick={handleEditCancel} style={{ padding: "4px 8px", background: "#ef4444", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}>✖</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEditStart(c)} style={{ padding: "4px 8px", background: "#3b82f6", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", marginRight: "4px" }}>✏️</button>
                        <button
                          onClick={() => handleConfirmChange(c, 'correct')}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: confirmedFields[victime._id]?.[section]?.[c] === 'correct' ? '#10b981' : '#e5e7eb',
                            color: confirmedFields[victime._id]?.[section]?.[c] === 'correct' ? 'white' : '#1e293b',
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            marginLeft: '4px',
                            fontSize: "10px"
                          }}
                        >
                          ✅
                        </button>
                        <button
                          onClick={() => handleConfirmChange(c, 'incorrect')}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: confirmedFields[victime._id]?.[section]?.[c] === 'incorrect' ? '#ef4444' : '#e5e7eb',
                            color: confirmedFields[victime._id]?.[section]?.[c] === 'incorrect' ? 'white' : '#1e293b',
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            marginLeft: '4px',
                            fontSize: "10px"
                          }}
                        >
                          ❌
                        </button>
                      </>
                    )}
                  </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {champs.length > 0 && (
          <div style={{ marginTop: "10px", display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              onClick={handleConfirmer} 
              disabled={!isAllConfirmed}
            >
              Confirmer les données
            </button>
            <button onClick={() => window.print()}>
              Imprimer ce tableau
            </button>
          </div>
        )}
      </div>
    );
  };

  // =========================
  // FINAL TABLE RENDER
  // =========================
  const renderFinalTable = (victime) => {
    const allSections = sections.map(s => ({
      label: s.label,
      champs: getChampsParSection(s.key),
      key: s.key
    }));

    return (
      <div id="printable" className="final-table-container">
        <h3 style={{ fontWeight: "bold", fontSize: "22px", marginBottom: "20px", textAlign: "center" }}>Tableau Final - {victime.nom} {victime.prenom}</h3>
        {allSections.map(section => (
          <div key={section.key} style={{ marginBottom: "20px" }}>
            <h4 style={{ fontWeight: "bold", fontSize: "18px", textAlign: "center" }}>{section.label}</h4>
            <table>
              <thead>
                <tr style={{ backgroundColor: "#f3f4f6" }}>
                  <th style={{ fontWeight: "bold" }}>Champ</th>
                {section.key === "infosVictime" && <th style={{ fontWeight: "bold" }}>Donnée Médecin</th>}
                {section.key === "etatBlessures" && (
                  <>
                    <th style={{ fontWeight: "bold" }}>Médecin</th>
                    <th style={{ fontWeight: "bold" }}>Enquêteur</th>
                    <th style={{ fontWeight: "bold" }}>Responsable Local</th>
                  </>
                )}
                <th style={{ fontWeight: "bold" }}>Valeur (Admin/AT)</th>
                <th style={{ fontWeight: "bold" }}>Backoffice (Correction)</th>
                </tr>
              </thead>
              <tbody>
                {section.champs.map((c, index) => {
                  let valeur = "-";
                let valeurMedecin = "-";
                let valeurEnqueteur = "-";
                let valeurResponsable = "-";

                  if (section.key === "infosVictime") {
                    valeur = localEdits[victime._id]?.[section.key]?.[c] ?? victime?.[c] ?? "-";
                  
                  if (c === "nom") valeurMedecin = victime?.medecin?.nom || (victime?.nom ? `${victime.nom} ${victime.prenom}` : "-");
                  if (c === "prenom") valeurMedecin = victime?.medecin?.prenom || "-";
                  if (c === "createdAt") valeurMedecin = victime?.medecin?.dateAT ? new Date(victime.medecin.dateAT).toLocaleDateString() : "-";
                  } else if (section.key === "etatBlessures") {
                    valeur = localEdits[victime._id]?.[section.key]?.[c] ?? victime?.medecin?.[c] ?? "-";
                  valeurMedecin = victime?.medecin?.[c] || "-";
                  valeurEnqueteur = victime?.enqueteur?.[c] || "-";
                  const respField = c === "typeLesion" ? "typeBlessure" : c;
                  valeurResponsable = victime?.responsableLocal?.[respField] || "-";
                  } else if (section.key === "protection") {
                    valeur = localEdits[victime._id]?.[section.key]?.[c] ?? victime?.responsableLocal?.[c] ?? "-";
                  } else if (section.key === "quittances") {
                    valeur = localEdits[victime._id]?.[section.key]?.[c] ?? victime?.[c] ?? "-";
                  } else if (section.key === "reglements") {
                    valeur = localEdits[victime._id]?.[section.key]?.[c] ?? victime?.[c] ?? "-";
                  }

                  return (
                    <tr key={c}>
                      <td style={{ fontWeight: "bold" }}>{champLabels[c] || c}</td>
                    {section.key === "infosVictime" && (
                      <td style={{ color: "#0369a1", fontWeight: "500" }}>{valeurMedecin}</td>
                    )}
                    {section.key === "etatBlessures" && (
                      <>
                        <td style={{ color: "#166534" }}>{valeurMedecin}</td>
                        <td style={{ color: "#9d174d" }}>{valeurEnqueteur}</td>
                        <td style={{ color: "#9a3412" }}>{valeurResponsable}</td>
                      </>
                    )}
                      <td>
                        {c === "certificat" && valeur !== "-" ? (
                          <a href={valeur} target="_blank" rel="noopener noreferrer">Télécharger certificat</a>
                        ) : (
                          valeur
                        )}
                      </td>
                      <td style={{ fontWeight: "600", color: "#d97706" }}>
                        {backofficeValues[victime._id]?.[section.key]?.[c] || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {section.key === "certificats" && (
              <div style={{ marginTop: "10px" }}>
                <table>
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6" }}>
                      <th style={{ fontWeight: "bold" }}>Type de certificat</th>
                      <th style={{ fontWeight: "bold" }}>Date à apposer sur la copie à remettre à la victime</th>
                      <th style={{ fontWeight: "bold" }}>Date envoi au siège</th>
                      <th style={{ fontWeight: "bold" }}>Du</th>
                      <th style={{ fontWeight: "bold" }}>Au</th>
                      <th style={{ fontWeight: "bold" }}>Durée (jours)</th>
                      <th style={{ fontWeight: "bold" }}>Backoffice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCertificats.map((cert, index) => (
                      <tr key={cert.id} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                        <td style={{ fontWeight: "bold" }}>{cert.type}</td>
                        <td>{cert.dateStamp}</td>
                        <td>{cert.dateEnvoi}</td>
                        <td>{cert.fromDate || "-"}</td>
                        <td>{cert.toDate || "-"}</td>
                        <td>{cert.duree}</td>
                        <td>{cert.backoffice || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: "bold", background: "#f9fafb" }}>
                      <td colSpan="5" style={{ textAlign: "right" }}>Total Durée Cumulée :</td>
                      <td>{totalDureeArret} jours</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                <div style={{ marginTop: "10px", padding: "10px", border: "1px dashed #cbd5e1", borderRadius: "6px" }}>
                  <p style={{ fontWeight: "bold", margin: 0 }}>📅 Durée totale d'arrêt du travail (du {minDate?.toLocaleDateString() || "?"} au {maxDate?.toLocaleDateString() || "?"}) : <span style={{ color: "#dc2626" }}>{dureeCalendaire} jours</span></p>
                  <p style={{ fontWeight: "bold", margin: "5px 0 0 0", color: "#9d174d" }}>🏥 Total ITT (Prolongations) : {totalITT} jours</p>
                </div>
              </div>
            )}
            {section.key === "quittances" && quittances.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <table>
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6" }}>
                      <th style={{ fontWeight: "bold" }}>N° Quittance</th>
                      <th style={{ fontWeight: "bold" }}>Date réception quittance du siège</th>
                      <th style={{ fontWeight: "bold" }}>Date signature par victime</th>
                      <th style={{ fontWeight: "bold" }}>Date renvoi au siège</th>
                      <th style={{ fontWeight: "bold" }}>Backoffice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quittances.map((quittance, index) => (
                      <tr key={quittance.id} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                        <td style={{ fontWeight: "bold" }}>{index + 1}</td>
                        <td>{quittance.dateReception || "-"}</td>
                        <td>{quittance.dateSignatureVictime || "-"}</td>
                        <td>{quittance.dateEnvoi || "-"}</td>
                        <td>{quittance.numero || "-"}</td>
                        <td>{quittance.dateEnvoi || "-"}</td>
                        <td>{quittance.backoffice || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {section.key === "reglements" && reglements.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date réception du montant</th>
                      <th>Date règlement (CT)</th>
                      <th>NB Jours</th>
                      <th>Montant (DH)</th>
                      <th>Mode Règlement</th>
                      <th>Banque</th>
                      <th>Date Débit Bancaire</th>
                      <th>Backoffice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reglements.map((reglement) => (
                      <tr key={reglement.id}>
                        <td>{reglement.dateReceptionMontant}</td>
                        <td>{reglement.dateRglVictime || "-"}</td>
                        <td>{reglement.nbJours || "-"}</td>
                        <td>{reglement.montant || "-"}</td>
                        <td>{reglement.modeRglt || "-"}</td>
                        <td>{reglement.banque || "-"}</td>
                        <td>{reglement.dateDebutBancaire || "-"}</td>
                            <td>{reglement.backoffice || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: "10px" }}>
                  <h5 style={{ fontWeight: "bold", marginBottom: "5px" }}>Récapitulatif des Règlements</h5>
                  <table>
                    <thead>
                      <tr style={{ backgroundColor: "#f3f4f6" }}>
                        <th style={{ fontWeight: "bold" }}>N° Règlement</th>
                        <th style={{ fontWeight: "bold" }}>Date réception règlement</th>
                        <th style={{ fontWeight: "bold" }}>Date réception montant</th>
                        <th style={{ fontWeight: "bold" }}>Date remise à la victime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reglements.map((r, index) => (
                        <tr key={r.id} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                          <td style={{ fontWeight: "bold" }}>{index + 1}</td>
                          <td>{r.dateReception || "-"}</td>
                          <td>{r.dateReceptionMontant || "-"}</td>
                          <td>{r.dateRemise || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(() => {
                  const joursArret = parseFloat(victime?.medecin?.joursArret) || 0;
                  const salaireDeclare = parseFloat(victime?.salaireJournalier) || 0;
                  const calculJours = Math.max(0, joursArret - 1);
                  const ittProvisionnel = (calculJours * (2 / 3) * salaireDeclare).toFixed(2);
                  return (
                    <p style={{ marginTop: "10px", fontWeight: "bold", textAlign: "right" }}>Montant ITT provisionnel à recevoir : {ittProvisionnel} DH</p>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
        <button onClick={() => window.print()} style={{ marginTop: "20px" }}>
          Imprimer
        </button>
      </div>
    );
  };
  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '0 20px', position: 'relative' }}>
        <div style={{ flex: 1 }}></div>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0, textAlign: "center", flex: 2 }}>Suivi des dossiers</h1>
        
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', position: 'relative' }}>
          {/* ICONE DE NOTIFICATION (CLOCHE) */}
          <button 
            className="notif-bell-btn"
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            style={{ 
              background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', 
              width: '45px', height: '45px', cursor: 'pointer', fontSize: '20px', 
              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            🔔
            {allNotifications.length > 0 && (
              <span style={{ 
                position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444', 
                color: 'white', borderRadius: '50%', width: '20px', height: '20px', 
                fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {allNotifications.length}
              </span>
            )}
          </button>

          {/* MENU DÉROULANT DES NOTIFICATIONS */}
          {showNotifDropdown && (
            <div className="notif-dropdown-content" style={{ 
              position: 'absolute', top: '55px', right: '0', background: 'white', 
              width: '320px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
              zIndex: 1000, border: '1px solid #e2e8f0', overflow: 'hidden'
            }}>
              <div style={{ padding: '12px 15px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>
                ⚠️ Formulaires Manquants
              </div>
              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {allNotifications.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Aucun manquant à signaler</div>
                ) : (
                  allNotifications.map(n => (
                    <div 
                      key={n.id} 
                      style={{ 
                        padding: '12px 15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                        backgroundColor: 'white', transition: 'background 0.2s'
                      }}
                      onClick={() => {
                        if (n.victimId) { 
                          setVictimeSelected(n.fullData); 
                          loadVictimeData(n.victimId); 
                        } else {
                          alert(`En attente de création de la déclaration par le Service AT pour ${n.victim}`);
                        }
                        setShowNotifDropdown(false);
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1e293b' }}>{n.victim}</div>
                          <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '3px', fontWeight: '500' }}>
                            Manquant: {n.missing.join(', ')}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Destinataire: {n.role}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginLeft: '10px' }}>
                          {/* BOUTON WHATSAPP */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const msg = encodeURIComponent(`Bonjour, Rappel pour le dossier de ${n.victim}. Formulaires manquants : ${n.missing.join(', ')}. Merci de faire le nécessaire.`);
                              window.open(`https://wa.me/?text=${msg}`, '_blank');
                            }}
                            style={{ border: 'none', background: '#25D366', color: 'white', borderRadius: '4px', padding: '6px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center' }}
                            title="Relancer via WhatsApp"
                          >
                            📱
                          </button>
                          {/* BOUTON EMAIL */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const subject = encodeURIComponent(`Alerte Sinistre : ${n.victim}`);
                              const body = encodeURIComponent(`Bonjour,\n\nCeci est un rappel concernant le dossier de ${n.victim}.\n\nFormulaires manquants : ${n.missing.join(', ')}.\n\nMerci de faire le nécessaire rapidement.\n\nCordialement,`);
                              window.location.href = `mailto:?subject=${subject}&body=${body}`;
                            }}
                            style={{ border: 'none', background: '#3b82f6', color: 'white', borderRadius: '4px', padding: '6px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center' }}
                            title="Relancer via Email"
                          >
                            ✉️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="results">
        <div className="table-container" style={{ border: "2px solid #1e293b", borderRadius: "8px", overflow: "hidden", textAlign: "center" }}>
          <table style={{ width: "auto", borderCollapse: "collapse", margin: "0 auto" }}>
            <thead>
              <tr>
                <th>NOM CLIENT</th>
                <th>DATE ACCIDENT</th>
                <th>NOM VICTIME</th>
                <th>PRENOM VICTIME</th>
                <th>REFERENCE CIE</th>
                <th>REFERENCE CLIENT</th>
                <th>DEGRE BLESSURES</th>
                <th>NB JOURS</th>
                <th>JOURS PAYÉS</th>
                <th>VALEUR ITT</th>
                <th>REGLEMENT ITT</th>
                <th>RESTE A PAYER</th>
                <th>TAUX IPP</th>
                <th>SORT DU DOSSIER</th>
              </tr>
            </thead>
            <tbody>
              {dossier.length === 0 ? (
                <tr>
                  <td colSpan="13" style={{ textAlign: "center", padding: "12px" }}>
                    Aucune donnée disponible pour le moment.
                  </td>
                </tr>
              ) : (
                (victimeSelected ? dossier.filter(item => item._id === victimeSelected._id) : dossier).map((v) => (
                  <tr
                    key={v._id}
                    style={{ 
                      cursor: "pointer",
                      backgroundColor: victimeSelected?._id === v._id ? "#bfdbfe" : "transparent",
                      fontWeight: victimeSelected?._id === v._id ? "bold" : "normal",
                      transition: "all 0.2s ease"
                    }}
                    onClick={() => {
                      console.log("👤 Victime sélectionnée:", v);
                      console.log("  - Enqueteur (from dossier):", v.enqueteur);
                      setVictimeSelected(v);
                      loadVictimeData(v._id);
                    }}
                  >
                    <td>{getSocieteName(v.societe)}</td>
                    <td>{v.medecin?.dateAT ? new Date(v.medecin.dateAT).toLocaleDateString() : v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "-"}</td>
                    <td>{v.nom || "-"}</td>
                    <td>{v.prenom || "-"}</td>
                    <td>{v.referenceCie || "-"}</td>
                    <td>{v.referenceSte || "-"}</td>
                    <td>{v.medecin?.degreBlessure || v.responsableLocal?.degreBlessure || "-"}</td>
                    <td>{v.medecin?.joursArret ?? "-"}</td>
                    <td style={{ fontWeight: "bold", color: "#059669" }}>{v.totalJoursPayes ?? "-"}</td>
                    <td>{computeIttValue(v)}</td>
                    <td style={{ fontWeight: "bold", color: "#059669" }}>{v.montantRegle || "-"}</td>
                    <td style={{ fontWeight: "bold", color: v.montantRestant > 0 ? "#dc2626" : "#059669" }}>{v.montantRestant || "-"}</td>
                    <td style={{ fontWeight: "bold", color: "#1e40af" }}>{v.tauxIPP || "-"}</td>
                    <td>{v.typeAccident || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {victimeSelected && (
          <div className="selected-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button 
                  onClick={() => { setVictimeSelected(null); setSectionSelected(null); }}
                  style={{ background: "#64748b", padding: "8px 12px", borderRadius: "6px", color: "white", border: "none", cursor: "pointer", fontWeight: "bold" }}
                >
                  ⬅️ Retour à la liste
                </button>
                <h2 style={{ margin: 0 }}>{victimeSelected.nom} {victimeSelected.prenom}</h2>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {savingStatus === "saving" && (
                  <span style={{ fontSize: '14px', color: '#f97316', fontWeight: 'bold' }}>💾 Sauvegarde en cours...</span>
                )}
                {savingStatus === "saved" && (
                  <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: 'bold' }}>✅ Sauvegardé</span>
                )}
                {savingStatus === "error" && (
                  <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: 'bold' }}>❌ Erreur sauvegarde</span>
                )}
                <button onClick={runAIAnalysis} style={{ background: "linear-gradient(135deg, #6366f1, #4338ca)", padding: "8px 15px" }}>✨ Lancer l'Analyse IA</button>
              </div>
            </div>

            {!isFinalized ? (
              <>
                <div className="roles">
                  {sections.map((s) => (
                    <button
                      key={s.key}
                      className={sectionSelected === s.key ? "active" : ""}
                      onClick={() => setSectionSelected(s.key)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {sectionSelected &&
                  (() => {
                    console.log("📋 Section sélectionnée:", sectionSelected);
                    console.log("👤 Victime complète:", victimeSelected);
                    console.log("💊 Données médecin:", victimeSelected?.medecin);
                    return renderTable(
                      victimeSelected,
                      getChampsParSection(sectionSelected),
                      sectionSelected
                    );
                  })()
                }
              </>
            ) : (
              renderFinalTable(victimeSelected)
            )}
          </div>
        )}

        {/* =========================
            SECTION STATISTIQUES
           ========================= */}
        {isMounted && !victimeSelected && (
          <DashboardStats 
            dossier={dossier} 
            getSocieteName={getSocieteName} 
          />
        )}
      </div>
    </div>
  );
}