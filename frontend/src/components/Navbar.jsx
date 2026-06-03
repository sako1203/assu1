import { NavLink, useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  const username = localStorage.getItem("username");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/auth");
  };

  return (
    <nav className="navbar">

      {/* LOGO */}
      <div className="navbar-logo">
        SINISTRE
      </div>

      {/* LINKS */}
      <ul className="navbar-links">

        <li>
          <NavLink to="/" className="nav-link">Accueil</NavLink>
        </li>

        <li>
          <NavLink to="/declarer" className="nav-link">Déclarer</NavLink>
        </li>

        <li>
          <NavLink to="/suivi" className="nav-link">Suivi</NavLink>
        </li>

        <li>
          <NavLink to="/agences" className="nav-link">Agences</NavLink>
        </li>

        {/* ADMIN ONLY */}
        {username && (
          <li>
            <NavLink to="/admin/dashboard" className="nav-link">
              Admin
            </NavLink>
          </li>
        )}

        {/* AUTH AREA */}
        {username ? (
          <li>
            <button className="nav-btn" onClick={handleLogout}>
              Déconnexion
            </button>
          </li>
        ) : (
          <li>
            <NavLink to="/auth" className="nav-link">
              Connexion
            </NavLink>
          </li>
        )}

      </ul>
    </nav>
  );
}