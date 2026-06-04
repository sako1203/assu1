import { useState, useEffect } from "react";
import axios from "axios";
import "./FormResponsable.css";
import Swal from "sweetalert2";

export default function FormResponsable() {
  const [societes, setSocietes] = useState([]);
  const [victimes, setVictimes] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);

  const [formData, setFormData] = useState({
    declaration_at: "", // ✅ IMPORTANT
    rapport_medecin: "",
    societe: "",
    nom: "",
    prenom: "",
    partieCorps: "",
    typeBlessure: "",
    degreBlessure: "",
    circonstances: "",
    rapport: "",
    epiObligatoire: "",
    epiPorte: "",
    lienDirectEPI: "",
    fauteCible: "",
    avisVictime: "",
    temoinNom: "",
    temoinPrenom: "",
    temoinCin: "",
    decision: ""
  });

  const lesionsOptions = {
    TETE: ["Traumatisme crânien", "Plaie du cuir chevelu"],
    YEUX: ["Corps étranger extra cornéen", "Corps étranger intra cornéen"],
    NEZ: ["Contusions simples", "Fractures déplacées"],
    BOUCHE: ["Plaies labiales", "Fracture maxillaire"],
    OREILLES: ["Plaies du pavillon", "Lésion interne"],
    COU: ["Torticolis", "Fractures"],
    "MEMBRE SUPERIEUR": ["Fracture", "Amputation", "Brûlures"],
    COTES: ["Fractures des côtes"],
    "BASSINS ET RACHIS": ["Fracture bassin", "Hernie discale"],
    "MEMBRE INFERIEUR": ["Fracture", "Entorse", "Contusion"],
    AMPUTATIONS: ["Orteil", "Pied", "Jambe"],
    AUTRES: ["Hernie unguinale"]
  };

  // 🔹 Charger les sociétés
  useEffect(() => {
    axios.get("http://assu1-production.up.railway.app/api/societe")
      .then(res => setSocietes(res.data))
      .catch(err => console.error("Erreur chargement sociétés:", err));
  }, []);

  // 🔹 Charger les victimes (AT) et les rapports médicaux pour notification
  // 🔹 Charger les victimes (pour l'autocomplete des Déclarations AT existantes)
  useEffect(() => {
    if (formData.societe) {
      axios.get(`http://assu1-production.up.railway.app/api/declaration-at?societe=${formData.societe}`)
        .then(res => setVictimes(res.data))
        .catch(err => console.error("Erreur chargement victimes pour autocomplete:", err));
    } else {
      setVictimes([]);
      setSuggestions([]);
      setFormData(prev => ({
        ...prev,
        declaration_at: "",
        nom: "",
        prenom: ""
      }));
    }
  }, [formData.societe]);

  // 🔹 Charger les rapports médicaux en attente (pour les notifications)
  useEffect(() => {
    const urlMedecin = formData.societe
      ? `http://assu1-production.up.railway.app/api/rapport-medecin?societe=${formData.societe}&role=responsable`
      : `http://assu1-production.up.railway.app/api/rapport-medecin?role=responsable`;

    axios.get(urlMedecin)
      .then(res => {
        const rawData = Array.isArray(res.data) ? res.data : [res.data];
        setPendingReports(rawData.filter(item => item && item._id));
      })
      .catch(err => console.error("Erreur chargement rapports médicaux en attente:", err));
  }, [formData.societe]);

  // 🔹 Gestion input classique
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ 
      ...formData, 
      [name]: value,
      // Réinitialiser le type de blessure si la partie du corps change
      ...(name === "partieCorps" && { typeBlessure: "" })
    });
  };

  // 🔹 Autocomplete NOM
  const handleNomChange = (e) => {
    const value = e.target.value;

    setFormData({
      ...formData,
      nom: value,
      declaration_at: "" // ❗ reset si modif manuelle
    });

    if (value.length > 0) {
      const filtered = victimes.filter(v =>
        `${v.nom} ${v.prenom}`.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  // 🔹 Sélection victime depuis l'autocomplete (Déclaration AT existante)
  const handleSelectSuggestion = (declarationAT) => {
    setFormData({
      ...formData,
      declaration_at: declarationAT._id, // ID de la déclaration AT
      nom: declarationAT.nom,
      prenom: declarationAT.prenom,
      // Pas de rapport_medecin ici, car on part d'une déclaration AT existante
      // et on ne sait pas si un rapport médecin y est lié ou s'il est déjà traité.
    });
    setSuggestions([]);
  };

  // 🔹 Sélection victime depuis la liste de notifications (Rapport Médical en attente)
  const handleSelectNotification = (rapportMedecin) => {
    setFormData({
      ...formData,
      rapport_medecin: rapportMedecin._id, // ID du rapport médical
      declaration_at: rapportMedecin.declaration_at, // ID de la déclaration AT associée
      nom: rapportMedecin.nom,
      prenom: rapportMedecin.prenom,
      partieCorps: rapportMedecin.partieCorps || "",
      typeBlessure: rapportMedecin.typeBlessure || rapportMedecin.typeLesion || "", // Handle both field names
      degreBlessure: rapportMedecin.degreBlessure || "",
    });
  };

  // 🔹 Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.declaration_at) {
      Swal.fire({
        icon: "warning",
        title: "Choisis une victime ⚠️"
      });
      return;
    }

    try {
      const res = await axios.post("http://assu1-production.up.railway.app/api/rapport-responsable", formData);
      
      // Marquer le rapport médecin comme traité par le responsable
      if (formData.rapport_medecin) {
        await axios.put(`http://assu1-production.up.railway.app/api/rapport-medecin/${formData.rapport_medecin}`, {
          responsable_at: res.data._id
        });
      }

      Swal.fire({
        icon: "success",
        title: "Formulaire envoyé ✅",
        timer: 2000,
        showConfirmButton: false
      });

      setFormData({
        declaration_at: "",
        rapport_medecin: "", // Réinitialiser aussi le rapport médecin
        societe: "",
        nom: "",
        prenom: "",
        partieCorps: "",
        typeBlessure: "",
        degreBlessure: "",
        circonstances: "",
        rapport: "",
        epiObligatoire: "",
        epiPorte: "",
        lienDirectEPI: "",
        fauteCible: "",
        avisVictime: "",
        temoinNom: "",
        temoinPrenom: "",
        temoinCin: "",
        decision: ""
      });

      setSuggestions([]);

    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Erreur ❌",
        text: "Une erreur est survenue lors de l'envoi du formulaire."
      });
    }
  };

  return (
    <div className="form-container">
      <form className="form-responsable" onSubmit={handleSubmit}>
        {/* Liste de Notifications */}
        {!formData.declaration_at && pendingReports.length > 0 && (
          <div className="notifications-list">
            {pendingReports.map((v) => ( // v est un rapportMedecin ici
              <div key={v._id} className="notification-item warning" onClick={() => handleSelectSuggestion(v)}>
                <span className="bell-icon">⚠️</span>
                <span>Sinistre à valider pour : <strong>{v.nom} {v.prenom}</strong></span>
              </div>
            ))}
          </div>
        )}

        <h2>Responsable Local - Analyse AT</h2>

        {/* Société */}
        <select
          name="societe"
          value={formData.societe}
          onChange={handleChange}
          required
        >
          <option value="">Choisir la société</option>
          {societes.map(s => (
            <option key={s._id} value={s._id}>
              {s.nomSociete}
            </option>
          ))}
        </select>

        {/* Recherche victime */}
        <div className="autocomplete-container">
          <input
            name="nom"
            placeholder="Rechercher victime (Nom + Prénom)"
            value={formData.nom}
            onChange={handleNomChange}
            autoComplete="off"
          />

          {suggestions.length > 0 && (
            <ul className="autocomplete-list">
              {suggestions.map(v => (
                <li key={v._id} onClick={() => handleSelectSuggestion(v)}>
                  {v.nom} {v.prenom}
                </li>
              ))}
            </ul>
          )}
          {formData.nom && victimes.length > 0 && suggestions.length === 0 && (
            <div style={{ padding: "12px 16px", color: "#dc2626", fontSize: "14px", backgroundColor: "#fee2e2", borderRadius: "8px", marginTop: "8px" }}>
              ❌ Aucune victime trouvée
            </div>
          )}
        </div>

        {/* Prénom */}
        <input
          name="prenom"
          placeholder="Prénom"
          value={formData.prenom}
          onChange={handleChange}
          required
        />

        {/* Blessures */}
        <select name="partieCorps" value={formData.partieCorps} onChange={handleChange} required>
          <option value="">-- Partie du corps --</option>
          {Object.keys(lesionsOptions).map(part => (
            <option key={part} value={part}>{part}</option>
          ))}
        </select>

        <select name="typeBlessure" value={formData.typeBlessure} onChange={handleChange} disabled={!formData.partieCorps} required>
          <option value="">-- Type de lésion --</option>
          {formData.partieCorps && lesionsOptions[formData.partieCorps].map((l, i) => (
            <option key={i} value={l}>{l}</option>
          ))}
        </select>

        <select name="degreBlessure" value={formData.degreBlessure} onChange={handleChange} required>
          <option value="">Degré blessures</option>
          <option value="benin">Bénin</option>
          <option value="moyen">Moyen</option>
          <option value="grave">Grave</option>
          <option value="deces">Décès</option>
        </select>

        <textarea
          name="circonstances"
          placeholder="Circonstances détaillées de l'AT"
          value={formData.circonstances}
          onChange={handleChange}
          required
        />

        <textarea
          name="rapport"
          placeholder="Rapport détaillé du superviseur (Saisie pour le Backoffice)"
          value={formData.rapport}
          onChange={handleChange}
          required
        />

        {/* EPI */}
        <select name="epiObligatoire" value={formData.epiObligatoire} onChange={handleChange} required>
          <option value="">Victime devait -elle porter un EPI (O/N) :</option>
          <option value="oui">Oui</option>
          <option value="non">Non</option>
        </select>

        <select name="epiPorte" value={formData.epiPorte} onChange={handleChange} required>
          <option value="">le portait-elle (O/N) ?</option>
          <option value="oui">Oui</option>
          <option value="non">Non</option>
        </select>

        <textarea
          name="lienDirectEPI"
          placeholder="Y-a -t'il un lien direct entre l'AT et l'absence de port de l'EPI ?"
          value={formData.lienDirectEPI}
          onChange={handleChange}
        />

        <textarea
          name="fauteCible"
          placeholder="A qui incombe la faute ?"
          value={formData.fauteCible}
          onChange={handleChange}
        />

        {/* Avis */}
        <textarea
          name="avisVictime"
          placeholder="Avis sur la victime"
          value={formData.avisVictime}
          onChange={handleChange}
        />

        {/* Témoins */}
        <h3>Témoins</h3>
        <input name="temoinNom" placeholder="Nom témoin" value={formData.temoinNom} onChange={handleChange} />
        <input name="temoinPrenom" placeholder="Prénom témoin" value={formData.temoinPrenom} onChange={handleChange} />
        <input name="temoinCin" placeholder="CIN témoin" value={formData.temoinCin} onChange={handleChange} />

        {/* Décision */}
        <select name="decision" value={formData.decision} onChange={handleChange} required>
          <option value="">Décision</option>
          <option value="accepte">Accepté</option>
          <option value="refuse">Refusé</option>
        </select>

        {/* Bouton */}
        <button type="submit" disabled={!formData.declaration_at}>
          Soumettre
        </button>
      </form>
    </div>
  );
}