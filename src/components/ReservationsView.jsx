// src/components/ReservationsView.jsx
import React, { useState, useEffect } from "react";
import { C } from "../config/constants";
import { Icons } from "./ui/Icons";
import { BtnPrimary } from "./ui/Buttons";
import { StatusBadge } from "./ui/Widgets";
import ConfirmModal from "./ui/ConfirmModal";
import { supabase } from "../supabaseClient";
import { useUser } from "../context/UserContext";

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function ReservationsView({ animateIn, onGoToAreas }) {
  const [viewMode, setViewMode] = useState("calendar"); // "calendar" | "list"
  const [filter, setFilter] = useState("all");
  const [myReservations, setMyReservations] = useState([]);
  const [loadingRes, setLoadingRes] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [toast, setToast] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
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
        .select("*, Espacio (tipo, codigo)")
        .eq("id_usuario", userProfile.id_usuario)
        .order("fecha_solicitud", { ascending: false });
      if (error) throw error;
      setMyReservations(data || []);
    } catch (error) {
      console.error("Error cargando reservas:", error.message);
    } finally {
      setLoadingRes(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { if (userProfile) fetchReservas(); }, [userProfile]);

  const ejecutarCancelacion = async () => {
    if (!confirmCancel) return;
    setCancelling(true);
    try {
      const { data, error } = await supabase.rpc("cancelar_reserva", { p_id_reserva: confirmCancel });
      if (error) throw error;
      if (!data) throw new Error("La reserva no se pudo cancelar.");
      setConfirmCancel(null);
      showToast("Reserva cancelada correctamente.", "success");
      fetchReservas();
    } catch (e) {
      const msg = e.message?.includes("No autorizado") ? "No tienes permiso para cancelar esta reserva."
        : e.message?.includes("ya está") ? "La reserva ya esta cancelada o finalizada."
        : e.message || "Error desconocido al cancelar.";
      showToast(`No se pudo cancelar: ${msg}`, "error");
      setConfirmCancel(null);
    } finally { setCancelling(false); }
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

  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
  const proxima = myReservations
    .filter(r => (r.id_estado === 1 || r.id_estado === 2 || r.id_estado === 3) && r.fecha_reserva >= hoyStr)
    .sort((a, b) => a.fecha_reserva.localeCompare(b.fecha_reserva) || a.hora_inicio.localeCompare(b.hora_inicio))[0];

  // ── Calendar helpers ──
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const prevMonth = () => setCalendarDate(new Date(calYear, calMonth - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calYear, calMonth + 1, 1));
  const goToday = () => { setCalendarDate(new Date()); setSelectedDay(null); };

  // Map de fecha -> reservas
  const reservasPorDia = {};
  myReservations.forEach(r => {
    if (!reservasPorDia[r.fecha_reserva]) reservasPorDia[r.fecha_reserva] = [];
    reservasPorDia[r.fecha_reserva].push(r);
  });

  // Reservas del día seleccionado
  const selectedDayStr = selectedDay
    ? `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;
  const reservasDelDia = selectedDayStr ? (reservasPorDia[selectedDayStr] || []) : [];

  const statusKey = (r) => r.id_estado === 1 ? "confirmed" : r.id_estado === 2 ? "active" : r.id_estado === 3 ? "pending" : r.id_estado === 4 ? "cancelled" : r.id_estado === 5 ? "finished" : "unknown";
  const statusColors = { confirmed: C.success, active: C.blue, pending: C.warning, cancelled: C.danger, finished: C.textMuted };

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
          background: "linear-gradient(135deg, rgba(161,0,255,0.15) 0%, rgba(96,165,250,0.10) 100%)",
          border: `1px solid ${C.purple1}40`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${C.purple1}25`, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, color: C.purpleLight,
            }}>{Icons.map}</div>
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

      {/* ── View Mode Toggle ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4, marginBottom: 20,
        background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4, width: "fit-content",
      }}>
        <button onClick={() => setViewMode("calendar")} style={{
          padding: "10px 20px", borderRadius: 10, border: "none", fontSize: 14,
          fontWeight: viewMode === "calendar" ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
          color: viewMode === "calendar" ? "#fff" : C.textMuted,
          background: viewMode === "calendar" ? C.purple1 : "transparent",
          transition: "all 0.25s ease",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {Icons.calendar} Calendario
        </button>
        <button onClick={() => setViewMode("list")} style={{
          padding: "10px 20px", borderRadius: 10, border: "none", fontSize: 14,
          fontWeight: viewMode === "list" ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
          color: viewMode === "list" ? "#fff" : C.textMuted,
          background: viewMode === "list" ? C.purple1 : "transparent",
          transition: "all 0.25s ease",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          Lista
        </button>
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
          color: C.white, fontSize: 14, fontWeight: 600, animation: "fadeUp 0.3s ease forwards",
        }}>
          <span style={{ fontSize: 20 }}>{toast.type === "error" ? "⚠️" : "✅"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ═══════ CALENDAR VIEW ═══════ */}
      {viewMode === "calendar" && (
        <div style={{ display: "flex", gap: 20 }}>
          {/* Calendario */}
          <div style={{
            flex: 1, borderRadius: 16, overflow: "hidden",
            border: `1px solid ${C.glassBorder}`, background: C.glass,
            padding: 24,
          }}>
            {/* Nav del mes */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <button onClick={prevMonth} style={{
                width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.glassBorder}`,
                background: "rgba(255,255,255,0.05)", color: C.white, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                transition: "background 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(161,0,255,0.2)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              >‹</button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.white }}>{MESES[calMonth]}</div>
                <div style={{ fontSize: 13, color: C.textMuted }}>{calYear}</div>
              </div>
              <button onClick={nextMonth} style={{
                width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.glassBorder}`,
                background: "rgba(255,255,255,0.05)", color: C.white, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                transition: "background 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(161,0,255,0.2)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              >›</button>
            </div>

            {/* Botón hoy */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <button onClick={goToday} style={{
                padding: "5px 16px", borderRadius: 8, border: `1px solid ${C.purple1}40`,
                background: "rgba(161,0,255,0.08)", color: C.purpleLight, cursor: "pointer",
                fontSize: 12, fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s",
              }}>Hoy</button>
            </div>

            {/* Días de la semana header */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
              {DIAS_SEMANA.map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", padding: "4px 0" }}>{d}</div>
              ))}
            </div>

            {/* Días del mes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {/* Espacios vacíos antes del día 1 */}
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayReservas = reservasPorDia[dateStr] || [];
                const hasActive = dayReservas.some(r => r.id_estado === 1 || r.id_estado === 2 || r.id_estado === 3);
                const hasFinished = dayReservas.some(r => r.id_estado === 5);
                const hasCancelled = dayReservas.some(r => r.id_estado === 4);
                const isToday = dateStr === hoyStr;
                const isSelected = day === selectedDay;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    style={{
                      position: "relative", aspectRatio: "1", borderRadius: 12, border: "none",
                      background: isSelected ? C.purple1
                        : isToday ? "rgba(161,0,255,0.20)"
                        : dayReservas.length > 0 ? "rgba(255,255,255,0.04)"
                        : "transparent",
                      color: isSelected ? "#fff" : isToday ? C.purpleLight : C.white,
                      cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: isToday || isSelected ? 800 : 500,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s", gap: 3,
                      outline: isToday && !isSelected ? `2px solid ${C.purple1}` : "none",
                      outlineOffset: -2,
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(161,0,255,0.15)"; }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = isToday ? "rgba(161,0,255,0.20)" : dayReservas.length > 0 ? "rgba(255,255,255,0.04)" : "transparent";
                    }}
                  >
                    <span>{day}</span>
                    {/* Dots indicadores */}
                    {dayReservas.length > 0 && (
                      <div style={{ display: "flex", gap: 3 }}>
                        {hasActive && <span style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "#fff" : C.blue }} />}
                        {hasFinished && <span style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.5)" : C.success }} />}
                        {hasCancelled && <span style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.3)" : C.danger }} />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Leyenda */}
            <div style={{ display: "flex", gap: 16, marginTop: 16, justifyContent: "center" }}>
              {[{ l: "Activa", c: C.blue }, { l: "Finalizada", c: C.success }, { l: "Cancelada", c: C.danger }].map(({ l, c }) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textMuted }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />{l}
                </div>
              ))}
            </div>
          </div>

          {/* Panel lateral: detalle del día */}
          <div style={{
            width: 320, borderRadius: 16,
            border: `1px solid ${C.glassBorder}`, background: C.glass,
            padding: 24, display: "flex", flexDirection: "column",
          }}>
            {selectedDay ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>
                    {DIAS_SEMANA[new Date(calYear, calMonth, selectedDay).getDay()]}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: C.white }}>{selectedDay}</div>
                  <div style={{ fontSize: 14, color: C.textMuted }}>{MESES[calMonth]} {calYear}</div>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.1)", marginBottom: 16 }} />

                {reservasDelDia.length === 0 ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                    <div style={{ fontSize: 32, opacity: 0.2, marginBottom: 8 }}>{Icons.calendar}</div>
                    <p style={{ fontSize: 13, color: C.textMuted }}>Sin reservas este dia</p>
                    <BtnPrimary onClick={onGoToAreas} style={{ marginTop: 12, fontSize: 12 }}>{Icons.plus} Reservar</BtnPrimary>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", flex: 1 }}>
                    {reservasDelDia.map(r => {
                      const sk = statusKey(r);
                      const sc = statusColors[sk] || C.textMuted;
                      return (
                        <div key={r.id_reserva} style={{
                          borderRadius: 12, padding: "14px 16px",
                          background: `${sc}08`, border: `1px solid ${sc}25`,
                          transition: "transform 0.2s",
                        }}
                          onMouseEnter={e => e.currentTarget.style.transform = "translateX(4px)"}
                          onMouseLeave={e => e.currentTarget.style.transform = "none"}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{r.Espacio?.tipo || "Espacio"}</span>
                            <StatusBadge status={sk} />
                          </div>
                          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>{r.Espacio?.codigo}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: C.textMuted }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>{Icons.clock} {r.hora_inicio.slice(0,5)} - {r.hora_fin.slice(0,5)}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>{Icons.users} {r.asistentes}</span>
                          </div>
                          {(r.id_estado === 1 || r.id_estado === 3) && (
                            <button
                              onClick={() => setConfirmCancel(r.id_reserva)}
                              style={{
                                marginTop: 8, width: "100%", padding: "6px 0", borderRadius: 6,
                                background: "rgba(248,113,113,0.08)", color: C.danger,
                                border: `1px solid ${C.danger}30`, cursor: "pointer",
                                fontSize: 12, fontWeight: 700, fontFamily: "inherit", transition: "all 0.2s",
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.18)"}
                              onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
                            >Cancelar</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <div style={{ fontSize: 48, opacity: 0.15, marginBottom: 12 }}>{Icons.calendar}</div>
                <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 4 }}>Selecciona un dia</p>
                <p style={{ fontSize: 12, color: C.textMuted, opacity: 0.6 }}>Haz click en un dia del calendario para ver tus reservas</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ LIST VIEW ═══════ */}
      {viewMode === "list" && (
        <>
          {/* Filtros */}
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

          {/* Tabla */}
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
                    const sk = statusKey(r);
                    const sc = statusColors[sk] || C.textMuted;
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
                            }}>{Icons.map}</div>
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
                        <td style={{ padding: "14px 16px" }}><StatusBadge status={sk} /></td>
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          {(r.id_estado === 1 || r.id_estado === 3) && (
                            <button
                              onClick={() => setConfirmCancel(r.id_reserva)}
                              style={{ background: "rgba(255,50,50,0.1)", color: C.danger, border: `1px solid ${C.danger}40`, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all 0.2s", fontFamily: "inherit" }}
                              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,50,50,0.2)"}
                              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,50,50,0.1)"}
                            >Cancelar</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
