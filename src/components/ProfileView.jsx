// src/components/ProfileView.jsx
import React from "react";
import { C } from "../config/constants";
import { Icons } from "./ui/Icons";
import { BtnPrimary } from "./ui/Buttons";
import { useUser } from "../context/UserContext";

export default function ProfileView({ animateIn }) {
  const { userProfile } = useUser();
  const iniciales = `${userProfile.nombre?.[0] || ""}${userProfile.primer_apellido?.[0] || ""}`.toUpperCase();

  return (
    <div style={{ animation: animateIn ? "fadeUp 0.5s ease forwards" : "none", opacity: animateIn ? 1 : 0 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 28 }}>Mi Perfil</h1>

      <div style={{ display: "flex", gap: 24 }}>
        {/* Info Card */}
        <div style={{ flex: 1, borderRadius: 16, background: C.cardDark, padding: 28, border: `1px solid ${C.glassBorder}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, textTransform: "uppercase" }}>Información</h2>
            <button style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.text, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>{Icons.edit}</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { l: "Correo", v: userProfile.correo },
              { l: "Nombre Completo", v: `${userProfile.nombre} ${userProfile.primer_apellido} ${userProfile.segundo_apellido || ""}` },
              { l: "ID de Seguridad", v: userProfile.id_usuario.split('-')[0].toUpperCase() },
              { l: "Estado", v: userProfile.estado },
              { l: "Prioridades", v: userProfile.prioridades || "Sin asignar" },
              { l: "Rol del Sistema", v: userProfile.id_rol ? `Nivel ${userProfile.id_rol}` : "Estándar" },
            ].map((f, i) => (
              <div key={i}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{f.l}</div>
                <div style={{ fontSize: 14, color: C.textMuted, textTransform: f.l === "Nombre Completo" ? "capitalize" : "none" }}>{f.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Avatar Card */}
        <div style={{ width: 300, borderRadius: 16, background: C.cardDark, padding: 28, border: `1px solid ${C.glassBorder}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 140, height: 140, borderRadius: "50%", background: `linear-gradient(135deg, ${C.purple1}, ${C.purple5})`, border: `4px solid #fff`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, fontWeight: 800, color: "#fff", marginBottom: 20 }}>
            {iniciales}
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2, textTransform: "capitalize" }}>
            {userProfile.nombre} {userProfile.primer_apellido}
          </h3>
          <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 20 }}>
            {userProfile.id_rol === 1 ? "Administrador" : "Empleado Activo"}
          </p>
          <BtnPrimary style={{ width: "100%" }}>Editar Perfil</BtnPrimary>
        </div>
      </div>
    </div>
  );
}