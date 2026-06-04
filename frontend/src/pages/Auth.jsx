import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Auth.css";

export default function Auth() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from || "/";

  const login = async (username, password) => {
    const res = await fetch("http://assu1-production.up.railway.app/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Erreur serveur");
    }

    return data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(username, password);

      // 🔥 IMPORTANT : backend renvoie user
      const user = data.user;

      localStorage.setItem("role", user.role?.toLowerCase().trim());
      localStorage.setItem("username", user.username);

      setError(""); // clear error

      navigate(redirectPath);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">

      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Connexion requise</h2>

        <p className="auth-subtitle">
          Veuillez vous authentifier pour continuer
        </p>

        {error && <div className="auth-error">{error}</div>}

        <input
          type="text"
          placeholder="Nom d'utilisateur"
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

        <button disabled={loading}>
          {loading ? "Vérification..." : "Se connecter"}
        </button>

      </form>

    </div>
  );
}