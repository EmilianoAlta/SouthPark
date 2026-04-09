import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════
// CONSTANTS & DATA
// ═══════════════════════════════════════════
const C = {
  purple1: "#A100FF", purple2: "#8141AA", purple3: "#B257ED", purple4: "#9B46A0",
  purple5: "#38193A", purple6: "#6B2D8B", purpleLight: "#C850FF", purplePale: "#E8D0F0",
  pink: "#F6AFFA", pinkDark: "#AE71B1", pinkLight: "#FDD6FF",
  bg: "linear-gradient(180deg, #FDD6FF 0%, #B34CB8 100%)",
  headerBg: "radial-gradient(50% 1116% at 50% 50%, #8141AA 0%, #B257ED 100%)",
  cardDark: "linear-gradient(180deg, #9B46A0 0%, #38193A 100%)",
  cardMid: "linear-gradient(180deg, #ECB9F3 0%, #B539C6 100%)",
  cardLight: "linear-gradient(180deg, #F6AFFA 0%, #E493E9 100%)",
  text: "#FFF8F8", textMuted: "rgba(255,248,248,0.6)", white: "#FFFFFF",
  success: "#4ADE80", warning: "#FBBF24", danger: "#F87171", blue: "#60A5FA",
  glass: "rgba(161,0,255,0.08)", glassBorder: "rgba(161,0,255,0.2)",
};

const reservations = [
  { id: 1, space: "Sala Innovación A", floor: "Piso 3", date: "2026-03-09", time: "09:00 - 11:00", status: "confirmed", capacity: 12, attendees: 8, type: "meeting" },
  { id: 2, space: "Hot Desk B-14", floor: "Piso 2", date: "2026-03-09", time: "08:00 - 18:00", status: "active", capacity: 1, attendees: 1, type: "desk" },
  { id: 3, space: "Sala Colaboración C", floor: "Piso 5", date: "2026-03-10", time: "14:00 - 16:00", status: "pending", capacity: 8, attendees: 5, type: "meeting" },
  { id: 4, space: "Zona Creativa D", floor: "Piso 1", date: "2026-03-10", time: "10:00 - 12:00", status: "confirmed", capacity: 20, attendees: 15, type: "event" },
  { id: 5, space: "Hot Desk A-07", floor: "Piso 4", date: "2026-03-11", time: "08:00 - 14:00", status: "confirmed", capacity: 1, attendees: 1, type: "desk" },
  { id: 6, space: "Sala Ejecutiva E", floor: "Piso 6", date: "2026-03-11", time: "11:00 - 12:30", status: "cancelled", capacity: 6, attendees: 0, type: "meeting" },
  { id: 7, space: "Auditorio Principal", floor: "Piso 1", date: "2026-03-12", time: "15:00 - 17:00", status: "pending", capacity: 50, attendees: 35, type: "event" },
  { id: 8, space: "Sala Focus F", floor: "Piso 3", date: "2026-03-12", time: "09:00 - 10:30", status: "confirmed", capacity: 4, attendees: 3, type: "meeting" },
];

const aiRecommendations = [
  { id: 1, title: "Sala Innovación A — Martes 10:00", reason: "Basado en tus últimas 12 reuniones, prefieres salas de 8-12 personas los martes por la mañana. Esta sala tiene 94% de satisfacción entre usuarios similares.", confidence: 94, type: "pattern", tags: ["Alta demanda", "Tu horario preferido"] },
  { id: 2, title: "Hot Desk B-22 — Jueves todo el día", reason: "Tu productividad aumenta 23% cuando usas escritorios en Piso 2 cerca de ventanas. B-22 tiene luz natural óptima y está disponible.", confidence: 87, type: "optimization", tags: ["Productividad", "Luz natural"] },
  { id: 3, title: "Zona Creativa D — Miércoles 14:00", reason: "Detectamos que tu equipo (5 personas) tiene reuniones recurrentes los miércoles. Esta zona flexible se adapta mejor que las salas cerradas.", confidence: 91, type: "team", tags: ["Equipo", "Espacio flexible"] },
  { id: 4, title: "Cambiar Sala Focus F → Sala G", reason: "La Sala F tiene problemas de conectividad reportados. La Sala G ofrece el mismo aforo con mejor equipamiento tecnológico.", confidence: 78, type: "alert", tags: ["Optimización", "Conectividad"] },
];

const floorAreas = [
  { id: "area1", name: "Area 1", x: 5, y: 8, w: 22, h: 18, capacity: 8, floor: 1, status: "available", type: "Sala de Juntas" },
  { id: "area2", name: "Area 2", x: 30, y: 8, w: 18, h: 18, capacity: 6, floor: 1, status: "occupied", type: "Sala Privada" },
  { id: "area3", name: "Area 3", x: 52, y: 8, w: 20, h: 18, capacity: 4, floor: 1, status: "available", type: "Oficina" },
  { id: "area4", name: "Area 4", x: 76, y: 8, w: 20, h: 18, capacity: 10, floor: 1, status: "available", type: "Sala Conferencias" },
  { id: "area5", name: "Area 5", x: 8, y: 30, w: 25, h: 20, capacity: 24, floor: 1, status: "occupied", type: "Open Space" },
  { id: "area6", name: "Area 6", x: 38, y: 30, w: 22, h: 20, capacity: 12, floor: 1, status: "available", type: "Colaboración" },
  { id: "area7", name: "Area 7", x: 65, y: 30, w: 28, h: 20, capacity: 16, floor: 1, status: "maintenance", type: "Open Space" },
  { id: "area8", name: "Area 8", x: 10, y: 55, w: 30, h: 22, capacity: 32, floor: 1, status: "available", type: "Open Space" },
  { id: "area9", name: "Area 9", x: 45, y: 55, w: 20, h: 22, capacity: 8, floor: 1, status: "occupied", type: "Zona Creativa" },
  { id: "area10", name: "Area 10", x: 70, y: 55, w: 24, h: 22, capacity: 20, floor: 1, status: "available", type: "Hot Desks" },
];

