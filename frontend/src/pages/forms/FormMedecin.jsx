import { useState, useEffect } from "react";
import axios from "axios";
import "./FormMedecin.css";
import Swal from "sweetalert2";

export default function FormMedecin() {
  const [societes, setSocietes] = useState([]);

  const [formData, setFormData] = useState({
    societe: "",
    declaration_at: "",
    nom: "",
    prenom: "",
    dateAT: "",
    dateNaissance: "",
    cin: "",
    partieCorps: "",
    typeLesion: "",
    degreBlessure: "",
    nomMedecin: "",
    rapport: "",
    joursArret: "",
    certificat: null
  });

  const lesionsOptions = {
    TETE: ["Traumatisme crânien","Plaie du cuir chevelu"],
    YEUX: ["Corps étranger extra cornéen","Corps étranger intra cornéen"],
    NEZ: ["Contusions simples","Fractures déplacées"],
    BOUCHE: ["Plaies labiales","Fracture maxillaire"],
    OREILLES: ["Plaies du pavillon","Lésion interne"],
    COU: ["Torticolis","Fractures"],
    "MEMBRE SUPERIEUR": ["Fracture","Amputation","Brûlures"],
    COTES: ["Fractures des côtes"],
    "BASSINS ET RACHIS": ["Fracture bassin","Hernie discale"],
    "MEMBRE INFERIEUR": ["Fracture","Entorse","Contusion"],
    AMPUTATIONS: ["Orteil","Pied","Jambe"],
    AUTRES: ["Hernie unguinale"]
  };

  // Charger sociétés
  useEffect(() => {
    axios.get("http://assu1-production.up.railway.app/api/societe")
      .then(res => setSocietes(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "certificat") {
      setFormData({ ...formData, certificat: files[0] });
    } else {
      setFormData({
        ...formData,
        [name]: value,
        ...(name === "partieCorps" && { typeLesion: "" })
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log("📤 FormData antes d'envoyer:", formData);
      console.log("declaration_at value:", formData.declaration_at);

      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key]) data.append(key, formData[key]);
      });

      console.log("📨 FormData envoyé au serveur (content):");
      for (let [key, value] of data.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      await axios.post("http://assu1-production.up.railway.app/api/rapport-medecin", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      Swal.fire({ icon: "success", title: "Rapport envoyé ✅", timer: 2000, showConfirmButton: false });

      setFormData({
        societe: "",
        declaration_at: "",
        nom: "",
        prenom: "",
        dateAT: "",
        dateNaissance: "",
        cin: "",
        partieCorps: "",
        typeLesion: "",
        degreBlessure: "",
        nomMedecin: "",
        rapport: "",
        joursArret: "",
        certificat: null
      });
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Erreur ❌", text: "Erreur lors de l'envoi" });
    }
  };

  return (
    <div className="form-container">
      <form className="form-medecin" onSubmit={handleSubmit}>
        <h2>Rapport Médical</h2>

        <select name="societe" value={formData.societe} onChange={handleChange} required>
          <option value="">-- Choisir une société --</option>
          {societes.map(s => (
            <option key={s._id} value={s._id}>{s.nomSociete}</option>
          ))}
        </select>

        <input name="nom" placeholder="Nom" value={formData.nom} onChange={handleChange} required />
        <input name="prenom" placeholder="Prénom" value={formData.prenom} onChange={handleChange} required />

        <input type="date" name="dateAT" value={formData.dateAT} onChange={handleChange} required />
        <input type="date" name="dateNaissance" value={formData.dateNaissance} onChange={handleChange} required />

        <input name="cin" placeholder="CIN" value={formData.cin} onChange={handleChange} required />

        <select name="partieCorps" value={formData.partieCorps} onChange={handleChange} required>
          <option value="">-- Partie du corps --</option>
          {Object.keys(lesionsOptions).map(part => (
            <option key={part} value={part}>{part}</option>
          ))}
        </select>

        <select name="typeLesion" value={formData.typeLesion} onChange={handleChange} disabled={!formData.partieCorps} required>
          <option value="">-- Type de lésion --</option>
          {formData.partieCorps && lesionsOptions[formData.partieCorps].map((l, i) => <option key={i} value={l}>{l}</option>)}
        </select>

        <select name="degreBlessure" value={formData.degreBlessure} onChange={handleChange} required>
          <option value="">Degré</option>
          <option value="benin">Bénin</option>
          <option value="moyen">Moyen</option>
          <option value="grave">Grave</option>
        </select>

        <input name="nomMedecin" placeholder="Nom médecin" value={formData.nomMedecin} onChange={handleChange} required />
        <textarea name="rapport" placeholder="Rapport" value={formData.rapport} onChange={handleChange} required />
        <input type="number" name="joursArret" placeholder="Jours arrêt" value={formData.joursArret} onChange={handleChange} required />
        <input type="file" name="certificat" onChange={handleChange} />

        <button type="submit">Envoyer</button>
      </form>
    </div>
  );
}