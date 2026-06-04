// src/services/authService.js

const API_URL = "http://assu1-production.up.railway.app/api/auth"; // ton backend

export const login = async (username, password) => {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Erreur connexion");
  }

  return await res.json(); // retourne { username, role }
};

export const register = async (username, password, role) => {
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password, role }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Erreur inscription");
  }

  return await res.json();
};