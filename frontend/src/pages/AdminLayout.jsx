import React from "react";
import "./AdminLayout.css";
import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="admin-wrapper">

      {/* SIDEBAR */}
      <div className="sidebar">
        <h3>Admin Panel</h3>
        <ul>
          <li><NavLink to="/admin/dashboard">Dashboard</NavLink></li>
          <li><NavLink to="/admin/users">Utilisateurs</NavLink></li>
          <li><NavLink to="/admin/societe">Ajouter société</NavLink></li>
        </ul>
      </div>

      {/* CONTENU FULL */}
      <div className="main-content">
        <Outlet />
      </div>

    </div>
  );
}