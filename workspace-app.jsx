import React, { useState } from "react";
import "./src/App.css"; // Importamos los estilos globales aquí

// Importamos nuestras pantallas fragmentadas
import LoginScreen from "./src/pages/Login";
import RegisterScreen from "./src/pages/Register";
import DashboardApp from "./src/pages/Dashboard";

export default function App() {
  const [page, setPage] = useState("login");

  return (
    <>
      {page === "login" && (
        <LoginScreen 
          onLogin={() => setPage("dashboard")} 
          onGoRegister={() => setPage("register")} 
        />
      )}
      
      {page === "register" && (
        <RegisterScreen 
          onRegister={() => setPage("dashboard")} 
          onGoLogin={() => setPage("login")} 
        />
      )}
      
      {page === "dashboard" && (
        <DashboardApp 
          onLogout={() => setPage("login")} 
        />
      )}
    </>
  );
}