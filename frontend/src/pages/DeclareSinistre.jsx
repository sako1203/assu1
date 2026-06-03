import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import "./DeclareSinistre.css";

export default function DeclareSinistre() {
  const navigate = useNavigate();

  const [selectedForm, setSelectedForm] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const forms = [
    {
      path: "/form/medecin",
      title: "Médecin",
      desc: "Rapport médical",
      className: "medecin",
      roles: ["medecin", "admin"],
    },
    {
      path: "/form/service-at",
      title: "Service AT",
      desc: "Traitement administratif",
      className: "service",
      roles: ["service-at", "admin"],
    },
    {
      path: "/form/responsable",
      title: "Responsable Local",
      desc: "Validation hiérarchique",
      className: "responsable",
      roles: ["responsable", "admin"],
    },
    {
      path: "/form/enqueteur",
      title: "Enquêteur",
      desc: "Analyse du sinistre",
      className: "enqueteur",
      roles: ["enqueteur", "admin"],
    },
  ];

  // Ouvrir modal
  const handleClick = (form) => {
    setSelectedForm(form);
    setUsername("");
    setPassword("");
  };

  // Vérification login + rôle
  const handleVerify = async () => {
    try {
      if (!username || !password) {
        Swal.fire("Erreur", "Remplissez tous les champs", "warning");
        return;
      }

      const res = await axios.post("http://localhost:5000/api/auth/login", {
        username,
        password,
      });

      // ✅ IMPORTANT: backend renvoie { user, token }
      const user = res.data.user;

      if (!user) {
        Swal.fire("Erreur", "Réponse serveur invalide", "error");
        return;
      }

      const role = user.role?.toLowerCase().trim();

      // 🔥 debug (tu peux supprimer après)
      console.log("USER ROLE:", role);
      console.log("FORM ROLES:", selectedForm.roles);

      // ❌ refus accès
      if (!selectedForm.roles.includes(role)) {
        Swal.fire({
          icon: "error",
          title: "Accès refusé",
          text: "Vous n'avez pas le rôle requis pour ce formulaire",
        });
        return;
      }

      // ✅ succès
      localStorage.setItem("username", user.username);
      localStorage.setItem("role", role);

      Swal.fire({
        icon: "success",
        title: "Accès autorisé",
        timer: 1200,
        showConfirmButton: false,
      });

      setSelectedForm(null);

      navigate(selectedForm.path);

    } catch (err) {
      Swal.fire(
        "Erreur",
        err.response?.data?.message || "Login ou mot de passe incorrect",
        "error"
      );
    }
  };

  return (
    <div className="declare-container">
      <h2>Déclarer un sinistre</h2>
      <p>Choisissez un formulaire</p>

      <div className="cards">
        {forms.map((form, index) => (
          <div
            key={form.path}
            className={`card ${form.className} ${index === 0 ? "priority-card" : ""}`}
            onClick={() => handleClick(form)}
          >
            <div className="step-number">Étape {index + 1}</div>
            <h3>{form.title}</h3>
            <span>{form.desc}</span>
          </div>
        ))}
      </div>

      {/* MODAL LOGIN */}
      {selectedForm && (
        <div className="modal">
          <div className="modal-box">
            <h3>Connexion requise</h3>
            <p>{selectedForm.title}</p>

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button className="btn-primary" onClick={handleVerify}>
              Vérifier accès
            </button>

            <button
              className="btn-cancel"
              onClick={() => setSelectedForm(null)}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}