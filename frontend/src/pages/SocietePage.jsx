import { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "./SocietePage.css";

export default function SocietePage() {
  const [societes, setSocietes] = useState([]);
  const [formData, setFormData] = useState({
    nomSociete: "",
    adresse: "",
    contact: ""
  });

  const fetchSocietes = async () => {
    const res = await axios.get("http://localhost:5000/api/societe");
    setSocietes(res.data);
  };

  useEffect(() => {
    fetchSocietes();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await axios.post("http://localhost:5000/api/societe/create", formData);

    Swal.fire({
      icon: "success",
      title: "Société ajoutée",
      timer: 1200,
      showConfirmButton: false
    });

    setFormData({ nomSociete: "", adresse: "", contact: "" });
    fetchSocietes();
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: "Supprimer cette société ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui",
      cancelButtonText: "Annuler"
    });

    if (res.isConfirmed) {
      await axios.delete(`http://localhost:5000/api/societe/${id}`);
      fetchSocietes();
    }
  };

  return (
    <div className="societe-page">

      {/* HEADER */}
      <div className="header">
        <h1>Gestion des Sociétés</h1>
        <p>Administration des sociétés partenaires</p>
      </div>

      {/* FORM */}
      <div className="card form-card">
        <h2>Ajouter une société</h2>

        <form onSubmit={handleSubmit}>
          <input
            name="nomSociete"
            placeholder="Nom de la société"
            value={formData.nomSociete}
            onChange={handleChange}
            required
          />

          <input
            name="adresse"
            placeholder="Adresse"
            value={formData.adresse}
            onChange={handleChange}
          />

          <input
            name="contact"
            placeholder="Contact"
            value={formData.contact}
            onChange={handleChange}
          />

          <button type="submit">Créer société</button>
        </form>
      </div>

      {/* LIST */}
      <div className="card list-card">
        <h2>Sociétés enregistrées</h2>

        <div className="grid">
          {societes.map((s) => (
            <div key={s._id} className="soc-card">

              <div className="soc-top">
                <div className="soc-name">{s.nomSociete}</div>

                <button onClick={() => handleDelete(s._id)}>
                  ✕
                </button>
              </div>

              <div className="soc-info">
                <span>📍 {s.adresse || "Non définie"}</span>
                <span>📞 {s.contact || "Non défini"}</span>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}