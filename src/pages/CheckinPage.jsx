// src/pages/CheckinPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useUser } from "../context/UserContext";
import { C } from "../config/constants";
import { Logo } from "../components/ui/Icons";
import { StatusBadge } from "../components/ui/Widgets";
import ConfirmModal from "../components/ui/ConfirmModal";

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
const fmt = (t) => (t ? String(t).slice(0, 5) : "--:--");

const getCheckinWindowInfo = (reserva) => {
  if (!reserva || reserva.id_estado !== 3) return { dentro: false, falta: null };

  const ahora = new Date();
  const [ih, im] = reserva.hora_inicio.split(":").map(Number);

  const inicio = new Date(ahora);
  inicio.setHours(ih, im, 0, 0);

  const limite = new Date(inicio.getTime() + 10 * 60 * 1000);

  if (ahora < inicio) {
    const diffMs = inicio - ahora;
    const diffMin = Math.ceil(diffMs / 60000);
    return { dentro: false, falta: `${diffMin} min` };
  }
  if (ahora > limite) {
    return { dentro: false, falta: null, expirada: true };
  }
  return { dentro: true };
};

// ────────────────────────────────────────────────────────────────────────────
// Estilos inline reutilizables
// ────────────────────────────────────────────────────────────────────────────
const card = {
  background: "rgba(161,0,255,0.08)",
  border: `1px solid rgba(161,0,255,0.25)`,
  borderRadius: 20,
  padding: "32px 36px",
  maxWidth: 480,
  width: "100%",
};

const btn = (bg, color, disabled) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
  padding: "14px 0",
  borderRadius: 12,
  border: "none",
  fontSize: 15,
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: "inherit",
  background: disabled ? "rgba(255,255,255,0.08)" : bg,
  color: disabled ? "rgba(255,255,255,0.3)" : color,
  transition: "opacity 0.2s",
  opacity: disabled ? 0.6 : 1,
});

