import { useState } from "react";
import "./SuiviDossier.css";

export default function SuiviDossier() {
  const [numero, setNumero] = useState("");

  return (
    <div className="suivi-container">
      <h2>Suivi de dossier</h2>
      <p>Entrez votre numéro de sinistre pour suivre l'état de votre dossier</p>

      <div className="suivi-box">
        <input
          type="text"
          placeholder="Numéro de sinistre"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
        />
        <button>Rechercher</button>
      </div>

      {/* Exemple résultat (plus tard dynamique) */}
      <div className="suivi-result">
        <h3>État du dossier</h3>
        <ul>
          <li className="done">✔ Déclaration individuelle</li>
          <li className="done">✔ Service AT</li>
          <li className="current">⏳ Responsable local</li>
          <li>🩺 Médecin</li>
          <li>🕵️ Enquêteur</li>
        </ul>
      </div>
    </div>
  );
}
