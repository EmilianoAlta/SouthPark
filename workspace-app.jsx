import React, { useState } from "react";
import "./src/App.css"; // Importamos los estilos globales aquí

// Importamos nuestras pantallas fragmentadas
import LoginScreen from "./src/pages/Login";
import RegisterScreen from "./src/pages/Register";
import DashboardApp from "./src/pages/Dashboard";
import { UserProvider, useUser } from "./src/context/UserContext";
import { supabase } from "./src/supabaseClient";
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
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a0a1e", color: "#fff" }}>
          Cargando espacio de trabajo...
      </div>
    );
  }
  if (userProfile){
    return (
      <DashboardApp 
        onLogout={async () => {
          await supabase.auth.signOut(); //cerrar sesion con supabase
          setPage("login");
        }} 
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