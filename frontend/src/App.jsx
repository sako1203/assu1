import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";

import Home from "./pages/Home.jsx";
import DeclareSinistre from "./pages/DeclareSinistre.jsx";
import SuiviDossier from "./pages/SuiviDossier.jsx";
import Auth from "./pages/Auth.jsx";
import AgencesPage from "./pages/AgencesPage.jsx";

import FormIndividuel from "./pages/forms/FormIndividuel.jsx";
import FormServiceAT from "./pages/forms/FormServiceAt.jsx";
import FormResponsable from "./pages/forms/FormResponsable.jsx";
import FormMedecin from "./pages/forms/FormMedecin.jsx";
import FormEnqueteur from "./pages/forms/FormEnqueteur.jsx";

import AdminUsers from "./pages/AdminUsers.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminLayout from "./pages/AdminLayout.jsx";
import SocietePage from "./pages/SocietePage.jsx";

function AppLayout() {
  const location = useLocation();

  // ❌ cacher navbar si route admin
  const hideNavbar = location.pathname.startsWith("/admin");

  return (
    <>
      {!hideNavbar && <Navbar />}

      <Routes>

        {/* PUBLIC */}
        <Route path="/" element={<Home />} />
        <Route path="/declarer" element={<DeclareSinistre />} />
        <Route path="/suivi" element={<SuiviDossier />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/agences" element={<AgencesPage />} />

        {/* FORMULAIRES */}
        <Route path="/form/individuel" element={<FormIndividuel />} />
        <Route path="/form/service-at" element={<FormServiceAT />} />
        <Route path="/form/responsable" element={<FormResponsable />} />
        <Route path="/form/medecin" element={<FormMedecin />} />
        <Route path="/form/enqueteur" element={<FormEnqueteur />} />

        {/* ADMIN */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="societe" element={<SocietePage />} />
        </Route>

      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}