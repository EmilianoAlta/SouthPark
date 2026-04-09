// src/config/constants.js
export const C = {
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

export const reservations = [
  { id: 1, space: "Sala Innovación A", floor: "Piso 3", date: "2026-03-09", time: "09:00 - 11:00", status: "confirmed", capacity: 12, attendees: 8, type: "meeting" },
  { id: 2, space: "Hot Desk B-14", floor: "Piso 2", date: "2026-03-09", time: "08:00 - 18:00", status: "active", capacity: 1, attendees: 1, type: "desk" },
  { id: 3, space: "Sala Colaboración C", floor: "Piso 5", date: "2026-03-10", time: "14:00 - 16:00", status: "pending", capacity: 8, attendees: 5, type: "meeting" },
  { id: 4, space: "Zona Creativa D", floor: "Piso 1", date: "2026-03-10", time: "10:00 - 12:00", status: "confirmed", capacity: 20, attendees: 15, type: "event" },
  { id: 5, space: "Hot Desk A-07", floor: "Piso 4", date: "2026-03-11", time: "08:00 - 14:00", status: "confirmed", capacity: 1, attendees: 1, type: "desk" },
  { id: 6, space: "Sala Ejecutiva E", floor: "Piso 6", date: "2026-03-11", time: "11:00 - 12:30", status: "cancelled", capacity: 6, attendees: 0, type: "meeting" },
  { id: 7, space: "Auditorio Principal", floor: "Piso 1", date: "2026-03-12", time: "15:00 - 17:00", status: "pending", capacity: 50, attendees: 35, type: "event" },
  { id: 8, space: "Sala Focus F", floor: "Piso 3", date: "2026-03-12", time: "09:00 - 10:30", status: "confirmed", capacity: 4, attendees: 3, type: "meeting" },
];

export const aiRecommendations = [
  { id: 1, title: "Sala Innovación A — Martes 10:00", reason: "Basado en tus últimas 12 reuniones, prefieres salas de 8-12 personas los martes por la mañana. Esta sala tiene 94% de satisfacción entre usuarios similares.", confidence: 94, type: "pattern", tags: ["Alta demanda", "Tu horario preferido"] },
  { id: 2, title: "Hot Desk B-22 — Jueves todo el día", reason: "Tu productividad aumenta 23% cuando usas escritorios en Piso 2 cerca de ventanas. B-22 tiene luz natural óptima y está disponible.", confidence: 87, type: "optimization", tags: ["Productividad", "Luz natural"] },
  { id: 3, title: "Zona Creativa D — Miércoles 14:00", reason: "Detectamos que tu equipo (5 personas) tiene reuniones recurrentes los miércoles. Esta zona flexible se adapta mejor que las salas cerradas.", confidence: 91, type: "team", tags: ["Equipo", "Espacio flexible"] },
  { id: 4, title: "Cambiar Sala Focus F → Sala G", reason: "La Sala F tiene problemas de conectividad reportados. La Sala G ofrece el mismo aforo con mejor equipamiento tecnológico.", confidence: 78, type: "alert", tags: ["Optimización", "Conectividad"] },
];

export const floorAreas = [
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

export const gamificationData = {
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
