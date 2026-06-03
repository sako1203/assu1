import { useState, useEffect } from "react";
import axios from "axios";
import "./FormIndividuel.css";

export default function FormIndividuel() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    axios.get("http:/assu1-production.up.railway.app//api/rapport-medecin")
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [res.data];
        setNotifications(data.filter(v => v && v._id));
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="form-container"> {/* Utilisation de form-container pour centrer */}
      <form className="form-individuel"> {/* Ajout d'une classe spécifique */}
      {/* Liste de Notifications */}
      {notifications.length > 0 && (
        <div className="notifications-list">
          {notifications.map((v) => (
            <div key={v._id} className="notification-item" /* onClick={() => handleSelectVictime(v)} */> {/* Pas d'autocomplete ici, donc pas de sélection auto */}
              <span className="bell-icon">🔔</span>
              <span>Nouveau rapport médecin : <strong>{v.nom} {v.prenom}</strong></span>
            </div>
          ))}
        </div>
      )}

      <h2>Déclaration Individuelle</h2>

      <input type="text" placeholder="Nom complet" />
      <input type="text" placeholder="CIN" />
      <input type="tel" placeholder="Téléphone" />
      <textarea placeholder="Description du sinistre"></textarea>

      <button>Envoyer</button>
      </form>
    </div>
  );
}
