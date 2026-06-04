import { useState, useEffect } from "react";
import axios from "axios";
import "./FormEnqueteur.css";
import Swal from "sweetalert2";

export default function FormEnqueteur() {
  const [formData, setFormData] = useState({
    societe: "",
    declaration_at: "",
    rapport_medecin: "",
    nomVictime: "",
    prenomVictime: "",
    nomEnqueteur: "",
    numeroSinistre: "",
    dateEnquete: "",
    description: "",
    typeLesion: "",
    circonstancesEnquete: "",
    temoins: "",
    observations: "",
    recommendations: "",
    conclusion: ""
  });

  const [societes, setSocietes] = useState([]);
  const [victimes, setVictimes] = useState([]);
  const [filteredVictimes, setFilteredVictimes] = useState([]);
  const [newAlerts, setNewAlerts] = useState([]);

  // 🔹 Charger toutes les sociétés
  useEffect(() => {
    axios.get("http://assu1-production.up.railway.app/api/societe")
      .then(res => setSocietes(res.data))
      .catch(err => console.error("Erreur chargement sociétés:", err));
  }, []);

  // 🔹 Charger les victimes et les alertes médicales
  useEffect(() => {
    const urlMedecin = formData.societe 
      ? `http://assu1-production.up.railway.app/api/rapport-medecin?societe=${formData.societe}&role=enqueteur`
      : `http://assu1-production.up.railway.app/api/rapport-medecin?role=enqueteur`;

    if (formData.societe) {
      axios.get(`http://assu1-production.up.railway.app/api/declaration-at?societe=${formData.societe}`)
        .then(res => {
          console.log("✅ Victimes chargées pour la société:", formData.societe, res.data);
          setVictimes(res.data);
          setFilteredVictimes(res.data);
        })
        .catch(err => console.error("Erreur chargement victimes:", err));
    }

    axios.get(urlMedecin)
      .then(res => {
        const rawData = Array.isArray(res.data) ? res.data : [res.data];
        setNewAlerts(rawData.filter(item => item && item._id));
      })
      .catch(err => console.error(err));

    if (!formData.societe) {
      setVictimes([]);
      setFilteredVictimes([]);
      setFormData(prev => ({ ...prev, declaration_at: "", nomVictime: "", prenomVictime: "" }));
    }
  }, [formData.societe]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "nomVictime") {
      // filtre pour autocomplete
      const filtered = victimes.filter(v =>
        (v.nom + " " + v.prenom).toLowerCase().includes(value.toLowerCase())
      );
      console.log("🔍 Recherche:", value, "| victimes:", victimes.length, "| résultats:", filtered.length, filtered);
      setFilteredVictimes(filtered);
      setFormData({ ...formData, nomVictime: value, prenomVictime: "" });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSelectVictime = (victim) => {
    setFormData({
      ...formData,
      rapport_medecin: victim.nomMedecin ? victim._id : "",
      declaration_at: victim._id,
      nomVictime: victim.nom,
      prenomVictime: victim.prenom
    });
    setFilteredVictimes([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://assu1-production.up.railway.app/api/rapport-enqueteur", formData);

      if (formData.rapport_medecin) {
        await axios.put(`http://assu1-production.up.railway.app/api/rapport-medecin/${formData.rapport_medecin}`, {
          enqueteur_at: res.data._id
        });
      }

      Swal.fire({
        icon: "success",
        title: "Rapport envoyé ✅",
        text: "Le rapport a été enregistré avec succès",
        timer: 2000,
        showConfirmButton: false
      });
      setFormData({
        societe: "",
        declaration_at: "",
        nomVictime: "",
        prenomVictime: "",
        nomEnqueteur: "",
        numeroSinistre: "",
        dateEnquete: "",
        description: "",
        typeLesion: "",
        circonstancesEnquete: "",
        temoins: "",
        observations: "",
        recommendations: "",
        conclusion: ""
      });
      setFilteredVictimes([]);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Erreur ❌",
        text: "Erreur lors de l'envoi"
      });
    }
  };

  return (
    <div className="enqueteur-form">
      <form onSubmit={handleSubmit}>
        {/* Liste de Notifications */}
        {!formData.declaration_at && newAlerts.length > 0 && (
          <div className="notifications-list">
            {newAlerts.map((v) => (
              <div key={v._id} className="notification-item info" onClick={() => handleSelectVictime(v)}>
                <span className="bell-icon">📢</span>
                <span>Enquête en attente pour : <strong>{v.nom} {v.prenom}</strong></span>
              </div>
            ))}
          </div>
        )}

        <h2>Rapport d'enquête</h2>

        {/* 🔹 Sélection société */}
        <select
          name="societe"
          value={formData.societe}
          onChange={handleChange}
          required
        >
          <option value="">-- Choisir une société --</option>
          {societes.map((s) => (
            <option key={s._id} value={s._id}>{s.nomSociete}</option>
          ))}
        </select>

        {/* 🔹 Recherche victime */}
        <div className="autocomplete-container">
          <input
            type="text"
            placeholder="Rechercher victime..."
            name="nomVictime"
            value={formData.nomVictime}
            onChange={handleChange}
            autoComplete="off"
          />
          {formData.societe && victimes.length === 0 && formData.nomVictime === "" && (
            <div style={{ padding: "12px 16px", color: "#666", fontSize: "14px", backgroundColor: "#f9fafb", borderRadius: "8px", marginTop: "8px" }}>
              ℹ️ Sélectionnez une société d'abord
            </div>
          )}
          {filteredVictimes.length > 0 && (
            <ul className="autocomplete-list">
              {filteredVictimes.map(v => (
                <li key={v._id} onClick={() => handleSelectVictime(v)}>
                  {v.nom} {v.prenom}
                </li>
              ))}
            </ul>
          )}
          {formData.nomVictime && victimes.length > 0 && filteredVictimes.length === 0 && (
            <div style={{ padding: "12px 16px", color: "#dc2626", fontSize: "14px", backgroundColor: "#fee2e2", borderRadius: "8px", marginTop: "8px" }}>
              ❌ Aucune victime trouvée
            </div>
          )}
        </div>

        {/* 🔹 Nom et prénom victime (auto-rempli) */}
        <input
          type="text"
          name="prenomVictime"
          placeholder="Prénom de la victime"
          value={formData.prenomVictime}
          readOnly
          required
        />

        <input
          type="text"
          name="nomEnqueteur"
          placeholder="Nom de l'enquêteur"
          value={formData.nomEnqueteur}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="numeroSinistre"
          placeholder="Numéro du sinistre"
          value={formData.numeroSinistre}
          onChange={handleChange}
          required
        />

        <input
          type="date"
          name="dateEnquete"
          value={formData.dateEnquete}
          onChange={handleChange}
          required
        />

        {/* 📋 RAPPORT D'ENQUÊTE SECTION */}
        <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f0f9ff", borderLeft: "4px solid #0ea5e9", borderRadius: "6px" }}>
          <h3 style={{ color: "#0369a1", marginTop: "0" }}>📋 Rapport d'Enquête</h3>

          <label style={{ fontWeight: "bold", color: "#1e293b", display: "block", marginBottom: "8px" }}>Description de l'incident</label>
          <textarea
            name="description"
            placeholder="Description détaillée de l'incident"
            value={formData.description}
            onChange={handleChange}
            required
            style={{ marginBottom: "12px" }}
          />

          <label style={{ fontWeight: "bold", color: "#1e293b", display: "block", marginBottom: "8px" }}>Type de lésion constatée</label>
          <input
            type="text"
            name="typeLesion"
            placeholder="Ex: Fracture, Contusion, Brûlure, etc."
            value={formData.typeLesion}
            onChange={handleChange}
            style={{ marginBottom: "12px" }}
          />

          <label style={{ fontWeight: "bold", color: "#1e293b", display: "block", marginBottom: "8px" }}>Circonstances détaillées</label>
          <textarea
            name="circonstancesEnquete"
            placeholder="Décrire les circonstances de l'accident en détail"
            value={formData.circonstancesEnquete}
            onChange={handleChange}
            required
            style={{ marginBottom: "12px" }}
          />

          <label style={{ fontWeight: "bold", color: "#1e293b", display: "block", marginBottom: "8px" }}>Témoins de l'incident</label>
          <textarea
            name="temoins"
            placeholder="Noms et téléphones des témoins (le cas échéant)"
            value={formData.temoins}
            onChange={handleChange}
            style={{ marginBottom: "12px" }}
          />

          <label style={{ fontWeight: "bold", color: "#1e293b", display: "block", marginBottom: "8px" }}>Observations et constatations</label>
          <textarea
            name="observations"
            placeholder="Observations faites lors de l'enquête"
            value={formData.observations}
            onChange={handleChange}
            style={{ marginBottom: "12px" }}
          />

          <label style={{ fontWeight: "bold", color: "#1e293b", display: "block", marginBottom: "8px" }}>Recommandations</label>
          <textarea
            name="recommendations"
            placeholder="Recommandations pour prévenir de futurs accidents"
            value={formData.recommendations}
            onChange={handleChange}
            style={{ marginBottom: "12px" }}
          />

          <label style={{ fontWeight: "bold", color: "#1e293b", display: "block", marginBottom: "8px" }}>Conclusion</label>
          <select
            name="conclusion"
            value={formData.conclusion}
            onChange={handleChange}
            required
          >
            <option value="">-- Sélectionner une conclusion --</option>
            <option value="Sinistre confirmé">✅ Sinistre confirmé</option>
            <option value="Sinistre non confirmé">❌ Sinistre non confirmé</option>
            <option value="En attente">⏳ En attente d'informations complémentaires</option>
            <option value="Enquête approfondie requise">🔍 Enquête approfondie requise</option>
          </select>
        </div>

        <button type="submit" style={{ marginTop: "20px" }}>Envoyer le rapport</button>
      </form>
    </div>
  );
}