const gamificationData = {
  level: 12, xp: 2840, nextLevelXp: 3500, rank: "Reservador Experto",
  streak: 7, totalReservations: 89, punctuality: 96,
  badges: [
    { id: 1, name: "Primer Paso", desc: "Primera reservación completada", icon: "🎯", earned: true },
    { id: 2, name: "Madrugador", desc: "10 reservaciones antes de las 9AM", icon: "🌅", earned: true },
    { id: 3, name: "Colaborador", desc: "Reservar 20 salas de equipo", icon: "🤝", earned: true },
    { id: 4, name: "Puntual", desc: "95% de puntualidad en 50 reservaciones", icon: "⏰", earned: true },
    { id: 5, name: "Explorador", desc: "Usar 15 espacios diferentes", icon: "🗺️", earned: true },
    { id: 6, name: "Racha Semanal", desc: "7 días consecutivos reservando", icon: "🔥", earned: true },
    { id: 7, name: "Favorito", desc: "Recibir 10 valoraciones positivas", icon: "⭐", earned: false },
    { id: 8, name: "Sustentable", desc: "Cancelar 0 reservaciones en un mes", icon: "🌿", earned: false },
    { id: 9, name: "Líder", desc: "Alcanzar nivel 15", icon: "👑", earned: false },
  ],
  leaderboard: [
    { rank: 1, name: "CarlosM", xp: 4200, avatar: "CM" },
    { rank: 2, name: "AnaLópez", xp: 3800, avatar: "AL" },
    { rank: 3, name: "MariaGtz23", xp: 2840, avatar: "MG", isUser: true },
    { rank: 4, name: "PedroR", xp: 2650, avatar: "PR" },
    { rank: 5, name: "LuisaF", xp: 2400, avatar: "LF" },
  ],
  weeklyChallenge: { title: "Reserva 3 espacios nuevos", progress: 1, target: 3, reward: 200 },
};

// ═══════════════════════════════════════════
// SVG ICONS
// ═══════════════════════════════════════════
// ─────────────────────────────────────────────────────────────────────────────
// LOGO — Para cambiar el logo pon tu archivo PNG en:
//   SuothPark/public/logo.png        (versión clara, para fondos oscuros)
//   SuothPark/public/logo-dark.png   (versión oscura, para fondos claros) [opcional]
// ─────────────────────────────────────────────────────────────────────────────
const Logo = ({ size = 40 }) => (
  <img src="/logo.png" alt="Logo" style={{ height: size * 0.6, width: "auto", objectFit: "contain", display: "block" }} />
);

const LogoPurple = ({ size = 40 }) => (
  <img src="/logo-dark.png" alt="Logo" style={{ height: size * 0.6, width: "auto", objectFit: "contain", display: "block" }}
    onError={e => { e.target.onerror = null; e.target.src = "/logo.png"; }} />
);

const Icons = {
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  sparkle: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
    </svg>
  ),
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  map: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  ),
  trophy: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/>
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  pin: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  brain: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a6 6 0 016 6c0 2.5-1.5 4.5-3 5.5V16a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2.5C7.5 12.5 6 10.5 6 8a6 6 0 016-6z"/><line x1="10" y1="22" x2="14" y2="22"/><line x1="10" y1="20" x2="14" y2="20"/>
    </svg>
  ),
  trendUp: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  alert: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  chevron: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  plus: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  eye: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  eyeOff: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
  edit: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  logout: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  fire: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>
    </svg>
  ),
  star: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
};

// ═══════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════
const StatusBadge = ({ status }) => {
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

const PulseDot = ({ color = C.purple1 }) => (
  <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10 }}>
    <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: color, opacity: 0.4, animation: "pulse 2s ease-in-out infinite" }} />
    <span style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
  </span>
);

const BtnPrimary = ({ children, onClick, style = {}, disabled = false }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "12px 32px", borderRadius: 8, border: "none",
    background: C.purple1, color: "#fff", fontSize: 14, fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
    textTransform: "uppercase", letterSpacing: "0.05em",
    boxShadow: "0 4px 20px rgba(161,0,255,0.3)",
    opacity: disabled ? 0.5 : 1, transition: "all 0.2s", ...style,
  }}>{children}</button>
);

const BtnSecondary = ({ children, onClick, style = {} }) => (
  <button onClick={onClick} style={{
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "12px 32px", borderRadius: 8,
    border: `1px solid ${C.glassBorder}`, background: "rgba(255,255,255,0.05)",
    color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    transition: "all 0.2s", ...style,
  }}>{children}</button>
);

const InputField = ({ label, type = "text", value, onChange, placeholder, icon }) => {
  const [showPw, setShowPw] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: C.text, textTransform: "capitalize" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        <input
          type={type === "password" ? (showPw ? "text" : "password") : type}
          value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{
            width: "100%", padding: "12px 16px", paddingRight: type === "password" ? 44 : 16,
            borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.95)", color: "#1a0a1e",
            fontSize: 14, fontFamily: "inherit", outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = C.purple1}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.2)"}
        />
        {type === "password" && (
          <button onClick={() => setShowPw(!showPw)} style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "#666", display: "flex",
          }}>{showPw ? Icons.eyeOff : Icons.eye}</button>
        )}
      </div>
    </div>
  );
};

