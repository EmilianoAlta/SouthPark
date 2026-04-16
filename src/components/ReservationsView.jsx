// src/components/ReservationsView.jsx
import React, { useState, useEffect } from "react";
import { C } from "../config/constants";
import { Icons } from "./ui/Icons";
import { BtnPrimary } from "./ui/Buttons";
import { StatusBadge } from "./ui/Widgets";
import { supabase } from "../supabaseClient";
import { useUser } from "../context/UserContext";

export default function ReservationsView({ animateIn, onGoToAreas }) {
  const [filter, setFilter] = useState("all");
  const [myReservations, setMyReservations] = useState([]);
  const [loadingRes, setLoadingRes] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // Estado para el botón de refrescar
  const { userProfile } = useUser();

  // Función de fetch mejorada con manejo de errores y consola
  const fetchReservas = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoadingRes(true);

    try {
      const { data, error } = await supabase
        .from("Reserva")
        .select(`
          *,
          Espacio (tipo, codigo)
        `)
        .eq("id_usuario", userProfile.id_usuario)
        .order('fecha_solicitud', { ascending: false }); 

      if (error) throw error;
      
      // 🟢 DEBUG: Abre la consola (F12) en tu navegador para ver esto
      console.log("✅ Datos obtenidos de Supabase:", data); 
      
      setMyReservations(data || []);
    } catch (error) {
      console.error("❌ Error cargando reservas:", error.message);
    } finally {
      setLoadingRes(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchReservas();
    }
  }, [userProfile]);
  const cancelarReserva = async (idReserva) => {
    const confirmar = window.confirm("¿Estás seguro de que deseas cancelar esta reservación?");
    if (!confirmar) return;
    setLoadingRes(true);
    try {
      // Agregamos .select() para obligar a Supabase a decirnos si realmente cambió algo
      const { data, error } = await supabase
        .from("Reserva")
        .update({ id_estado: 4 }) 
        .eq("id_reserva", idReserva)
        .select();

      if (error) throw error;

      // Si data está vacío, es un fallo silencioso de RLS (Permisos de BD)
      if (!data || data.length === 0) {
         throw new Error("Supabase bloqueó el UPDATE (Verifica tus políticas de RLS para la tabla Reserva).");
      }

      fetchReservas();
    } catch (e) {
      console.error("Error cancelando reserva:", e);
      alert(`No se pudo cancelar: ${e.message}`);
    } finally {
      // Garantizamos que la tabla siempre se destrabe, haya error o no.
      setLoadingRes(false);
    }
  };
  const filteredRes = myReservations.filter(r => {
    if (filter === "all") return true;
    if (filter === "confirmed" && r.id_estado === 1) return true;
    if (filter === "active" && r.id_estado === 2) return true;
    if (filter === "pending" && r.id_estado === 3) return true;
    if (filter === "cancelled" && r.id_estado === 4) return true;
    if (filter === "finished" && r.id_estado === 5) return true;
    return false;
  });

  return (
    <div style={{ animation: animateIn ? "fadeUp 0.5s ease forwards" : "none", opacity: animateIn ? 1 : 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Tus Reservaciones</h1>
          <p style={{ fontSize: 14, color: C.textMuted }}>Historial de tus espacios en el sistema</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {/* 🟢 Botón con feedback visual de carga */}
          <BtnPrimary 
            onClick={() => fetchReservas(true)} 
            style={{ background: "rgba(255,255,255,0.1)", color: C.text, opacity: isRefreshing ? 0.6 : 1 }}
          >
            {isRefreshing ? "Actualizando..." : <>{Icons.clock} Refrescar</>}
          </BtnPrimary>
          <BtnPrimary onClick={onGoToAreas}>{Icons.plus} Nueva Reservación</BtnPrimary>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ id: "all", l: "Todas" }, 
          { id: "pending", l: "Pendientes" }, 
          { id: "confirmed", l: "Confirmadas" }, 
          { id: "active", l: "Activas" }, 
          { id: "finished", l: "Finalizadas" },
          { id: "cancelled", l: "Canceladas" }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", color: filter === f.id ? "#fff" : C.textMuted, background: filter === f.id ? C.purple1 : "rgba(255,255,255,0.06)", transition: "all 0.2s" }}>{f.l}</button>
        ))}
      </div>

      <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.glassBorder}`, background: C.glass }}>
        {loadingRes ? (
          <div style={{ padding: 40, textAlign: "center", color: C.purple1 }}>Cargando desde la base de datos...</div>
        ) : filteredRes.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.3 }}>{Icons.calendar}</div>
            No se encontraron reservaciones para tu usuario.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.glassBorder}` }}>
                {["Espacio", "Tipo", "Fecha", "Horario", "Asistentes", "Estado"].map((h, i) => (
                  <th key={i} style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRes.map((r) => (
                <tr key={r.id_reserva} style={{ borderBottom: "1px solid rgba(161,0,255,0.08)", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(161,0,255,0.06)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "14px 16px", fontSize: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>🏢</span>
                      <span style={{ fontWeight: 700 }}>{r.Espacio?.codigo || `Espacio ${r.id_espacio}`}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: C.textMuted }}>{r.Espacio?.tipo || "General"}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: C.textMuted }}>{r.fecha_reserva}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: C.textMuted }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>{Icons.clock} {r.hora_inicio.slice(0,5)} - {r.hora_fin.slice(0,5)}</div>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}>{Icons.users} {r.asistentes}</div></td>
                  <td style={{ padding: "14px 16px" }}>
                    <StatusBadge status={
                      r.id_estado === 1 ? "confirmed" : 
                      r.id_estado === 2 ? "active" : 
                      r.id_estado === 3 ? "pending" : 
                      r.id_estado === 4 ? "cancelled" : 
                      r.id_estado === 5 ? "finished" : "unknown"
                    } />
                  </td>
                  {/* Boton para cancelar reserva */}
                  <td style={{ padding: "14px 16px", textAlign: "right"}}>
                    {(r.id_estado === 1 || r.id_estado === 3) && ( //solo se pueden cancelar las reservas confirmadas o pendientes
                      <button 
                        onClick={() => cancelarReserva(r.id_reserva)}
                        style={{ background: "rgba(255,50,50,0.1)", color: C.danger, border: `1px solid ${C.danger}40`, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,50,50,0.2)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,50,50,0.1)"}
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}