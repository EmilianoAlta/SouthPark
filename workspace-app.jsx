import React, { useState } from "react";
import "./src/App.css"; // Importamos los estilos globales aquí

// Importamos nuestras pantallas fragmentadas
import LoginScreen from "./src/pages/Login";
import RegisterScreen from "./src/pages/Register";
import DashboardApp from "./src/pages/Dashboard";
import CheckinPage from "./src/pages/CheckinPage";
import { UserProvider, useUser } from "./src/context/UserContext";
import { supabase } from "./src/supabaseClient";

// Detectar si el usuario llegó escaneando el QR de check-in
const IS_CHECKIN_ROUTE = window.location.pathname === "/checkin";

export default function App() {
  return (
    <UserProvider>
      <MainRouter/>
    </UserProvider>
  )
}
const MainRouter = () => {
  const { userProfile, loading} = useUser();
  const [page, setPage] = useState("login");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setPage("login");
    // Limpiar la URL si venía del QR para no quedar atrapado en /checkin
    if (IS_CHECKIN_ROUTE) window.history.replaceState({}, "", "/");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a0a1e", color: "#fff" }}>
          Cargando espacio de trabajo...
      </div>
    );
  }

  if (userProfile) {
    // Usuario autenticado + ruta /checkin → mostrar página de check-in
    if (IS_CHECKIN_ROUTE) {
      return (
        <CheckinPage
          onBackToApp={() => {
            window.history.replaceState({}, "", "/");
            window.location.reload();
          }}
        />
      );
    }
    return (
      <DashboardApp
        onLogout={handleLogout}
      />
    );
  }

  if (page == "login"){
    return (
      <LoginScreen
        onLogin={() => {}}
        onGoRegister={() => setPage("register")}
      />
    );
  }
  if (page === "register"){
    return(
      <RegisterScreen
        onRegister={() => {}}
        onGoLogin={() => setPage("login")}
      />
    );
  }
  return null;
}