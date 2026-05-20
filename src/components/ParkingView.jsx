// src/components/ParkingView.jsx
// Vista de reservas de estacionamiento: mapa de cajones + reserva + timeline.
import React, { useState, useEffect, useCallback } from "react";
import { C } from "../config/constants";
import { Icons } from "./ui/Icons";
import { BtnPrimary } from "./ui/Buttons";
import { StatusBadge } from "./ui/Widgets";
import { supabase } from "../supabaseClient";
import { useUser } from "../context/UserContext";

const PARKING_CONFIG = {
  1: { label: "Sótano 3", img: "/floors/parking-s3.png" },
  2: { label: "Sótano 2", img: "/floors/parking-s2.png" },
  3: { label: "Sótano 1", img: "/floors/parking-s1.png" },
  4: { label: "Planta Baja T2", img: "/floors/parking-pb.png" },
  5: { label: "Nivel 1 T2", img: "/floors/parking-n1.png" },
  6: { label: "Nivel 2 T2", img: "/floors/parking-n2.png" },
  7: { label: "Azotea T2", img: "/floors/parking-azotea.png" },
};

export default function ParkingView({ animateIn, ShowFloatAlert }) {
  const { userProfile } = useUser();
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [cajones, setCajones] = useState([]);
  const [selectedCajon, setSelectedCajon] = useState(null);
  const [reserveModal, setReserveModal] = useState(null);
  const [cajonReservasHoy, setCajonReservasHoy] = useState([]);
  const [misReservas, setMisReservas] = useState([]);
  const [formReserva, setFormReserva] = useState({ fecha: "", horaInicio: "", horaFin: "" });
  const [reservando, setReservando] = useState(false);

  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const dd = String(hoy.getDate()).padStart(2, "0");
  const fechaHoyStr = `${yyyy}-${mm}-${dd}`;
  const hh = String(hoy.getHours()).padStart(2, "0");
  const min = String(hoy.getMinutes()).padStart(2, "0");
  const horaActualStr = `${hh}:${min}:00`;

  // ── Fetch cajones con reservas ──
  const fetchCajones = useCallback(async () => {
    // Primero obtener id_zona_est del nivel
    const { data: zona } = await supabase
      .from("ZonaEstacionamiento")
      .select("id_zona_est")
      .eq("nivel", selectedLevel)
      .limit(1)
      .single();

    if (!zona) { setCajones([]); return; }

    const { data, error } = await supabase
      .from("Cajon")
      .select("*, ZonaEstacionamiento(nivel, nombre_nivel), ReservaEstacionamiento(id_reserva_est, id_estado, fecha_reserva, hora_inicio, hora_fin, id_usuario)")
      .eq("id_zona_est", zona.id_zona_est);

    if (!error && data) setCajones(data);
    else if (error) console.error("Error cargando cajones:", error);
  }, [selectedLevel]);

  useEffect(() => { fetchCajones(); }, [fetchCajones]);

  // ── Fetch reservas del cajón seleccionado hoy ──
  useEffect(() => {
    if (!selectedCajon) { setCajonReservasHoy([]); return; }
    supabase.from("ReservaEstacionamiento")
      .select("hora_inicio, hora_fin, id_estado, id_usuario, Usuario(nombre, primer_apellido)")
      .eq("id_cajon", selectedCajon.dbId)
      .eq("fecha_reserva", fechaHoyStr)
      .in("id_estado", [1, 2, 3])
      .order("hora_inicio")
      .then(({ data }) => setCajonReservasHoy(data || []));
  }, [selectedCajon, fechaHoyStr]);

  // ── Fetch mis reservas de estacionamiento ──
  const fetchMisReservas = useCallback(async () => {
    if (!userProfile) return;
    const { data } = await supabase.from("ReservaEstacionamiento")
      .select("*, Cajon(codigo, tipo, ZonaEstacionamiento(nombre_nivel))")
      .eq("id_usuario", userProfile.id_usuario)
      .in("id_estado", [1, 2, 3])
      .order("fecha_reserva", { ascending: true });
    setMisReservas(data || []);
  }, [userProfile]);

  useEffect(() => { fetchMisReservas(); }, [fetchMisReservas]);

  // ── Realtime ──
  useEffect(() => {
    const channel = supabase
      .channel("parking-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ReservaEstacionamiento" },
        () => { fetchCajones(); fetchMisReservas(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "Cajon" },
        () => fetchCajones())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchCajones, fetchMisReservas]);

  // ── Map cajones to areas ──
  const parkingAreas = cajones.map(c => ({
    id: c.codigo,
    dbId: c.id_cajon,
    name: c.codigo,
    x: Number(c.coord_x ?? 5),
    y: Number(c.coord_y ?? 5),
    w: Number(c.ancho ?? 3),
    h: Number(c.alto ?? 3),
    type: c.tipo || "Normal",
    status: c.estado || "disponible",
    reservas: c.ReservaEstacionamiento || [],
  }));

  // ── Status color ──
  const getStatus = (area) => {
    if (area.status === "mantenimiento") return "maintenance";
    const reservasActivas = area.reservas.filter(r =>
      (r.id_estado === 1 || r.id_estado === 2 || r.id_estado === 3) &&
      r.fecha_reserva === fechaHoyStr &&
      horaActualStr >= r.hora_inicio && horaActualStr < r.hora_fin
    );
    return reservasActivas.length > 0 ? "occupied" : "available";
  };

  const statusColor = (s) => s === "available" ? C.success : s === "occupied" ? C.danger : C.warning;

  // ── Reservar ──
  const handleReservar = async () => {
    if (!formReserva.fecha || !formReserva.horaInicio || !formReserva.horaFin) {
      ShowFloatAlert("Completa todos los campos.", "error"); return;
    }
    if (formReserva.horaInicio >= formReserva.horaFin) {
      ShowFloatAlert("La hora de fin debe ser mayor a la de inicio.", "error"); return;
    }

    setReservando(true);
    try {
      // Verificar disponibilidad
      const { data: existentes } = await supabase.from("ReservaEstacionamiento")
        .select("hora_inicio, hora_fin")
        .eq("id_cajon", reserveModal.dbId)
        .eq("fecha_reserva", formReserva.fecha)
        .in("id_estado", [1, 2, 3]);

      const horaIni = formReserva.horaInicio + ":00";
      const horaFin = formReserva.horaFin + ":00";

      const conflicto = (existentes || []).some(r =>
        horaIni < r.hora_fin && horaFin > r.hora_inicio
      );

      if (conflicto) {
        ShowFloatAlert("El cajón ya está reservado en ese horario.", "error");
        setReservando(false); return;
      }

      const { error } = await supabase.from("ReservaEstacionamiento").insert({
        id_usuario: userProfile.id_usuario,
        id_cajon: reserveModal.dbId,
        fecha_reserva: formReserva.fecha,
        hora_inicio: horaIni,
        hora_fin: horaFin,
        id_estado: 1,
      });

      if (error) throw error;
      ShowFloatAlert(`Cajón ${reserveModal.name} reservado exitosamente.`, "success");
      setReserveModal(null);
      fetchCajones();
      fetchMisReservas();
    } catch (e) {
      ShowFloatAlert(`Error: ${e.message}`, "error");
    } finally {
      setReservando(false);
    }
  };

  // ── Cancelar reserva ──
  const handleCancelar = async (idReserva) => {
    if (!window.confirm("¿Cancelar esta reserva de estacionamiento?")) return;
    const { error } = await supabase.from("ReservaEstacionamiento")
      .update({ id_estado: 4 })
      .eq("id_reserva_est", idReserva);
    if (error) ShowFloatAlert("Error al cancelar.", "error");
    else { ShowFloatAlert("Reserva cancelada.", "success"); fetchCajones(); fetchMisReservas(); }
  };

  const estadoMap = { 1: "confirmed", 2: "active", 3: "pending", 4: "cancelled", 5: "finished" };

  return (
    <div style={{ opacity: animateIn ? 1 : 0, transform: animateIn ? "none" : "translateY(20px)", transition: "all 0.5s cubic-bezier(0.22,1,0.36,1)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Estacionamiento</h1>
          <p style={{ fontSize: 14, color: C.textMuted }}>Reserva tu cajón — {fechaHoyStr} | {horaActualStr.slice(0, 5)}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: C.textMuted }}>Nivel</span>
          <select value={selectedLevel} onChange={e => setSelectedLevel(+e.target.value)} style={{
            padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.glassBorder}`,
            background: "rgba(161,0,255,0.12)", color: C.text, fontSize: 14, fontFamily: "inherit", cursor: "pointer",
          }}>
            {Object.entries(PARKING_CONFIG).map(([f, cfg]) => (
              <option key={f} value={f} style={{ background: "#1a0a1e" }}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mis reservas activas */}
      {misReservas.length > 0 && (
        <div style={{
          borderRadius: 14, padding: 16, marginBottom: 20,
          background: `linear-gradient(135deg, ${C.purple1}12, ${C.purpleLight}08)`,
          border: `1px solid ${C.glassBorder}`,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Mis Reservas Activas</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {misReservas.map(r => (
              <div key={r.id_reserva_est} style={{
                padding: "10px 16px", borderRadius: 10, background: "rgba(0,0,0,0.3)",
                border: `1px solid ${C.glassBorder}`, display: "flex", alignItems: "center", gap: 12, fontSize: 13,
              }}>
                <div>
                  <span style={{ fontWeight: 700, color: "#fff" }}>{r.Cajon?.codigo || "—"}</span>
                  <span style={{ color: C.textMuted, marginLeft: 8 }}>{r.fecha_reserva}</span>
                  <span style={{ color: C.textMuted, marginLeft: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                    {String(r.hora_inicio).slice(0, 5)}-{String(r.hora_fin).slice(0, 5)}
                  </span>
                </div>
                <button onClick={() => handleCancelar(r.id_reserva_est)} style={{
                  padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.danger}40`,
                  background: "rgba(248,113,113,0.1)", color: C.danger, fontSize: 11, cursor: "pointer",
                  fontWeight: 700, fontFamily: "inherit",
                }}>Cancelar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 24 }}>
        {/* Mapa */}
        <div style={{ flex: 1, borderRadius: 16, border: `2px solid ${C.glassBorder}`, background: "#000", padding: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 16, left: 20, fontSize: 12, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", zIndex: 2 }}>
            {PARKING_CONFIG[selectedLevel]?.label}
          </div>
          <svg viewBox="0 0 100 71" style={{ width: "100%", height: "auto" }}>
            {PARKING_CONFIG[selectedLevel]?.img && (
              <image href={PARKING_CONFIG[selectedLevel].img} x="0" y="0" width="100" height="71" preserveAspectRatio="xMidYMid meet" style={{ opacity: 0.85 }} />
            )}

            {parkingAreas.map(area => {
              const boxStatus = getStatus(area);
              return (
                <g key={area.id} onClick={() => setSelectedCajon(area)} style={{ cursor: "pointer" }}>
                  <rect x={area.x} y={area.y} width={area.w} height={area.h} rx="0.5"
                    fill={selectedCajon?.id === area.id ? `${statusColor(boxStatus)}50` : `${statusColor(boxStatus)}25`}
                    stroke={selectedCajon?.id === area.id ? statusColor(boxStatus) : `${statusColor(boxStatus)}90`}
                    strokeWidth={selectedCajon?.id === area.id ? "0.5" : "0.25"}
                    style={{ transition: "all 0.3s" }}
                  />
                  {area.w > 3 && (
                    <text x={Number(area.x) + Number(area.w) / 2} y={Number(area.y) + Number(area.h) / 2 + 0.5}
                      textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={Math.min(1.2, area.w / 4)}
                      style={{ pointerEvents: "none" }}>{area.name}</text>
                  )}
                </g>
              );
            })}
          </svg>

          <div style={{ display: "flex", gap: 20, marginTop: 16, justifyContent: "center" }}>
            {[{ l: "Disponible", c: C.success }, { l: "Ocupado", c: C.danger }, { l: "Mantenimiento", c: C.warning }].map(({ l, c }) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textMuted }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: `${c}30`, border: `1px solid ${c}` }} />{l}
              </div>
            ))}
          </div>
        </div>

        {/* Panel lateral */}
        <div style={{ width: 300, borderRadius: 16, background: C.cardDark, padding: 24, border: `1px solid ${C.glassBorder}`, display: "flex", flexDirection: "column" }}>
          {selectedCajon ? (
            <>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Cajón {selectedCajon.name}</h3>
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>{selectedCajon.type}</p>
              <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>{PARKING_CONFIG[selectedLevel]?.label}</p>

              <StatusBadge status={getStatus(selectedCajon) === "occupied" ? "occupied" : getStatus(selectedCajon) === "maintenance" ? "maintenance" : "available"} />

              <div style={{ margin: "20px 0", height: 1, background: "rgba(255,255,255,0.1)" }} />

              {/* Timeline de reservas hoy */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Reservas hoy</span>
                {cajonReservasHoy.length === 0 ? (
                  <p style={{ fontSize: 12, color: C.textMuted, marginTop: 8, opacity: 0.6 }}>Sin reservas hoy</p>
                ) : (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {cajonReservasHoy.map((r, i) => {
                      const activa = horaActualStr >= r.hora_inicio && horaActualStr < r.hora_fin;
                      return (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                          borderRadius: 8, background: activa ? "rgba(248,113,113,0.12)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${activa ? C.danger + "40" : "transparent"}`,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: activa ? C.danger : C.blue, boxShadow: activa ? `0 0 8px ${C.danger}` : "none" }} />
                          <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: activa ? C.danger : C.textMuted }}>
                            {String(r.hora_inicio).slice(0, 5)} - {String(r.hora_fin).slice(0, 5)}
                          </span>
                          {r.Usuario && <span style={{ fontSize: 10, color: C.textMuted, marginLeft: "auto" }}>{r.Usuario.nombre}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }} />

              {getStatus(selectedCajon) !== "maintenance" && (
                <BtnPrimary onClick={() => {
                  setReserveModal(selectedCajon);
                  setFormReserva({ fecha: fechaHoyStr, horaInicio: "", horaFin: "" });
                }} style={{ width: "100%", marginTop: 20 }}>Reservar Cajón</BtnPrimary>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: C.textMuted }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="22" height="18" rx="2"/><path d="M1 9h22M8 3v18M16 3v18"/></svg>
              </div>
              <p style={{ fontSize: 14, marginBottom: 6 }}>Selecciona un cajón</p>
              <p style={{ fontSize: 12, opacity: 0.6 }}>Haz click en un cajón del mapa para ver detalles y reservar.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de reserva ── */}
      {reserveModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
          display: "flex", justifyContent: "center", alignItems: "center",
        }} onClick={() => setReserveModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "linear-gradient(180deg, #2a1035, #1a0a1e)", borderRadius: 20,
            padding: 32, width: 420, maxWidth: "90vw", border: `1px solid ${C.glassBorder}`,
            boxShadow: `0 24px 80px rgba(0,0,0,0.6)`,
          }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Reservar Cajón</h2>
            <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24 }}>{reserveModal.name} — {reserveModal.type}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 4, display: "block" }}>Fecha</span>
                <input type="date" value={formReserva.fecha} min={fechaHoyStr}
                  onChange={e => setFormReserva({ ...formReserva, fecha: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.3)", borderRadius: 8, border: `1px solid ${C.glassBorder}`, color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 4, display: "block" }}>Hora Inicio</span>
                  <input type="time" value={formReserva.horaInicio}
                    onChange={e => setFormReserva({ ...formReserva, horaInicio: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.3)", borderRadius: 8, border: `1px solid ${C.glassBorder}`, color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 4, display: "block" }}>Hora Fin</span>
                  <input type="time" value={formReserva.horaFin}
                    onChange={e => setFormReserva({ ...formReserva, horaFin: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.3)", borderRadius: 8, border: `1px solid ${C.glassBorder}`, color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <button onClick={() => setReserveModal(null)} style={{
                flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.glassBorder}`,
                background: "transparent", color: C.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>Cancelar</button>
              <BtnPrimary onClick={handleReservar} style={{ flex: 1, opacity: reservando ? 0.6 : 1 }} disabled={reservando}>
                {reservando ? "Reservando..." : "Confirmar"}
              </BtnPrimary>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