const ConfidenceMeter = ({ value }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)" }}>
      <div style={{ height: "100%", borderRadius: 3, width: `${value}%`, background: value > 85 ? `linear-gradient(90deg, ${C.purple1}, ${C.success})` : value > 70 ? `linear-gradient(90deg, ${C.purple1}, ${C.warning})` : `linear-gradient(90deg, ${C.purple1}, ${C.danger})`, transition: "width 1s ease" }} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 700, color: C.text, minWidth: 36, textAlign: "right" }}>{value}%</span>
  </div>
);

const XPBar = ({ current, max, height = 8 }) => (
  <div style={{ width: "100%", height, borderRadius: height / 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
    <div style={{ height: "100%", borderRadius: height / 2, width: `${(current / max) * 100}%`, background: `linear-gradient(90deg, ${C.purple1}, ${C.purpleLight})`, transition: "width 1.2s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: `0 0 12px ${C.purple1}40` }} />
  </div>
);

// ═══════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════

// LOGIN
const LoginScreen = ({ onLogin, onGoRegister }) => {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <header style={{ background: C.headerBg, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", flexShrink: 0 }}>
        <Logo size={44} />
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontSize: 14, color: C.text, cursor: "pointer" }}>Acerca de</span>
          <span style={{ fontSize: 14, color: C.text, cursor: "pointer" }}>Inicia sesión</span>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.purple1, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icons.user}</div>
        </div>
      </header>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="auth-card">
          {/* Left: Login form */}
          <div style={{ flex: 1, background: C.cardMid, padding: "48px 40px", display: "flex", flexDirection: "column" }}>
            <LogoPurple size={80} />
            <p style={{ fontSize: 12, color: C.textMuted, marginTop: 8, marginBottom: 28 }}>Bienvenido de Nuevo</p>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 32 }}>Inicia Sesión</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>
              <InputField label="Correo" value={email} onChange={setEmail} placeholder="ejemplo@mail.com" />
              <InputField label="Contraseña" type="password" value={pw} onChange={setPw} placeholder="••••••••" />
            </div>
            <BtnPrimary onClick={onLogin} style={{ width: "100%", marginBottom: 16 }}>Inicia Sesión</BtnPrimary>
            <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center" }}>
              ¿Olvidaste tu contraseña? <span style={{ color: C.purple1, cursor: "pointer" }}>Recuperala Aquí</span>
            </p>
          </div>
          {/* Right: Register CTA */}
          <div className="auth-side" style={{ background: C.cardDark, padding: "48px 36px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <Logo size={80} />
            <h3 style={{ fontSize: 24, fontWeight: 700, color: C.text, marginTop: 32, marginBottom: 12 }}>¿No tienes cuenta?</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 28, lineHeight: 1.6 }}>Regístrate para reservar espacios de trabajo inteligentes</p>
            <BtnPrimary onClick={onGoRegister} style={{ background: C.white, color: C.purple5 }}>Regístrate</BtnPrimary>
          </div>
        </div>
      </div>
    </div>
  );
};

