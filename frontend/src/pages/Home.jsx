import { useState } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

const data = {
  AGADIR: [
    {
      nom: "Hôpital Privé d'Agadir",
      adresse: "Avenue Rue Ouarzazate, Opération ESSADA cité Mohammadi",
      telephone: "05 282-32366",
      medecin: "Docteur Brahim Boufous",
      contact: "FATIHA : 0701 19 27 67 (service AT)",
      service: "Radio - Scanner - Analyse sur place",
      note: "OUSSAMA RBAHI : 0661 56 30 86"
    },
    {
      nom: "Polyclinique CNSS Agadir",
      adresse: "Bd Moulay Youssef - Extension X",
      telephone: "05 28 84 66 21",
      medecin: "Docteur Brahim Boufous",
      contact: "BOUTAINA : 0645 72 26 44",
      service: "RADIO- SCANNER_ANALYSE DISPO SUR PLACE",
      note: "OUSSAMA RBAHI : 0661 56 30 86"
    }
  ],

  CASABLANCA: [
    {
      nom: "Clinique Firdaous",
      adresse: "Boulevard Moulay Mohamed El Bouamrani, Casablanca",
      telephone: "05 22 76 73 73",
      contact: "SAMIRA : cliniquefirdaous@gmail.com",
      service: "Radiologie à côté"
    },
     {
      nom: "Hôpital Privé International de Casablanca (hpic)",
      adresse: "Bd. Bir Anzarane, Angle Rue Ben Jilali et Abou Ishak Chirazi",
      telephone: "05 22 05 40 40",
      contact: "samira inane : 0651 90 09 45",
     
    }
  ],

  RABAT: [
    {
      nom: "Hôpital Privé Pasteur",
      adresse: "Hay Riad, Rabat",
      telephone: "05 37 71 92 92",
      medecin: "Docteur Grine Mustapha",
      contact: "IMANE : 0700 43 15 40"
    }
  ],
   ELJADIDA: [
    {
      nom: "Hôpital Privé d'El Jadida AKDITAL",
      adresse: "L'Aérodrôme, Lot 32 / E , Imm. N°2",
      telephone: "05 23 36 78 78",
      medecin: "Docteur Zouheir Benba",
      contact: "MME FERDAOUS : 0666 07 90 46",
      service: "RADIO- SCANNER_ANALYSE DISPO SUR PLACE"

    }
  ],
   KENITRA: [
    {
      nom: "Polyclinique CNSS Kenitra",
      adresse: "Place Moulay Youssef",
      telephone: "05 37 37 87 38/39",
      medecin: "Docteur  Abdellatif Mourid",
      contact: "Service des urgences",
      service: "RADIO- SCANNER_ANALYSE DISPO SUR PLACE"

    }
  ],
    TANGER: [
    {
      nom: "Clinique Internationale de Tanger",
      adresse: "Place Maghreb Arab, (Rond-point TGV), Tanger City Center,",
      telephone: "05 39 30 90 90",
      medecin: "En cours de désignation",
      contact: "FATIMA ZOHRA : 0636 36 05 97 "
      

    }
  ],
     LAAYOUNE: [
    {
      nom: "POLYCLINIQUE INTERNATIONALE AKDITAL",
      adresse: "LOT EL WAHDA - BD MED VI - LOT N° 14",
      telephone: "0528 98 22 22",
      medecin: "En cours de désignation",
      contact: "FATIMA ZAHRA : responsable admission ",
      service: "RADIO- SCANNER_ANALYSE DISPO SUR PLACE"

    }
  ],
       MZINDA_YOUSSOUFIA: [
    {
      nom: "CLINIQUE EL IDRISSI",
      adresse: "84 LOT LYGENDIS",
      telephone: "0524 64 55 00",
      medecin: "En cours de désignation",
      contact: "SAFAA : ",
      service: "RADIO SCANNER DISPO- Analyses ailleurs sous leur responsabilité"

    }
  ],
        MZINDA_SAFI: [
    {
      nom: "CLINIQUE ESSAADA",
      adresse: "QUARTIER ABC, AVENUE HASSAN II",
      telephone: "0524 46 33 81",
      medecin: "En cours de désignation",
      contact: " ? ",
      service: "RAPPELER MEDECIN DIRECTEUR"

    }
  ]


};

export default function Home() {
  const [villeSelected, setVilleSelected] = useState(null);

  return (
    <div className="home-container">

      <h1>Gestion des Sinistres</h1>
      <p>Déclarez et suivez votre sinistre en toute simplicité</p>

      <div className="home-buttons">
        <Link to="/declarer" className="home-btn declare">
          Déclarer un sinistre
        </Link>

        <Link to="/suivi" className="home-btn suivi">
          Suivre votre dossier
        </Link>
      </div>

      <hr />

      <h2>📍 Hôpitaux par ville</h2>

      <div className="city-list">
        {Object.keys(data).map((ville) => (
          <button
            key={ville}
            className="city-btn"
            onClick={() => setVilleSelected(ville)}
          >
            {ville}
          </button>
        ))}
      </div>

      {/* MODAL */}
      {villeSelected && (
        <div className="modal-overlay" onClick={() => setVilleSelected(null)}>

          <div className="modal-content" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">
              <h3>🏥 {villeSelected}</h3>
              <button onClick={() => setVilleSelected(null)}>✖</button>
            </div>

            <div className="modal-body">

              {data[villeSelected].map((h, i) => (
                <div key={i} className="hospital-card">

                  <h4>{h.nom}</h4>

                  <p>📍 {h.adresse}</p>
                  <p>📞 {h.telephone}</p>

                  {h.medecin && <p>👨‍⚕️ {h.medecin}</p>}
                  {h.contact && <p>👤 {h.contact}</p>}
                  {h.service && <p>🏥 {h.service}</p>}
                  {h.note && <p>ℹ️ {h.note}</p>}

                </div>
              ))}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
