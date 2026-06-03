import { useState } from 'react';
import './AgencesPage.css';

export default function AgencesPage() {
  const [selectedOption, setSelectedOption] = useState(null);

  return (
    <div className="agences-container">
      {!selectedOption && (
        <div className="choice-container">
          <h2>Choisissez une option :</h2>
          <button onClick={() => setSelectedOption('agences')} className="choice-btn">
            Agences
          </button>
          <button onClick={() => setSelectedOption('service-at')} className="choice-btn">
            Service AT
          </button>
        </div>
      )}

      {selectedOption === 'agences' && (
        <div className="printable-content">
          <h1>SURVENANCE D'UN AT</h1>
        <h2>LE RESPONSABLE DE L'AGENCE DOIT :</h2>
        <p><strong>Appeler notre médecin régulateur au : 0663.61.99.77 ou au</strong></p>
        <p><strong>OBJECTIF :</strong> procéder à l'évaluation des blessures de la victime en vue de sa régulation vers le lieu de traitement le plus approprié.</p>

        <h3>SI OBLIGATION DE TRANSPORT PAR AMBULANCE :</h3>
        <p><strong>Appeler la plate forme Sanlam Assistance au : 0522 95 75 94 ou 080 200 1550.</strong></p>
        <p><strong>OBLIGATIONS :</strong> VOUS DEVEZ LEUR COMMUNIQUER LE NOM DE LA SOCIETE AUQUELLE EST AFFILIEE LA VICTIME, LE NUMERO DE VOTRE CONTRAT AT. ATTENTION : NE LAISSEZ PAS L'AMBULANCIER VOUS IMPOSER L'ETABLISSEMENT HOSPITALIER DE SON CHOIX. IMPOSEZ LE CHOIX DE LA VICTIME OU LE VOTRE. EN CAS DE SOUCI : CONTACTEZ NOUS AU 0661 18 56 17</p>

        <h3>FORMALITES ADMINISTRATIVES AU NIVEAU DE L'AGENCE :</h3>

        <div className="procedure">
          <h4>GROUPE WATSUP</h4>
          <p>Informer le groupe de la survenance de sinistre (maintenir le process actuel)</p>
        </div>

        <div className="procedure">
          <h4>APPLICATION INFORMATIQUE (GESTION SINIISTRES AT MISE A VOTRE DISPOSITION)</h4>
          <p>Enregistrer obligatoirement les infos demandées</p>
        </div>

        <div className="procedure">
          <h4>DECLARATION DU SINISTRE :</h4>
          <p>Vérifier d'abord avec la direction si il est utile que le sinistre fasse l'objet d'une déclaration ou pas</p>
          <p>rajouter sur l'application informatique la rubrique : a declarer ou non a la compagnie d'assurance</p>
        </div>

        <div className="procedure">
          <h4>SI OBLIGATION DE DECLARATION</h4>
          <p>Déclarer par email au Siège.</p>
          <p>mail des destinataires (service AT siège)</p>
        </div>

        <div className="procedure">
          <h4>REGISTRE DE SUIVI DES PEC</h4>
          <p>Noter sur le registre en face du numero d'affectation : le nom de la victime et date d'accident</p>
        </div>

        <div className="procedure">
          <h4>RECEPTION ET TRANSMISSION DES CERTIFICATS MEDICAUX</h4>
          <p>Faire très attention aux dates de réception des certificats remis par la victime</p>
          <p>Très important N°1 : Sur chaque certificat medical que vous remettra la victime, vous devez accuser réception en mettant la date de réception dudit certificat (même sur la copie que vous devez lui remettre).</p>
          <p>Très important N°2 : noter cette date d'accuser réception dans l'application).</p>
          <p>Très important N°3 : Si au moment de la réception des certificats, vous constatez que le nb de jours d'arret ou le taux d'Ipp sont surévalués par rapport aux blessures, vous devez nous en aviser immédiatement avant d'informer le courtier ou la compagnie.</p>
          <p>Ensuite 1: Si validation par nos soins, déclarer le certificat par email au siège de votre société à casa.</p>
          <p>Ensuite 2 : Une fois complet, adresser le dossier joint des oriiginaux au siège à Casa.</p>
          <p>ACTUELLEMENT, TRANSMISSION PAR EMAIL. QUAND LE DOSSIER EST CLOS, TRANSMISSION DE L'ENSEMBLE DES ORIGINAUX DU DOSSIER AU SIEGE</p>
        </div>

        <div className="procedure">
          <h4>RECEPTION ET TRANSMISSION DES QUITTANCES DE REGLEMENT DES ITT</h4>
          <p>Traitement des quittances</p>
          <p>1/ Dès réception de la quittance originale, faire signer la victime et retourner ce document au plus vite au siège de casa.</p>
          <p>2/ Enregistrer sur l'application la date de réception de la quittance et sa date de renvoi dument signée au siège</p>
        </div>

        <div className="procedure">
          <h4>RECEPTION ET TRANSMISSION DU REGLEMENT A LA VICTIME</h4>
          <p>Traitement des règlements</p>
          <p>1/ Dès réception du règlement, enregistrer la date de réception et faire signer à la victime la date de remise du rglt. Retourner ce document signé au plus vite au siège de casa.</p>
        </div>
        </div>
      )}

      {selectedOption === 'service-at' && (
        <div className="printable-content">
          <h1>PROCÉDURES POUR SERVICE AT</h1>

          <div className="procedure">
            <h4>GROUPE WATSUP</h4>
            <p>Entrer sur l'application et vérifier que l'enregistrement du sinistre figure déjà.</p>
          </div>

          <div className="procedure">
            <h4>APPLICATION INFORMATIQUE (GESTION SINIISTRES AT MISE A VOTRE DISPOSITION)</h4>
            <p>Enregistrer obligatoirement les infos demandées relatives à la victime</p>
          </div>

          <div className="procedure">
            <h4>DECLARATION DU SINISTRE :</h4>
            <p>Vérifier d'abord avec la direction si il est utile que le sinistre fasse l'objet d'une déclaration ou pas</p>
          </div>

          <div className="procedure">
            <h4>SI OBLIGATION DE DECLARATION</h4>
            <p>Déclarer par email au courtier, à la compagnie d'assurance ainsi qu'à l'inspection du travail (dans un délai maximal de 48 heures à compter de la date d'accident)</p>
            <p>mail des destinataires :</p>
          </div>

          <div className="procedure">
            <h4>REGISTRE DE SUIVI DES PEC</h4>
            <p>Noter sur le registre en face du numero d'affectation : le nom de la victime et date d'accident</p>
          </div>

          <div className="procedure">
            <h4>RECEPTION ET TRANSMISSION DES CERTIFICATS MEDICAUX</h4>
            <p>Faire très attention aux dates de réception des certificats remis par la victime au superviseur</p>
            <p>Dès réception: 1/ enregistrer les données sur l'application informatique. 2/scanner et enregistrer chaque certificat dans l'application et les déclarer par email au courtier, à la compagnie d'assurance ainsi qu'à l'inspection du travail.3/Garder les originaux jusqu'à transmission en un seul bloc au courtier</p>
          </div>

          <div className="procedure">
            <h4>RECEPTION ET TRANSMISSION DES QUITTANCES DE REGLEMENT DES ITT</h4>
            <p>1/ Dès réception de la quittance originale de la cie, enregistrer la date de réception et date envoi à l'agence et l'envoyer.  2/ Dès réception de la quittance signée, enregistrer sur l'application la date de réception et sa date de renvoi au courtier et lui transmettre</p>
            <p>1/ Vérifier que les quittances signées parviennent bien au siège dans les délais impartis. 2/ Si les délais ne sont pas respectés, il y a possibilité pour la victime de faire appliquer une pénalité de 3% sur le nb de jours de retard. 3/ Donc, vérifier continuellement que la victime recoit ses indemnités conformément à la rémunération qu'elle avait : à la fin de chaque quinzaine, etc...</p>
          </div>

          <div className="procedure">
            <h4>RECEPTION ET TRANSMISSION DU REGLEMENT DES ITT</h4>
            <p>Traitement du règlement</p>
            <p>Dès réception du règlement, l'adresser à l'agence et noter la date de transmission à l'agence.</p>
          </div>
        </div>
      )}

      {selectedOption && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={() => window.print()} style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Imprimer ce contenu
          </button>
        </div>
      )}
    </div>
  );
}