// REGISTER
const RegisterScreen = ({ onRegister, onGoLogin }) => {
  const [name, setName] = useState(""); const [empNum, setEmpNum] = useState("");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <header style={{ background: C.headerBg, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", flexShrink: 0 }}>
        <Logo size={44} />
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontSize: 14, color: C.text }}>Acerca de</span>
          <span style={{ fontSize: 14, color: C.text }}>Mi perfil</span>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.purple1, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icons.user}</div>
        </div>
      </header>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="auth-card">
          {/* Left: Login CTA */}
          <div className="auth-side" style={{ background: C.cardMid, padding: "48px 36px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <h3 style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 12 }}>¿Ya tienes cuenta?</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 28, lineHeight: 1.6 }}>Inicia sesión para acceder a tus reservaciones</p>
            <BtnPrimary onClick={onGoLogin} style={{ background: C.white, color: C.purple5 }}>Inicia Sesión</BtnPrimary>
          </div>
          {/* Right: Register form */}
          <div style={{ flex: 1, background: C.cardDark, padding: "48px 40px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <Logo size={60} />
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 28 }}>Regístrate</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              <InputField label="Nombre" value={name} onChange={setName} placeholder="Tu nombre" />
              <InputField label="Número de empleado" value={empNum} onChange={setEmpNum} placeholder="EMP-XXXXX" />
              <InputField label="Correo" value={email} onChange={setEmail} placeholder="ejemplo@mail.com" />
              <InputField label="Contraseña" type="password" value={pw} onChange={setPw} placeholder="••••••••" />
            </div>
            <BtnPrimary onClick={onRegister} style={{ width: "100%", marginTop: 8 }}>Regístrate</BtnPrimary>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// MAIN DASHBOARD (contains sidebar + all inner screens)
// ═══════════════════════════════════════════
const DashboardApp = ({ onLogout }) => {
  const [screen, setScreen] = useState("areas");
  const [animateIn, setAnimateIn] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [expandedRec, setExpandedRec] = useState(null);
  const [reserveModal, setReserveModal] = useState(null);

  useEffect(() => { setAnimateIn(false); const t = setTimeout(() => setAnimateIn(true), 50); return () => clearTimeout(t); }, [screen]);

  const filteredRes = filter === "all" ? reservations : reservations.filter(r => r.status === filter);
  const stats = { total: reservations.length, confirmed: reservations.filter(r => r.status === "confirmed").length, active: reservations.filter(r => r.status === "active").length, pending: reservations.filter(r => r.status === "pending").length };
  const usageData = [{ d: "Lun", v: 72 }, { d: "Mar", v: 85 }, { d: "Mié", v: 90 }, { d: "Jue", v: 68 }, { d: "Vie", v: 45 }];
  const maxU = Math.max(...usageData.map(d => d.v));

  const sidebarItems = [
    { id: "areas", icon: Icons.map, label: "Areas Disponibles" },
    { id: "reservations", icon: Icons.calendar, label: "Reservaciones" },
    { id: "ai", icon: Icons.sparkle, label: "IA Recomendaciones" },
    { id: "gamification", icon: Icons.trophy, label: "Gamificación" },
    { id: "profile", icon: Icons.user, label: "Perfil" },
  ];

  const areaStatusColor = (s) => s === "available" ? C.success : s === "occupied" ? C.danger : C.warning;

  return (
    <div style={{ fontFamily: "'Nunito Sans', 'Segoe UI', sans-serif", minHeight: "100vh", display: "flex", flexDirection: "column", background: "#1a0a1e", color: C.text }}>
      <style>{`
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      `}</style>

      {/* Header */}
      <header style={{ background: C.headerBg, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", flexShrink: 0, borderBottom: `1px solid ${C.glassBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Logo size={44} />
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>WorkSpace</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 14, color: C.text, cursor: "pointer" }}>Acerca de</span>
          <span style={{ fontSize: 14, color: C.text, cursor: "pointer" }}>Mi perfil</span>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.purple1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, boxShadow: `0 0 20px ${C.purple1}40` }}>MG</div>
        </div>
      </header>

      <div className="dash-layout">
        {/* Sidebar */}
        <nav className="dash-sidebar" style={{ background: C.cardLight, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 6, borderRight: `1px solid ${C.glassBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#000" }}>{Icons.user}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>MariaGtz23</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Empleado</div>
            </div>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.2)", margin: "0 0 8px" }} />

          {sidebarItems.map(item => (
            <button key={item.id} onClick={() => setScreen(item.id)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderRadius: 10, border: "none",
              cursor: "pointer", fontSize: 14, fontWeight: screen === item.id ? 700 : 500, fontFamily: "inherit",
              color: C.white, textAlign: "left", width: "100%",
              background: screen === item.id ? "linear-gradient(90deg, rgba(161,0,255,0.35) 0%, rgba(161,0,255,0.12) 100%)" : "transparent",
              transition: "all 0.2s",
            }}>
              <span style={{ opacity: screen === item.id ? 1 : 0.65, display: "flex" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}

          <div style={{ flex: 1 }} />
          <button onClick={onLogout} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10,
            border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
            color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.05)", textAlign: "left", width: "100%",
          }}>
            {Icons.logout} Cerrar Sesión
          </button>
        </nav>

        {/* Main Content */}
        <main className="dash-main">
          <div style={{ animation: animateIn ? "fadeUp 0.5s ease forwards" : "none", opacity: animateIn ? 1 : 0 }}>

            {/* ═══ AREAS DISPONIBLES (Floor Map) ═══ */}
            {screen === "areas" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                  <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Areas Disponibles</h1>
                    <p style={{ fontSize: 14, color: C.textMuted }}>Selecciona un área en el mapa para ver detalles</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, color: C.textMuted }}>Piso</span>
                    <select value={selectedFloor} onChange={e => setSelectedFloor(+e.target.value)} style={{
                      padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.glassBorder}`,
                      background: "rgba(161,0,255,0.12)", color: C.text, fontSize: 14, fontFamily: "inherit", cursor: "pointer",
                    }}>
                      {[1, 2, 3, 4, 5, 6].map(f => <option key={f} value={f} style={{ background: "#1a0a1e" }}>Piso {f}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 24 }}>
                  {/* Floor Map */}
                  <div style={{ flex: 1, borderRadius: 16, border: `2px solid ${C.glassBorder}`, background: "rgba(0,0,0,0.6)", padding: 20, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 16, left: 20, fontSize: 12, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", zIndex: 2 }}>Piso {selectedFloor}</div>
                    {/* Map SVG */}
                    <svg viewBox="0 0 100 82" style={{ width: "100%", height: "auto" }}>
                      {/* Building outline - pentagon shape matching the floor plan */}
                      <path d="M 3 5 L 97 5 L 97 28 L 95 28 L 95 80 L 5 80 L 5 28 L 3 28 Z" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
                      {/* Grid lines */}
                      {[20, 40, 60, 80].map(y => <line key={`h${y}`} x1="3" y1={y * 0.82} x2="97" y2={y * 0.82} stroke="rgba(255,255,255,0.04)" strokeWidth="0.2" />)}
                      {[20, 40, 60, 80].map(x => <line key={`v${x}`} x1={x} y1="5" x2={x} y2="80" stroke="rgba(255,255,255,0.04)" strokeWidth="0.2" />)}
                      {/* Areas */}
                      {floorAreas.map(area => (
                        <g key={area.id} onClick={() => setSelectedArea(area)} style={{ cursor: "pointer" }}>
                          <rect x={area.x} y={area.y} width={area.w} height={area.h} rx="1.5"
                            fill={selectedArea?.id === area.id ? `${areaStatusColor(area.status)}30` : `${areaStatusColor(area.status)}15`}
                            stroke={selectedArea?.id === area.id ? areaStatusColor(area.status) : `${areaStatusColor(area.status)}60`}
                            strokeWidth={selectedArea?.id === area.id ? "0.6" : "0.3"}
                            style={{ transition: "all 0.3s" }}
                          />
                          <text x={area.x + area.w / 2} y={area.y + area.h / 2 - 2} textAnchor="middle" fill={C.white} fontSize="2.8" fontWeight="700" fontFamily="inherit">{area.name}</text>
                          <text x={area.x + area.w / 2} y={area.y + area.h / 2 + 4} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="2" fontFamily="inherit">{area.type}</text>
                          {/* Desk dots */}
                          {Array.from({ length: Math.min(area.capacity, 8) }).map((_, di) => (
                            <circle key={di} cx={area.x + 3 + (di % 4) * 4} cy={area.y + area.h - 4 + Math.floor(di / 4) * 3} r="0.8"
                              fill={di < area.capacity * (area.status === "occupied" ? 0.8 : area.status === "available" ? 0.2 : 0.5) ? areaStatusColor(area.status) : "rgba(255,255,255,0.1)"}
                            />
                          ))}
                        </g>
                      ))}
                    </svg>

                    {/* Legend */}
                    <div style={{ display: "flex", gap: 20, marginTop: 16, justifyContent: "center" }}>
                      {[{ l: "Disponible", c: C.success }, { l: "Ocupado", c: C.danger }, { l: "Mantenimiento", c: C.warning }].map(({ l, c }) => (
                        <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textMuted }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: `${c}30`, border: `1px solid ${c}` }} />{l}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Area Detail Panel */}
                  <div style={{ width: 300, borderRadius: 16, background: C.cardDark, padding: 24, border: `1px solid ${C.glassBorder}`, display: "flex", flexDirection: "column" }}>
                    {selectedArea ? (
                      <>
                        <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{selectedArea.name}</h3>
                        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Piso {selectedArea.floor}</p>
                        <StatusBadge status={selectedArea.status} />
                        <div style={{ margin: "20px 0", height: 1, background: "rgba(255,255,255,0.1)" }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 13, color: C.textMuted }}>Tipo</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedArea.type}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 13, color: C.textMuted }}>Capacidad</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedArea.capacity} personas</span>
                          </div>
                        </div>
                        <div style={{ flex: 1 }} />
                        {selectedArea.status === "available" ? (
                          <BtnPrimary onClick={() => setReserveModal(selectedArea)} style={{ width: "100%", marginTop: 20 }}>Seleccionar</BtnPrimary>
                        ) : (
                          <BtnSecondary style={{ width: "100%", marginTop: 20, opacity: 0.5, cursor: "not-allowed" }}>No disponible</BtnSecondary>
                        )}
                        <button onClick={() => setSelectedArea(null)} style={{ marginTop: 10, background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Volver</button>
                      </>
                    ) : (
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: C.textMuted }}>
                        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>{Icons.map}</div>
                        <p style={{ fontSize: 14 }}>Selecciona un área del mapa para ver sus detalles</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reserve Modal */}
                {reserveModal && (
                  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setReserveModal(null)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: C.cardDark, borderRadius: 20, padding: 36, width: 480, border: `1px solid ${C.glassBorder}`, animation: "fadeUp 0.3s ease" }}>
                      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Reservar</h2>
                      <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24 }}>{reserveModal.name} — {reserveModal.type}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <InputField label="Nombre" value="Maria Gutiérrez" onChange={() => { }} />
                        <InputField label="Número de empleado" value="EMP-20345" onChange={() => { }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <InputField label="Correo" value="maria@accenture.com" onChange={() => { }} />
                        <InputField label="Número de personas" value="4" onChange={() => { }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
                        <InputField label="Fecha" type="date" value="2026-03-10" onChange={() => { }} />
                        <InputField label="Hora inicio" type="time" value="09:00" onChange={() => { }} />
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <BtnPrimary onClick={() => setReserveModal(null)} style={{ flex: 1 }}>Reservar</BtnPrimary>
                        <BtnSecondary onClick={() => setReserveModal(null)} style={{ flex: 0 }}>Volver</BtnSecondary>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ RESERVACIONES ═══ */}
            {screen === "reservations" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                  <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Reservaciones</h1>
                    <p style={{ fontSize: 14, color: C.textMuted }}>Gestiona tus espacios de trabajo reservados</p>
                  </div>
                  <BtnPrimary>{Icons.plus} Nueva Reservación</BtnPrimary>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
                  {[
                    { label: "Total", value: stats.total, color: C.purple1, icon: Icons.calendar },
                    { label: "Confirmadas", value: stats.confirmed, color: C.success, icon: Icons.check },
                    { label: "Activas", value: stats.active, color: C.blue, icon: Icons.clock },
                    { label: "Pendientes", value: stats.pending, color: C.warning, icon: Icons.alert },
                  ].map((s, i) => (
                    <div key={i} style={{ padding: 20, borderRadius: 14, background: C.glass, border: `1px solid ${C.glassBorder}`, animation: animateIn ? `fadeUp 0.4s ${i * 0.08}s ease both` : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
                        <span style={{ color: s.color, opacity: 0.7 }}>{s.icon}</span>
                      </div>
                      <span style={{ fontSize: 32, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>

                {/* Charts */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
                  <div style={{ padding: 24, borderRadius: 14, background: C.glass, border: `1px solid ${C.glassBorder}` }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Ocupación Semanal</h3>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100, padding: "0 4px" }}>
                      {usageData.map((d, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 6 }}>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}>{d.v}%</span>
                          <div style={{ width: "100%", borderRadius: 6, height: `${(d.v / maxU) * 70}px`, background: d.v > 80 ? `linear-gradient(180deg, ${C.danger} 0%, ${C.purple1} 100%)` : `linear-gradient(180deg, ${C.purpleLight} 0%, ${C.purple1} 100%)`, transition: "height 0.6s ease" }} />
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{d.d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding: 24, borderRadius: 14, background: C.glass, border: `1px solid ${C.glassBorder}` }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Tipo de Espacio</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                      <svg width="110" height="110" viewBox="0 0 110 110">
                        {(() => { let cum = 0; const total = 100; const r = 40; const circ = 2 * Math.PI * r;
                          return [{ t: "Salas", p: 45, c: C.purple1 }, { t: "Desks", p: 30, c: C.pink }, { t: "Eventos", p: 15, c: C.purpleLight }, { t: "Focus", p: 10, c: C.pinkDark }].map((d, i) => {
                            const off = (cum / total) * circ; const len = (d.p / total) * circ; cum += d.p;
                            return <circle key={i} cx="55" cy="55" r={r} fill="none" stroke={d.c} strokeWidth="16" strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-off} strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "55px 55px" }} />;
                          });
                        })()}
                      </svg>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[{ t: "Salas", p: 45, c: C.purple1 }, { t: "Desks", p: 30, c: C.pink }, { t: "Eventos", p: 15, c: C.purpleLight }, { t: "Focus", p: 10, c: C.pinkDark }].map((d, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.c, flexShrink: 0 }} />
                            <span style={{ color: C.textMuted }}>{d.t}</span>
                            <span style={{ color: C.text, fontWeight: 700, marginLeft: "auto" }}>{d.p}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                  {[{ id: "all", l: "Todas" }, { id: "confirmed", l: "Confirmadas" }, { id: "active", l: "Activas" }, { id: "pending", l: "Pendientes" }, { id: "cancelled", l: "Canceladas" }].map(f => (
                    <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", color: filter === f.id ? "#fff" : C.textMuted, background: filter === f.id ? C.purple1 : "rgba(255,255,255,0.06)", transition: "all 0.2s" }}>{f.l}</button>
                  ))}
                </div>

                {/* Table */}
                <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.glassBorder}`, background: C.glass }}>
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
                        <tr key={r.id} style={{ borderBottom: "1px solid rgba(161,0,255,0.08)", animation: animateIn ? `slideIn 0.3s ${i * 0.04}s ease both` : "none", cursor: "pointer", transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(161,0,255,0.06)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "14px 16px", fontSize: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 16 }}>{r.type === "meeting" ? "🏢" : r.type === "desk" ? "💻" : "🎤"}</span>
                              <span style={{ fontWeight: 700 }}>{r.space}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: 13, color: C.textMuted }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}>{Icons.pin} {r.floor}</div></td>
                          <td style={{ padding: "14px 16px", fontSize: 13, color: C.textMuted }}>{r.date}</td>
                          <td style={{ padding: "14px 16px", fontSize: 13, color: C.textMuted }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}>{Icons.clock} {r.time}</div></td>
                          <td style={{ padding: "14px 16px", fontSize: 13 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}>{Icons.users} {r.attendees}/{r.capacity}</div></td>
                          <td style={{ padding: "14px 16px" }}><StatusBadge status={r.status} /></td>
                          <td style={{ padding: "14px 16px", color: C.textMuted }}>{Icons.chevron}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══ IA RECOMENDACIONES ═══ */}
            {screen === "ai" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${C.purple1}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 30px ${C.purple1}40` }}>{Icons.brain}</div>
                  <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Recomendaciones IA</h1>
                    <p style={{ fontSize: 14, color: C.textMuted }}>Análisis inteligente de tu comportamiento de uso</p>
                  </div>
                </div>

                {/* AI Banner */}
                <div style={{ padding: 28, borderRadius: 16, marginBottom: 28, background: `linear-gradient(135deg, rgba(161,0,255,0.15), rgba(200,80,255,0.08))`, border: `1px solid ${C.glassBorder}`, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${C.purple1}30 0%, transparent 70%)` }} />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <PulseDot /><span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.pink }}>Motor de IA Activo</span>
                    </div>
                    <p style={{ fontSize: 15, lineHeight: 1.7, color: C.text, maxWidth: 700, marginBottom: 20 }}>
                      El sistema analiza continuamente tu comportamiento de uso — horarios preferidos, tipos de espacios, patrones de equipo y niveles de ocupación — para generar recomendaciones inteligentes.
                    </p>
                    <div style={{ display: "flex", gap: 32 }}>
                      {[{ l: "Sesiones analizadas", v: "247" }, { l: "Precisión del modelo", v: "91%" }, { l: "Ahorro de tiempo", v: "3.2h/sem" }].map((m, i) => (
                        <div key={i}><div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: C.purpleLight }}>{m.v}</div><div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.l}</div></div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Behavior Insights */}
                <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Insights de Comportamiento</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
                  {[
                    { title: "Horario Preferido", ins: "Reservaciones entre 9:00-11:00 AM", det: "78% de reuniones matutinas", icon: Icons.clock, acc: C.purple1 },
                    { title: "Espacios Favoritos", ins: "Salas de 8-12 personas en pisos altos", det: "Piso 3 y 5 más frecuentes", icon: Icons.pin, acc: C.pink },
                    { title: "Patrón de Equipo", ins: "3 equipos recurrentes por semana", det: "12 personas frecuentes", icon: Icons.users, acc: C.purpleLight },
                  ].map((it, i) => (
                    <div key={i} style={{ padding: 24, borderRadius: 14, background: C.glass, border: `1px solid ${C.glassBorder}`, animation: animateIn ? `fadeUp 0.4s ${i * 0.1}s ease both` : "none" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${it.acc}20`, display: "flex", alignItems: "center", justifyContent: "center", color: it.acc, marginBottom: 14 }}>{it.icon}</div>
                      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{it.title}</h3>
                      <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>{it.ins}</p>
                      <p style={{ fontSize: 12, color: C.textMuted }}>{it.det}</p>
                    </div>
                  ))}
                </div>

                {/* Recommendations */}
                <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Recomendaciones Personalizadas</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {aiRecommendations.map((rec, i) => {
                    const isExp = expandedRec === rec.id;
                    const tMap = { pattern: { i: Icons.trendUp, c: C.purple1 }, optimization: { i: Icons.sparkle, c: C.success }, team: { i: Icons.users, c: C.blue }, alert: { i: Icons.alert, c: C.warning } };
                    const ti = tMap[rec.type] || tMap.pattern;
                    return (
                      <div key={rec.id} onClick={() => setExpandedRec(isExp ? null : rec.id)} style={{ padding: 20, borderRadius: 14, cursor: "pointer", background: isExp ? `linear-gradient(135deg, rgba(161,0,255,0.12), rgba(161,0,255,0.04))` : C.glass, border: `1px solid ${isExp ? C.purple1 + "40" : C.glassBorder}`, transition: "all 0.3s", animation: animateIn ? `slideIn 0.4s ${i * 0.08}s ease both` : "none" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `${ti.c}20`, display: "flex", alignItems: "center", justifyContent: "center", color: ti.c }}>{ti.i}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <h3 style={{ fontSize: 15, fontWeight: 700 }}>{rec.title}</h3>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 120 }}><ConfidenceMeter value={rec.confidence} /></div>
                                <span style={{ transform: isExp ? "rotate(90deg)" : "none", transition: "transform 0.3s", display: "inline-flex", color: C.textMuted }}>{Icons.chevron}</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, marginBottom: isExp ? 14 : 0 }}>
                              {rec.tags.map((tag, ti) => <span key={ti} style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "rgba(161,0,255,0.12)", color: C.pink }}>{tag}</span>)}
                            </div>
                            {isExp && (
                              <div style={{ animation: "fadeUp 0.3s ease" }}>
                                <p style={{ fontSize: 13, lineHeight: 1.7, color: C.textMuted, marginBottom: 16 }}>{rec.reason}</p>
                                <div style={{ display: "flex", gap: 10 }}>
                                  <BtnPrimary style={{ padding: "10px 24px" }}>Reservar ahora</BtnPrimary>
                                  <BtnSecondary style={{ padding: "10px 24px" }}>Ignorar</BtnSecondary>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══ GAMIFICACIÓN ═══ */}
            {screen === "gamification" && (
              <div>
                <div style={{ marginBottom: 28 }}>
                  <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Gamificación</h1>
                  <p style={{ fontSize: 14, color: C.textMuted }}>Gana puntos, desbloquea logros y compite con tus compañeros</p>
                </div>

                {/* Player Card */}
                <div style={{ padding: 28, borderRadius: 16, background: `linear-gradient(135deg, rgba(161,0,255,0.2), rgba(200,80,255,0.08))`, border: `1px solid ${C.glassBorder}`, marginBottom: 28, display: "flex", alignItems: "center", gap: 28 }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.purple1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, boxShadow: `0 0 30px ${C.purple1}50`, border: "3px solid rgba(255,255,255,0.2)" }}>MG</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                      <h2 style={{ fontSize: 22, fontWeight: 800 }}>MariaGtz23</h2>
                      <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${C.purple1}30`, color: C.purpleLight }}>Nivel {gamificationData.level}</span>
                    </div>
                    <p style={{ fontSize: 14, color: C.purpleLight, fontWeight: 600, marginBottom: 12 }}>{gamificationData.rank}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <XPBar current={gamificationData.xp} max={gamificationData.nextLevelXp} />
                      <span style={{ fontSize: 12, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>{gamificationData.xp}/{gamificationData.nextLevelXp} XP</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 24 }}>
                    {[
                      { l: "Racha", v: `${gamificationData.streak} días`, icon: Icons.fire, c: "#FF6B35" },
                      { l: "Reservaciones", v: gamificationData.totalReservations, icon: Icons.calendar, c: C.purple1 },
                      { l: "Puntualidad", v: `${gamificationData.punctuality}%`, icon: Icons.clock, c: C.success },
                    ].map((s, i) => (
                      <div key={i} style={{ textAlign: "center" }}>
                        <div style={{ color: s.c, display: "flex", justifyContent: "center", marginBottom: 4 }}>{s.icon}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{s.v}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weekly Challenge */}
                <div style={{ padding: 24, borderRadius: 14, background: C.glass, border: `1px solid ${C.glassBorder}`, marginBottom: 28, animation: "glow 3s ease infinite" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>🎯</span>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 700 }}>Desafío Semanal</h3>
                        <p style={{ fontSize: 13, color: C.textMuted }}>{gamificationData.weeklyChallenge.title}</p>
                      </div>
                    </div>
                    <span style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: `${C.warning}20`, color: C.warning }}>+{gamificationData.weeklyChallenge.reward} XP</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <XPBar current={gamificationData.weeklyChallenge.progress} max={gamificationData.weeklyChallenge.target} height={10} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{gamificationData.weeklyChallenge.progress}/{gamificationData.weeklyChallenge.target}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  {/* Badges */}
                  <div>
                    <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Logros</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                      {gamificationData.badges.map((b, i) => (
                        <div key={b.id} style={{
                          padding: 16, borderRadius: 14, textAlign: "center",
                          background: b.earned ? C.glass : "rgba(255,255,255,0.02)",
                          border: `1px solid ${b.earned ? C.glassBorder : "rgba(255,255,255,0.05)"}`,
                          opacity: b.earned ? 1 : 0.4,
                          animation: animateIn ? `fadeUp 0.3s ${i * 0.05}s ease both` : "none",
                          transition: "transform 0.2s",
                        }}>
                          <div style={{ fontSize: 30, marginBottom: 8, filter: b.earned ? "none" : "grayscale(1)" }}>{b.icon}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{b.name}</div>
                          <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.4 }}>{b.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Leaderboard */}
                  <div>
                    <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Tabla de Líderes</h2>
                    <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.glassBorder}`, background: C.glass }}>
                      {gamificationData.leaderboard.map((p, i) => (
                        <div key={p.rank} style={{
                          display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
                          borderBottom: i < gamificationData.leaderboard.length - 1 ? `1px solid rgba(161,0,255,0.08)` : "none",
                          background: p.isUser ? "rgba(161,0,255,0.12)" : "transparent",
                          animation: animateIn ? `slideIn 0.3s ${i * 0.08}s ease both` : "none",
                        }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                            background: p.rank === 1 ? "linear-gradient(135deg, #FFD700, #FFA500)" : p.rank === 2 ? "linear-gradient(135deg, #C0C0C0, #A0A0A0)" : p.rank === 3 ? "linear-gradient(135deg, #CD7F32, #B87333)" : "rgba(255,255,255,0.08)",
                            color: p.rank <= 3 ? "#000" : C.textMuted,
                          }}>{p.rank}</span>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: p.isUser ? C.purple1 : "rgba(161,0,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, border: p.isUser ? "2px solid rgba(255,255,255,0.3)" : "none" }}>{p.avatar}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: p.isUser ? 800 : 600 }}>{p.name}{p.isUser && <span style={{ fontSize: 11, color: C.purpleLight, marginLeft: 8 }}>(Tú)</span>}</div>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: C.purpleLight }}>{p.xp.toLocaleString()} XP</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ PERFIL ═══ */}
            {screen === "profile" && (
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 28 }}>Perfil</h1>

                <div style={{ display: "flex", gap: 24 }}>
                  {/* Info Card */}
                  <div style={{ flex: 1, borderRadius: 16, background: C.cardDark, padding: 28, border: `1px solid ${C.glassBorder}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                      <h2 style={{ fontSize: 22, fontWeight: 800, textTransform: "uppercase" }}>Información</h2>
                      <button style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.text, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>{Icons.edit}</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      {[
                        { l: "Correo", v: "maria@accenture.com" },
                        { l: "Edad", v: "28 años" },
                        { l: "Fecha de Nacimiento", v: "15/06/1997" },
                        { l: "Género", v: "Mujer/Femenino" },
                        { l: "Número de Empleado", v: "EMP-20345" },
                        { l: "Departamento", v: "Tecnología" },
                      ].map((f, i) => (
                        <div key={i} style={{ animation: animateIn ? `fadeUp 0.3s ${i * 0.06}s ease both` : "none" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4, textTransform: "capitalize" }}>{f.l}</div>
                          <div style={{ fontSize: 14, color: C.textMuted }}>{f.v}</div>
                        </div>
                      ))}
                      <div style={{ gridColumn: "1 / -1", animation: animateIn ? "fadeUp 0.3s 0.36s ease both" : "none" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Dirección</div>
                        <div style={{ fontSize: 14, color: C.textMuted }}>Monterrey, Nuevo León, México</div>
                      </div>
                    </div>
                  </div>

                  {/* Avatar Card */}
                  <div style={{ width: 300, borderRadius: 16, background: C.cardDark, padding: 28, border: `1px solid ${C.glassBorder}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ position: "relative", marginBottom: 20 }}>
                      <div style={{ width: 140, height: 140, borderRadius: "50%", background: "#fff", border: `4px solid ${C.purple5}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="70" height="62" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <div style={{ position: "absolute", bottom: 4, right: 4, width: 36, height: 36, borderRadius: "50%", background: C.purple1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: `0 2px 10px ${C.purple1}50` }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                      </div>
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>MariaGtz23</h3>
                    <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 20 }}>Empleado</p>
                    <BtnPrimary style={{ width: "100%" }}>Editar Perfil</BtnPrimary>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("login");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,300;0,6..12,500;0,6..12,700;0,6..12,800;1,6..12,400&family=JetBrains+Mono:wght@400;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Nunito Sans', 'Segoe UI', sans-serif; }
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(2.2);opacity:0}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(161,0,255,0.3)}50%{box-shadow:0 0 24px rgba(161,0,255,0.6)}}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(161,0,255,0.3);border-radius:3px}

        /* ── Tarjeta auth (login / registro) ── */
        .auth-card { display: flex; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 900px; width: 100%; animation: fadeUp 0.6s ease; }
        .auth-side { width: 340px; flex-shrink: 0; }

        /* ── Dashboard: sidebar y layout ── */
        .dash-layout { display: flex; flex: 1; overflow: hidden; }
        .dash-sidebar { width: 250px; flex-shrink: 0; }
        .dash-main { flex: 1; overflow: auto; padding: 32px; background: linear-gradient(180deg,#1a0a1e 0%,#0f0612 100%); }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          /* Auth: apilar verticalmente */
          .auth-card { flex-direction: column; border-radius: 16px; }
          .auth-side { width: 100%; }

          /* Sidebar: ocultar en móvil, mostrar navegación inferior */
          .dash-sidebar { display: none; }
          .dash-main { padding: 16px; }

          /* Header: reducir padding */
          .dash-header { padding: 0 16px !important; }

          /* Mapa: evitar overflow horizontal */
          .floor-map-row { flex-direction: column !important; }
        }

        @media (max-width: 480px) {
          .auth-card { margin: 0 8px; }
        }
      `}</style>
      {page === "login" && <LoginScreen onLogin={() => setPage("dashboard")} onGoRegister={() => setPage("register")} />}
      {page === "register" && <RegisterScreen onRegister={() => setPage("dashboard")} onGoLogin={() => setPage("login")} />}
      {page === "dashboard" && <DashboardApp onLogout={() => setPage("login")} />}
    </>
  );
}
