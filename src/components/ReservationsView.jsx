// src/components/ReservationsView.jsx
import React, { useState, useEffect } from "react";
import { C, reservations as mockReservations } from "../config/constants";
import { Icons } from "./ui/Icons";
import { BtnPrimary } from "./ui/Buttons";
import { StatusBadge } from "./ui/Widgets";
import { supabase } from "../supabaseClient";
import { useUser } from "../context/UserContext";

export default function ReservationsView({ animateIn, onGoToAreas }) {
  const [filter, setFilter] = useState("all");
  const [myReservations, setMyReservations] = useState([]);
  const [loadingRes, setLoadingRes] = useState(true);
  const { userProfile } = useUser();

  useEffect(() => {
    if (userProfile) {
      const fetchReservas = async () => {
        setLoadingRes(true);
        const { data, error } = await supabase
          .from("Reserva") // Ajusta al nombre exacto de tu tabla
          .select("*")
          .eq("id_usuario", userProfile.id_usuario);

        if (!error && data) setMyReservations(data);
        else console.error("Error cargando reservas:", error);
        
        setLoadingRes(false);
      };
      fetchReservas();
    }
  }, [userProfile]);

  const displayReservations = myReservations.length > 0 ? myReservations : mockReservations;
  const filteredRes = filter === "all" ? displayReservations : displayReservations.filter(r => r.status === filter || r.estado === filter);

  return (
    <div style={{ animation: animateIn ? "fadeUp 0.5s ease forwards" : "none", opacity: animateIn ? 1 : 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Tus Reservaciones</h1>
          <p style={{ fontSize: 14, color: C.textMuted }}>Historial y gestión de tus espacios</p>
        </div>
        <BtnPrimary onClick={onGoToAreas}>{Icons.plus} Nueva Reservación</BtnPrimary>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ id: "all", l: "Todas" }, { id: "confirmed", l: "Confirmadas" }, { id: "active", l: "Activas" }, { id: "pending", l: "Pendientes" }, { id: "cancelled", l: "Canceladas" }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", color: filter === f.id ? "#fff" : C.textMuted, background: filter === f.id ? C.purple1 : "rgba(255,255,255,0.06)", transition: "all 0.2s" }}>{f.l}</button>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.glassBorder}`, background: C.glass }}>
        {loadingRes ? (
          <div style={{ padding: 40, textAlign: "center", color: C.purple1 }}>Cargando reservaciones...</div>
        ) : filteredRes.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>No tienes reservaciones aún.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.glassBorder}` }}>
                {["Espacio", "Ubicación", "Fecha", "Horario", "Ocupación", "Estado", ""].map((h, i) => (
                  <th key={i} style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRes.map((r, i) => (
                <tr key={r.id || r.id_reserva} style={{ borderBottom: "1px solid rgba(161,0,255,0.08)", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(161,0,255,0.06)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "14px 16px", fontSize: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>🏢</span>
                      <span style={{ fontWeight: 700 }}>{r.space || r.id_espacio || "Sala"}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: C.textMuted }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}>{Icons.pin} Piso {r.floor || 1}</div></td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: C.textMuted }}>{r.date || r.fecha}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: C.textMuted }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}>{Icons.clock} {r.time || r.hora_inicio}</div></td>
                  <td style={{ padding: "14px 16px", fontSize: 13 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}>{Icons.users} {r.attendees || 1}</div></td>
                  <td style={{ padding: "14px 16px" }}><StatusBadge status={r.status || r.estado || "Confirmada"} /></td>
                  <td style={{ padding: "14px 16px", color: C.textMuted }}>{Icons.chevron}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}