// ────────────────────────────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────────────────────────────
export default function CheckinPage({ onBackToApp }) {
  const { userProfile } = useUser();

  const [reserva, setReserva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { tipo: "checkin"|"checkout"|"cancelar" }
  const [now, setNow] = useState(new Date());

  // Reloj interno para actualizar la ventana de check-in en tiempo real
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ── fetch ──────────────────────────────────────────────────────────────
  const fetchProxima = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("proxima_reserva");
      if (error) throw error;
      setReserva(data?.[0] ?? null);
    } catch (e) {
      console.error("Error cargando reserva:", e);
      showToast("No se pudo cargar la reserva.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userProfile) fetchProxima();
  }, [userProfile, fetchProxima]);

  // ── realtime ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userProfile) return;
    const ch = supabase
      .channel("checkin-reserva")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Reserva" },
        () => fetchProxima()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [userProfile, fetchProxima]);

  // ── acciones ───────────────────────────────────────────────────────────
  const handleCheckin = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("confirmar_checkin", {
        p_id_reserva: reserva.id_reserva,
      });
      if (error) throw error;
      showToast("¡Check-in confirmado! Bienvenido al espacio.", "success");
      fetchProxima();
    } catch (e) {
      const msg = e.message?.includes("Todavía no")
        ? e.message
        : e.message?.includes("expiró")
        ? "La ventana de check-in ya expiró."
        : e.message?.includes("pendiente")
        ? "Esta reserva ya no está pendiente."
        : "No se pudo confirmar el check-in.";
      showToast(msg, "error");
    } finally {
      setBusy(false);
      setConfirmModal(null);
    }
  };

  const handleCheckout = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("finalizar_checkout", {
        p_id_reserva: reserva.id_reserva,
      });
      if (error) throw error;
      showToast("¡Check-out realizado! +10 puntos de gamificación.", "success");
      fetchProxima();
    } catch (e) {
      showToast("No se pudo registrar el check-out.", "error");
    } finally {
      setBusy(false);
      setConfirmModal(null);
    }
  };

  const handleCancelar = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("cancelar_reserva", {
        p_id_reserva: reserva.id_reserva,
      });
      if (error) throw error;
      showToast("Reserva cancelada.", "success");
      fetchProxima();
    } catch (e) {
      showToast("No se pudo cancelar la reserva.", "error");
    } finally {
      setBusy(false);
      setConfirmModal(null);
    }
  };

  const onConfirmModal = () => {
    if (confirmModal?.tipo === "checkin") return handleCheckin();
    if (confirmModal?.tipo === "checkout") return handleCheckout();
    if (confirmModal?.tipo === "cancelar") return handleCancelar();
  };

  // ── window info ────────────────────────────────────────────────────────
  const windowInfo = reserva ? getCheckinWindowInfo(reserva) : null;

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a0a1e",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Nunito Sans', sans-serif",
        color: C.text,
      }}
    >
      {/* Header */}
      <header
        style={{
          background: C.headerBg,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          borderBottom: `1px solid ${C.glassBorder}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Logo size={40} />
          <span style={{ fontWeight: 800, fontSize: 17 }}>WorkSpace · Check-in</span>
        </div>
        <button
          onClick={onBackToApp}
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            color: C.text,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ← Ir al Dashboard
        </button>
      </header>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
        }}
      >
        {loading ? (
          <div style={{ color: C.purple1, fontSize: 16 }}>Cargando tu reserva...</div>
        ) : !reserva ? (
          <EmptyState onBack={onBackToApp} />
        ) : (
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Título */}
            <div>
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>
                Tu próxima reserva
              </p>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
                {reserva.espacio_codigo}
              </h2>
              <p style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
                {reserva.espacio_tipo} · {reserva.zona_nombre} (Piso {reserva.zona_piso})
              </p>
            </div>

            {/* Info grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <InfoCell label="Fecha" value={reserva.fecha_reserva} />
              <InfoCell
                label="Horario"
                value={`${fmt(reserva.hora_inicio)} – ${fmt(reserva.hora_fin)}`}
              />
              <InfoCell label="Asistentes" value={`${reserva.asistentes} persona(s)`} />
              <InfoCell
                label="Estado"
                value={
                  <StatusBadge
                    status={
                      reserva.id_estado === 2
                        ? "active"
                        : reserva.id_estado === 3
                        ? "pending"
                        : "finished"
                    }
                  />
                }
              />
            </div>

            {/* Ventana de check-in (solo si pendiente) */}
            {reserva.id_estado === 3 && windowInfo && (
              <CheckinWindowBanner windowInfo={windowInfo} horaInicio={reserva.hora_inicio} />
            )}

            {/* Botones */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Check-in: solo si pendiente */}
              {reserva.id_estado === 3 && (
                <button
                  style={btn(`linear-gradient(90deg, ${C.purple1}, ${C.purpleLight})`, C.white, !windowInfo?.dentro || busy)}
                  disabled={!windowInfo?.dentro || busy}
                  onClick={() => setConfirmModal({ tipo: "checkin" })}
                >
                  ✅ Confirmar Check-in
                </button>
              )}

              {/* Checkout: solo si activa */}
              {reserva.id_estado === 2 && (
                <button
                  style={btn(`linear-gradient(90deg, ${C.blue}, #7dd3fc)`, "#0c1a2e", busy)}
                  disabled={busy}
                  onClick={() => setConfirmModal({ tipo: "checkout" })}
                >
                  🚪 Finalizar Check-out
                </button>
              )}

              {/* Cancelar: solo si pendiente */}
              {reserva.id_estado === 3 && (
                <button
                  style={btn("rgba(248,113,113,0.15)", C.danger, busy)}
                  disabled={busy}
                  onClick={() => setConfirmModal({ tipo: "cancelar" })}
                >
                  Cancelar reserva
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal confirmación */}
      <ConfirmModal
        open={confirmModal !== null}
        title={
          confirmModal?.tipo === "checkin"
            ? "Confirmar Check-in"
            : confirmModal?.tipo === "checkout"
            ? "Finalizar Check-out"
            : "Cancelar reserva"
        }
        message={
          confirmModal?.tipo === "checkin"
            ? "¿Confirmas tu llegada al espacio? Se marcará como activa."
            : confirmModal?.tipo === "checkout"
            ? "¿Deseas finalizar el uso del espacio? Ganarás 10 puntos."
            : "¿Seguro que deseas cancelar esta reservación?"
        }
        confirmText={
          confirmModal?.tipo === "checkin"
            ? "Sí, hacer check-in"
            : confirmModal?.tipo === "checkout"
            ? "Sí, finalizar"
            : "Sí, cancelar"
        }
        cancelText="Volver"
        danger={confirmModal?.tipo === "cancelar"}
        busy={busy}
        onConfirm={onConfirmModal}
        onCancel={() => !busy && setConfirmModal(null)}
      />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 40,
            right: 40,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 24px",
            borderRadius: 16,
            background: C.cardDark,
            border: `1px solid ${toast.type === "error" ? C.danger : C.success}`,
            boxShadow: `0 10px 40px ${toast.type === "error" ? C.danger : C.success}40`,
            color: C.white,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 20 }}>{toast.type === "error" ? "⚠️" : "✅"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ────────────────────────────────────────────────────────────────────────────
function InfoCell({ label, value }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: 10,
        padding: "12px 16px",
      }}
    >
      <p style={{ fontSize: 11, color: C.textMuted, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </p>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function CheckinWindowBanner({ windowInfo, horaInicio }) {
  if (windowInfo.dentro) {
    return (
      <div
        style={{
          background: "rgba(74,222,128,0.1)",
          border: `1px solid ${C.success}40`,
          borderRadius: 10,
          padding: "12px 16px",
          fontSize: 13,
          color: C.success,
          fontWeight: 600,
        }}
      >
        ✅ Ventana de check-in abierta · puedes confirmar tu llegada ahora
      </div>
    );
  }
  if (windowInfo.expirada) {
    return (
      <div
        style={{
          background: "rgba(248,113,113,0.1)",
          border: `1px solid ${C.danger}40`,
          borderRadius: 10,
          padding: "12px 16px",
          fontSize: 13,
          color: C.danger,
          fontWeight: 600,
        }}
      >
        ⛔ La ventana de check-in expiró (10 min desde las {String(horaInicio).slice(0, 5)})
      </div>
    );
  }
  return (
    <div
      style={{
        background: "rgba(251,191,36,0.1)",
        border: `1px solid ${C.warning}40`,
        borderRadius: 10,
        padding: "12px 16px",
        fontSize: 13,
        color: C.warning,
        fontWeight: 600,
      }}
    >
      ⏳ El check-in abre en {windowInfo.falta} (a las {String(horaInicio).slice(0, 5)})
    </div>
  );
}

function EmptyState({ onBack }) {
  return (
    <div style={{ textAlign: "center", maxWidth: 360 }}>
      <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.4 }}>📅</div>
      <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>
        Sin reservas próximas
      </h2>
      <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 24 }}>
        No tienes reservas pendientes o activas para hoy o días futuros.
      </p>
      <button
        onClick={onBack}
        style={{
          background: `linear-gradient(90deg, ${C.purple1}, ${C.purpleLight})`,
          border: "none",
          borderRadius: 10,
          padding: "12px 28px",
          color: C.white,
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Hacer una reservación
      </button>
    </div>
  );
}
