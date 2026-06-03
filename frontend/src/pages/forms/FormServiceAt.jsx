import { useState, useEffect } from "react";
import axios from "axios";
import "./FormServiceAT.css";
import Swal from "sweetalert2";

export default function FormServiceAT() {
  const [societes, setSocietes] = useState([]);
  const [victimes, setVictimes] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredVictimes, setFilteredVictimes] = useState([]);

  const [formData, setFormData] = useState({
    rapport_medecin: "",
    societe: "",
    nom: "",
    prenom: "",
    dateNaissance: "",
    cin: "",
    port1: "",
    port2: "",
    adresse: "",
    departement: "",
    fonction: "",
    activite: "",
    salaireJournalier: "",
    typeAccident: "",
    referenceCie: "",
    referenceSte: "",
    avisResponsableVictime: "", // Nouveau champ
    transport: "",
    temoinNom: "", // Nouveau champ
    temoinPrenom: "", // Nouveau champ
    temoinCin: "", // Nouveau champ
    temoinPort: "", // Nouveau champ
    victimePortaitEPI: "", // Nouveau champ
    quelEPI: "", // Nouveau champ
    epiImposeContrat: "", // Nouveau champ
    epiImposeAutre: "", // Nouveau champ
    nomAmbulance: "",
    heureAppelAmbulance: "",
    heureArriveeAmbulance: "",
    etablissementMedical: ""
  });

  // 🔹 Charger les sociétés depuis le backend
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/societe")
      .then(res => setSocietes(res.data))
      .catch(err => console.error("Erreur chargement sociétés:", err));
  }, []);

  // 🔹 Charger les rapports médicaux (global au début, puis filtré par société)
  useEffect(() => {
    const url = formData.societe 
      ? `http://localhost:5000/api/rapport-medecin?societe=${formData.societe}&role=service-at`
      : `http://localhost:5000/api/rapport-medecin?role=service-at`;

    axios.get(url)
      .then(res => {
        const rawData = Array.isArray(res.data) ? res.data : [res.data];
        const filtered = rawData.filter(item => item && item._id);
        console.log("✅ Victimes chargées FormServiceAt pour:", formData.societe, "Données:", filtered);
        setVictimes(filtered);
      })
      .catch(err => console.error("Erreur chargement notifications:", err));

    setSearch("");
  }, [formData.societe]);

  // Filtrage pour l'autocomplete
  useEffect(() => {
    const filtered = victimes.filter(v => 
      v && (v.nom + " " + v.prenom).toLowerCase().includes(search.toLowerCase())
    );
    console.log("🔍 Recherche FormServiceAt:", search, "| victimes:", victimes.length, "| résultats:", filtered.length, filtered);
    setFilteredVictimes(filtered);
  }, [search, victimes]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectVictime = (v) => {
    setFormData({
      ...formData,
      rapport_medecin: v._id,
      nom: v.nom,
      societe: v.societe, // Pré-remplir la société depuis le rapport médical
      prenom: v.prenom,
      cin: v.cin,
      dateNaissance: v.dateNaissance ? v.dateNaissance.split('T')[0] : ""
    });
    setSearch(v.nom + " " + v.prenom);
    setFilteredVictimes([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const resDeclaration = await axios.post(
        "http://localhost:5000/api/declaration-at/create",
        formData
      );
      const newDeclarationId = resDeclaration.data._id;

      // 🔹 Mettre à jour le RapportMedecin avec l'ID de la nouvelle déclaration
      if (formData.rapport_medecin) {
        await axios.put(`http://localhost:5000/api/rapport-medecin/${formData.rapport_medecin}`, {
          declaration_at: newDeclarationId
        });
      }

      Swal.fire({
        icon: "success",
        title: "Déclaration envoyée ✅",
        text: "Le formulaire AT a été envoyé avec succès !",
        timer: 2000,
        showConfirmButton: false
      });

      // Reset du formulaire
      setFormData({
        rapport_medecin: "",
        societe: "",
        nom: "",
        prenom: "",
        dateNaissance: "",
        cin: "",
        port1: "",
        port2: "",
        adresse: "",
        departement: "",
        fonction: "",
        activite: "",
        salaireJournalier: "",
        typeAccident: "",
        referenceCie: "",
        referenceSte: "",
        avisResponsableVictime: "",
        transport: "",
        temoinNom: "",
        temoinPrenom: "",
        temoinCin: "",
        temoinPort: "",
        victimePortaitEPI: "",
        quelEPI: "",
        epiImposeContrat: "",
        epiImposeAutre: "",
        nomAmbulance: "",
        heureAppelAmbulance: "",
        heureArriveeAmbulance: "",
        etablissementMedical: ""
      });
      setSearch("");

    } catch (error) {
      console.error("Erreur création Déclaration AT :", error);
      Swal.fire({
        icon: "error",
        title: "Erreur ❌",
        text: "Une erreur est survenue lors de l'envoi du formulaire.",
        confirmButtonColor: "#d33"
      });
    }
  };

  return (
    <div className="form-container">
      <form className="form-at" onSubmit={handleSubmit}>
        {/* Liste de Notifications */}
        {!formData.rapport_medecin && victimes.length > 0 && (
          <div className="notifications-list">
            {victimes.map((v) => (
              <div key={v._id} className="notification-item" onClick={() => handleSelectVictime(v)}>
                <span className="bell-icon">🔔</span>
                <span>Dossier médecin à traiter : <strong>{v.nom} {v.prenom}</strong></span>
              </div>
            ))}
          </div>
        )}

        <h2>Déclaration Accident de Travail</h2>

        {/* 🔹 Choix société */}
        <select
          name="societe"
          value={formData.societe}
          onChange={handleChange}
          required
        >
          <option value="">-- Choisir une société --</option>
          {societes.map((s) => (
            <option key={s._id} value={s._id}>
              {s.nomSociete}
            </option>
          ))}
        </select>

        {/* Autocomplete Recherche */}
        <div className="autocomplete-container">
          <input
            type="text"
            placeholder="Rechercher victime par nom/prénom"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {formData.societe && victimes.length === 0 && search === "" && (
            <div style={{ padding: "12px 16px", color: "#666", fontSize: "14px", backgroundColor: "#f9fafb", borderRadius: "8px", marginTop: "8px" }}>
              ℹ️ Sélectionnez une société d'abord
            </div>
          )}
          {filteredVictimes.length > 0 && (
            <ul className="autocomplete-list">
              {filteredVictimes.map(v => (
                <li
                  key={v._id}
                  onClick={() => {
                    console.log("✅ Victime sélectionnée:", v._id, v.nom, v.prenom);
                    handleSelectVictime(v);
                  }}
                >
                  {v.nom} {v.prenom}
                </li>
              ))}
            </ul>
          )}
          {search && victimes.length > 0 && filteredVictimes.length === 0 && (
            <div style={{ padding: "12px 16px", color: "#dc2626", fontSize: "14px", backgroundColor: "#fee2e2", borderRadius: "8px", marginTop: "8px" }}>
              ❌ Aucune victime trouvée
            </div>
          )}
        </div>

        {/* 🔹 Nom et prénom victime */}
        <input
          name="nom"
          placeholder="Nom de la victime"
          value={formData.nom}
          onChange={handleChange}
          required
        />
        <input
          name="prenom"
          placeholder="Prénom de la victime"
          value={formData.prenom}
          onChange={handleChange}
          required
        />

        <input
          type="date"
          name="dateNaissance"
          value={formData.dateNaissance}
          onChange={handleChange}
          required
        />
        <input
          name="cin"
          placeholder="N° CIN"
          value={formData.cin}
          onChange={handleChange}
          required
        />

        <input
          name="port1"
          placeholder="N° port 1"
          value={formData.port1}
          onChange={handleChange}
        />
        <input
          name="port2"
          placeholder="N° port à joindre"
          value={formData.port2}
          onChange={handleChange}
        />

        <input
          name="adresse"
          placeholder="Adresse actuelle sur CIN"
          value={formData.adresse}
          onChange={handleChange}
        />
        <input
          name="departement"
          placeholder="Département"
          value={formData.departement}
          onChange={handleChange}
        />
        <input
          name="fonction"
          placeholder="Fonction de la victime"
          value={formData.fonction}
          onChange={handleChange}
        />
        <input
          name="activite"
          placeholder="Activité au moment de l'AT"
          value={formData.activite}
          onChange={handleChange}
        />
        <input
          type="number"
          name="salaireJournalier"
          placeholder="Salaire journalier déclaré à la CNSS"
          value={formData.salaireJournalier}
          onChange={handleChange}
        />

        <select
          name="typeAccident"
          value={formData.typeAccident}
          onChange={handleChange}
          required
        >
          <option value="">Type d'accident</option>
          <option value="travail">Travail</option>
          <option value="circulation">Circulation</option>
          <option value="trajet">Trajet</option>
        </select>

        <input
          name="referenceCie"
          placeholder="Référence CIE"
          value={formData.referenceCie}
          onChange={handleChange}
        />
        <input
          name="referenceSte"
          placeholder="Référence société"
          value={formData.referenceSte}
          onChange={handleChange}
        />

        {/* Nouveau champ: Avis du responsable sur la victime */}
        <textarea
          name="avisResponsableVictime"
          placeholder="Avis du responsable sur la victime"
          value={formData.avisResponsableVictime}
          onChange={handleChange}
        />
        <input
          name="port1"
          placeholder="Numéro port victime"
          value={formData.port1}
          onChange={handleChange}
        />

        {/* 🔹 Transport */}
        <select
          name="transport"
          value={formData.transport}
          onChange={handleChange}
          required
        >
          <option value="">Type de transport</option>
          <option value="aucun">Aucun</option>
          <option value="plateforme-assistance">Via plateforme assistance</option>
          <option value="voiture">Voiture</option>
          <option value="ambulance">Ambulance</option>
        </select>

        {/* 🔹 Champs supplémentaires pour ambulance */}
        {formData.transport === "ambulance" && (
          <>
            <input
              name="nomAmbulance"
              placeholder="Nom de l'ambulance"
              value={formData.nomAmbulance}
              onChange={handleChange}
              required
            />
            <input
              type="time"
              name="heureAppelAmbulance"
              placeholder="Heure d'appel ambulance"
              value={formData.heureAppelAmbulance}
              onChange={handleChange}
              required
            />
            <input
              type="time"
              name="heureArriveeAmbulance"
              placeholder="Heure d'arrivée ambulance"
              value={formData.heureArriveeAmbulance}
              onChange={handleChange}
              required
            />
            <input
              name="etablissementMedical"
              placeholder="Nom de l'établissement médical choisi"
              value={formData.etablissementMedical}
              onChange={handleChange}
              required
            />
          </>
        )}
        
        {/* Nouveaux champs: Témoins */}
        <h3>Témoins</h3>
        <input
          name="temoinNom"
          placeholder="Nom du témoin"
          value={formData.temoinNom}
          onChange={handleChange}
        />
        <input
          name="temoinPrenom"
          placeholder="Prénom du témoin"
          value={formData.temoinPrenom}
          onChange={handleChange}
        />
        <input
          name="temoinCin"
          placeholder="CIN du témoin"
          value={formData.temoinCin}
          onChange={handleChange}
        />
        <input
          name="temoinPort"
          placeholder="Numéro de téléphone du témoin"
          value={formData.temoinPort}
          onChange={handleChange}
        />

        {/* Nouveaux champs: EPI */}
        <h3>Équipement de Protection Individuelle (EPI)</h3>
        <select
          name="epiImposeContrat"
          value={formData.epiImposeContrat}
          onChange={handleChange}
        >
          <option value="">L'EPI est-il imposé dans le contrat ?</option>
          <option value="oui">Oui</option>
          <option value="non">Non</option>
        </select>

        <textarea
          name="epiImposeAutre"
          placeholder="L'EPI est-il imposé d'une autre manière ? (Règlement intérieur, affichage, consignes, etc.)"
          value={formData.epiImposeAutre}
          onChange={handleChange}
        />

        <select
          name="victimePortaitEPI"
          value={formData.victimePortaitEPI}
          onChange={handleChange}
        >
          <option value="">La victime portait-elle son EPI ?</option>
          <option value="oui">Oui</option>
          <option value="non">Non</option>
        </select>

        {formData.victimePortaitEPI === "oui" && (
          <input
            name="quelEPI"
            placeholder="Quel EPI la victime portait-elle ?"
            value={formData.quelEPI}
            onChange={handleChange}
          />
        )}


        <button type="submit">Valider</button>
      </form>
    </div>
  );
}