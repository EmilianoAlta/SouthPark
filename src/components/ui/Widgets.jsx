// src/components/ui/Widgets.jsx
// ═══════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════
import React from "react";
import { C } from "../../config/constants";
export const StatusBadge = ({ status }) => {
  const m = {
    confirmed: { l: "Confirmada", c: C.success, bg: "rgba(74,222,128,0.12)" },
    active: { l: "Activa", c: C.blue, bg: "rgba(96,165,250,0.12)" },
    pending: { l: "Pendiente", c: C.warning, bg: "rgba(251,191,36,0.12)" },
    cancelled: { l: "Cancelada", c: C.danger, bg: "rgba(248,113,113,0.12)" },
    available: { l: "Disponible", c: C.success, bg: "rgba(74,222,128,0.12)" },
    occupied: { l: "Ocupado", c: C.danger, bg: "rgba(248,113,113,0.12)" },
    maintenance: { l: "Mantenimiento", c: C.warning, bg: "rgba(251,191,36,0.12)" },
  };
  const s = m[status] || m.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: s.c, background: s.bg }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.c }} />{s.l}
    </span>
  );
};

export const PulseDot = ({ color = C.purple1 }) => (
  <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10 }}>
    <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: color, opacity: 0.4, animation: "pulse 2s ease-in-out infinite" }} />
    <span style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
  </span>
);

export const ConfidenceMeter = ({ value }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)" }}>
      <div style={{ height: "100%", borderRadius: 3, width: `${value}%`, background: value > 85 ? `linear-gradient(90deg, ${C.purple1}, ${C.success})` : value > 70 ? `linear-gradient(90deg, ${C.purple1}, ${C.warning})` : `linear-gradient(90deg, ${C.purple1}, ${C.danger})`, transition: "width 1s ease" }} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 700, color: C.text, minWidth: 36, textAlign: "right" }}>{value}%</span>
  </div>
);

export const XPBar = ({ current, max, height = 8 }) => (
  <div style={{ width: "100%", height, borderRadius: height / 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
    <div style={{ height: "100%", borderRadius: height / 2, width: `${(current / max) * 100}%`, background: `linear-gradient(90deg, ${C.purple1}, ${C.purpleLight})`, transition: "width 1.2s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: `0 0 12px ${C.purple1}40` }} />
  </div>
);