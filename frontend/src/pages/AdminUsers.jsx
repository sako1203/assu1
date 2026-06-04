import { useState, useEffect } from "react";
import "./AdminUsers.css";

export default function AdminUsers() {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("medecin");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("https://assu1-production.up.railway.app/api/users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 🔴 DELETE USER
  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;

    try {
      const res = await fetch(`https://assu1-production.up.railway.app/api/users/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage("Utilisateur supprimé !");
        fetchUsers();
      }
    } catch (err) {
      alert("Erreur serveur");
    }
  };

  // 🔵 CREATE USER
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("https://assu1-production.up.railway.app/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom,
          prenom,
          username,
          password,
          role,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Utilisateur créé !");
        setNom("");
        setPrenom("");
        setUsername("");
        setPassword("");
        setRole("medecin");
        fetchUsers();
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage("Erreur serveur");
    }
  };

  return (
    <div className="admin-page">

      {/* FORM CARD */}
      <div className="admin-card">
        <h2>Gestion des utilisateurs</h2>

        {message && <div className="message">{message}</div>}

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="row">
            <input
              placeholder="Nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
            />

            <input
              placeholder="Prénom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
            />
          </div>

          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="medecin">Médecin</option>
            <option value="responsable">Responsable</option>
            <option value="service-at">Service AT</option>
            <option value="enqueteur">Enquêteur</option>
            <option value="backoffice">Backoffice</option> {/* ✅ AJOUT */}
          </select>

          <button type="submit">Créer utilisateur</button>
        </form>
      </div>

      {/* TABLE CARD */}
      <div className="admin-card">
        <h3>Liste des utilisateurs</h3>

        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Username</th>
              <th>Rôle</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.nom}</td>
                <td>{u.prenom}</td>
                <td>{u.username}</td>

                <td>
                  <span className={`role ${u.role}`}>
                    {u.role === "backoffice" ? "Back Office" : u.role}
                  </span>
                </td>

                <td>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(u._id)}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
}