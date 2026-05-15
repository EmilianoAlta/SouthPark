// src/components/ReservationsView.jsx
import React, { useState, useEffect } from "react";
import { C } from "../config/constants";
import { Icons } from "./ui/Icons";
import { BtnPrimary } from "./ui/Buttons";
import { StatusBadge } from "./ui/Widgets";
import ConfirmModal from "./ui/ConfirmModal";
import { supabase } from "../supabaseClient";
import { useUser } from "../context/UserContext";

export default function ReservationsView({ animateIn, onGoToAreas }) {
  const [filter, setFilter] = useState("all");
  const [myReservations, setMyReservations] = useState([]);
  const [loadingRes, setLoadingRes] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [toast, setToast] = useState(null);
  const { userProfile } = useUser();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

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
      setMyReservations(data || []);
    } catch (error) {
      console.error("Error cargando reservas:", error.message);
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

  const ejecutarCancelacion = async () => {
    if (!confirmCancel) return;
    const idReserva = confirmCancel;
    setCancelling(true);
    try {
      const { data, error } = await supabase.rpc("cancelar_reserva", {
        p_id_reserva: idReserva,
      });

      if (error) throw error;
      if (!data) throw new Error("La reserva no se pudo cancelar.");

      setConfirmCancel(null);
      showToast("Reserva cancelada correctamente.", "success");
      fetchReservas();
    } catch (e) {
      console.error("Error cancelando reserva:", e);
      const msg = e.message?.includes("No autorizado")
        ? "No tienes permiso para cancelar esta reserva."
        : e.message?.includes("ya está")
        ? "La reserva ya está cancelada o finalizada."
        : e.message || "Error desconocido al cancelar.";
      showToast(`No se pudo cancelar: ${msg}`, "error");
      setConfirmCancel(null);
    } finally {
      setCancelling(false);
    }
  };

  // ── Stats ──
  const total = myReservations.length;
  const activas = myReservations.filter(r => r.id_estado === 1 || r.id_estado === 2 || r.id_estado === 3).length;
  const finalizadas = myReservations.filter(r => r.id_estado === 5).length;
  const canceladas = myReservations.filter(r => r.id_estado === 4).length;

  const stats = [
    { label: "Total", value: total, icon: Icons.calendar, color: C.purple1, bg: "rgba(161,0,255,0.12)" },
    { label: "Activas", value: activas, icon: Icons.clock, color: C.blue, bg: "rgba(96,165,250,0.12)" },
    { label: "Finalizadas", value: finalizadas, icon: Icons.check || "✓", color: C.success, bg: "rgba(74,222,128,0.12)" },
    { label: "Canceladas", value: canceladas, icon: Icons.x || "✕", color: C.danger, bg: "rgba(248,113,113,0.12)" },
  ];

  const filteredRes = myReservations.filter(r => {
    if (filter === "all") return true;
    if (filter === "confirmed" && r.id_estado === 1) return true;
    if (filter === "active" && r.id_estado === 2) return true;
    if (filter === "pending" && r.id_estado === 3) return true;
    if (filter === "cancelled" && r.id_estado === 4) return true;
    if (filter === "finished" && r.id_estado === 5) return true;
    return false;
  });

  // Reserva más próxima (confirmada o activa, fecha >= hoy)
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
  const proxima = myReservations
    .filter(r => (r.id_estado === 1 || r.id_estado === 2 || r.id_estado === 3) && r.fecha_reserva >= hoyStr)
    .sort((a, b) => a.fecha_reserva.localeCompare(b.fecha_reserva) || a.hora_inicio.localeCompare(b.hora_inicio))[0];

  return (
    <div style={{ animation: animateIn ? "fadeUp 0.5s ease forwards" : "none", opacity: animateIn ? 1 : 0 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Tus Reservaciones</h1>
          <p style={{ fontSize: 14, color: C.textMuted }}>Historial y estado de tus espacios reservados</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <BtnPrimary
            onClick={() => fetchReservas(true)}
            style={{ background: "rgba(255,255,255,0.1)", color: C.text, opacity: isRefreshing ? 0.6 : 1 }}
          >
            {isRefreshing ? "Actualizando..." : <>{Icons.clock} Refrescar</>}
          </BtnPrimary>
          <BtnPrimary onClick={onGoToAreas}>{Icons.plus} Nueva Reservacion</BtnPrimary>
        </div>
      </div>

      {/* ── Stat Widgets ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            borderRadius: 14, padding: "18px 20px",
            background: C.glass, border: `1px solid ${C.glassBorder}`,
            display: "flex", alignItems: "center", gap: 14,
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${s.color}20`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: s.bg, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, color: s.color, flexShrink: 0,
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.white, lineHeight: 1 }}>{loadingRes ? "–" : s.value}</div>
              <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Próxima reserva ── */}
      {proxima && (
        <div style={{
          borderRadius: 14, padding: "16px 22px", marginBottom: 20,
          background: `linear-gradient(135deg, rgba(161,0,255,0.15) 0%, rgba(96,165,250,0.10) 100%)`,
          border: `1px solid ${C.purple1}40`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${C.purple1}25`, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, color: C.purpleLight,
            }}>
              {Icons.map}
            </div>
            <div>
              <div style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>Proxima reserva</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>
                {proxima.Espacio?.tipo || "Espacio"} <span style={{ color: C.textMuted, fontWeight: 400, fontSize: 13 }}>{proxima.Espacio?.codigo}</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{proxima.fecha_reserva}</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>{proxima.hora_inicio.slice(0,5)} - {proxima.hora_fin.slice(0,5)}</div>
          </div>
        </div>
      )}

      {/* ── Filtros ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ id: "all", l: "Todas" },
          { id: "pending", l: "Pendientes" },
          { id: "confirmed", l: "Confirmadas" },
          { id: "active", l: "Activas" },
          { id: "finished", l: "Finalizadas" },
          { id: "cancelled", l: "Canceladas" }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13,
            fontWeight: filter === f.id ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
            color: filter === f.id ? "#fff" : C.textMuted,
            background: filter === f.id ? C.purple1 : "rgba(255,255,255,0.06)",
            transition: "all 0.2s",
          }}>{f.l}</button>
        ))}
      </div>

      <ConfirmModal
        open={confirmCancel !== null}
        title="Cancelar reserva"
        message="¿Seguro que deseas cancelar esta reservacion? Esta accion no se puede deshacer y el espacio quedara disponible para otros usuarios."
        confirmText="Si, cancelar"
        cancelText="Volver"
        danger
        busy={cancelling}
        onConfirm={ejecutarCancelacion}
        onCancel={() => !cancelling && setConfirmCancel(null)}
      />

      {toast && (
        <div style={{
          position: "fixed", bottom: 40, right: 40, zIndex: 9999,
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 24px", borderRadius: 16, background: C.cardDark,
          border: `1px solid ${toast.type === "error" ? C.danger : C.success}`,
          boxShadow: `0 10px 40px ${toast.type === "error" ? C.danger : C.success}40`,
          color: C.white, fontSize: 14, fontWeight: 600,
          animation: "fadeUp 0.3s ease forwards",
        }}>
          <span style={{ fontSize: 20 }}>{toast.type === "error" ? "⚠️" : "✅"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Tabla ── */}
      <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.glassBorder}`, background: C.glass }}>
        {loadingRes ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3, animation: "pulse 1.5s infinite" }}>{Icons.calendar}</div>
            <div style={{ color: C.textMuted, fontSize: 14 }}>Cargando reservaciones...</div>
          </div>
        ) : filteredRes.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: C.textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.3 }}>{Icons.calendar}</div>
            {filter === "all" ? "No tienes reservaciones aun." : "No hay reservaciones con este filtro."}
            {filter === "all" && (
              <div style={{ marginTop: 16 }}>
                <BtnPrimary onClick={onGoToAreas} style={{ fontSize: 13 }}>{Icons.plus} Hacer tu primera reservacion</BtnPrimary>
              </div>
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.glassBorder}` }}>
                {["Espacio", "Fecha", "Horario", "Asistentes", "Estado", ""].map((h, i) => (
                  <th key={i} style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRes.map((r) => {
                const statusKey = r.id_estado === 1 ? "confirmed" : r.id_estado === 2 ? "active" : r.id_estado === 3 ? "pending" : r.id_estado === 4 ? "cancelled" : r.id_estado === 5 ? "finished" : "unknown";
                const statusColors = { confirmed: C.success, active: C.blue, pending: C.warning, cancelled: C.danger, finished: C.textMuted };
                const sc = statusColors[statusKey] || C.textMuted;

                return (
                  <tr key={r.id_reserva} style={{ borderBottom: "1px solid rgba(161,0,255,0.08)", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(161,0,255,0.06)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: `${sc}15`, border: `1px solid ${sc}30`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14, color: sc, flexShrink: 0,
                        }}>
                          {Icons.map}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{r.Espacio?.tipo || "Espacio"}</div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>{r.Espacio?.codigo || ""}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: C.textMuted }}>{r.fecha_reserva}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: C.textMuted }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>{Icons.clock} {r.hora_inicio.slice(0,5)} - {r.hora_fin.slice(0,5)}</div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>{Icons.users} {r.asistentes}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <StatusBadge status={statusKey} />
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right"}}>
                      {(r.id_estado === 1 || r.id_estado === 3) && (
                        <button
                          onClick={() => setConfirmCancel(r.id_reserva)}
                          style={{ background: "rgba(255,50,50,0.1)", color: C.danger, border: `1px solid ${C.danger}40`, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all 0.2s", fontFamily: "inherit" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,50,50,0.2)"}
                          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,50,50,0.1)"}
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
