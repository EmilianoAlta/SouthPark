// src/lib/gamification.js
// Motor de gamificación: calcula XP, nivel, rachas, badges y leaderboard desde Reserva.
import { supabase } from "../supabaseClient";

// ── Constantes de XP ────────────────────────────────────────────────────────

const XP_FINALIZADA = 50;
const XP_ACTIVA = 30;
const XP_CHECKIN = 20;
const XP_CANCELADA = -10;
const XP_NOSHOW = -25;
const XP_POR_NIVEL = 500;

const RANGOS = [
  { nivel: 1, nombre: "Novato" },
  { nivel: 3, nombre: "Reservador" },
  { nivel: 5, nombre: "Habitual" },
  { nivel: 8, nombre: "Experto" },
  { nivel: 10, nombre: "Veterano" },
  { nivel: 15, nombre: "Leyenda" },
  { nivel: 20, nombre: "Maestro Supremo" },
];

function getRango(nivel) {
  let rango = RANGOS[0].nombre;
  for (const r of RANGOS) {
    if (nivel >= r.nivel) rango = r.nombre;
  }
  return rango;
}

// ── Calcular XP de un usuario ───────────────────────────────────────────────

function hoyStr() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,"0")}-${String(h.getDate()).padStart(2,"0")}`;
}

function calcularXP(reservas) {
  const hoy = hoyStr();
  let xp = 0;
  for (const r of reservas) {
    if (r.id_estado === 5) xp += XP_FINALIZADA;
    else if (r.id_estado === 2) xp += XP_ACTIVA + XP_CHECKIN;
    else if (r.id_estado === 4) xp += XP_CANCELADA;
    else if (r.id_estado === 1 || r.id_estado === 3) {
      // Si la reserva ya pasó y no hizo check-in → no-show
      if (r.fecha_reserva < hoy) xp += XP_NOSHOW;
      else xp += XP_ACTIVA;
    }
  }
  return Math.max(0, xp);
}

function calcularNivel(xp) {
  return Math.floor(xp / XP_POR_NIVEL) + 1;
}

// ── Racha ────────────────────────────────────────────────────────────────────

function calcularRacha(reservas) {
  // Obtener fechas únicas con reservas activas (no canceladas), ordenadas desc
  const fechasSet = new Set();
  for (const r of reservas) {
    if (r.id_estado !== 4) fechasSet.add(r.fecha_reserva);
  }
  const fechas = [...fechasSet].sort().reverse();
  if (fechas.length === 0) return 0;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const ultimaFecha = new Date(fechas[0] + "T12:00:00");
  ultimaFecha.setHours(0, 0, 0, 0);

  // Si la última reserva no es hoy ni ayer, racha = 0
  const diffDias = Math.round((hoy - ultimaFecha) / (1000 * 60 * 60 * 24));
  if (diffDias > 1) return 0;

  let racha = 1;
  for (let i = 1; i < fechas.length; i++) {
    const curr = new Date(fechas[i - 1] + "T12:00:00");
    const prev = new Date(fechas[i] + "T12:00:00");
    const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diff === 1) racha++;
    else break;
  }
  return racha;
}

// ── Badges ──────────────────────────────────────────────────────────────────

function calcularBadges(reservas, xp, nivel, racha) {
  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

  const noCancel = reservas.filter(r => r.id_estado !== 4);
  const finalizadas = reservas.filter(r => r.id_estado === 5 || r.id_estado === 2);
  const canceladasMes = reservas.filter(r => r.id_estado === 4 && r.fecha_reserva?.startsWith(mesActual));

  // Espacios únicos
  const espaciosUnicos = new Set(noCancel.map(r => r.id_espacio)).size;

  // Madrugador: reservas antes de 09:00
  const madrugadas = noCancel.filter(r => {
    const h = parseInt(String(r.hora_inicio).slice(0, 2));
    return h < 9;
  }).length;

  // Puntualidad: check-ins (estado 2 o 5) vs total pasadas
  const pasadas = reservas.filter(r => r.fecha_reserva < mesActual || r.id_estado === 5 || r.id_estado === 2);
  const conCheckin = reservas.filter(r => r.id_estado === 2 || r.id_estado === 5);
  const puntualidad = pasadas.length > 0 ? Math.round((conCheckin.length / pasadas.length) * 100) : 0;

  const badges = [
    {
      id: 1, name: "Primer Paso", desc: "Primera reserva completada", icon: "🎯",
      earned: noCancel.length >= 1,
      progress: Math.min(noCancel.length, 1), target: 1,
    },
    {
      id: 2, name: "10 Reservas", desc: "Completar 10 reservas", icon: "📋",
      earned: noCancel.length >= 10,
      progress: Math.min(noCancel.length, 10), target: 10,
    },
    {
      id: 3, name: "50 Reservas", desc: "Completar 50 reservas", icon: "🏆",
      earned: noCancel.length >= 50,
      progress: Math.min(noCancel.length, 50), target: 50,
    },
    {
      id: 4, name: "Madrugador", desc: "5 reservas antes de las 9AM", icon: "🌅",
      earned: madrugadas >= 5,
      progress: Math.min(madrugadas, 5), target: 5,
    },
    {
      id: 5, name: "Explorador", desc: "Usar 5 espacios diferentes", icon: "🗺️",
      earned: espaciosUnicos >= 5,
      progress: Math.min(espaciosUnicos, 5), target: 5,
    },
    {
      id: 6, name: "Racha Semanal", desc: "7 días consecutivos reservando", icon: "🔥",
      earned: racha >= 7,
      progress: Math.min(racha, 7), target: 7,
    },
    {
      id: 7, name: "Puntual", desc: "80% de puntualidad (check-in)", icon: "⏰",
      earned: puntualidad >= 80 && pasadas.length >= 3,
      progress: puntualidad, target: 80,
    },
    {
      id: 8, name: "Sustentable", desc: "0 cancelaciones este mes", icon: "🌿",
      earned: canceladasMes.length === 0 && noCancel.length >= 1,
      progress: canceladasMes.length === 0 ? 1 : 0, target: 1,
    },
    {
      id: 9, name: "Nivel 10", desc: "Alcanzar nivel 10", icon: "👑",
      earned: nivel >= 10,
      progress: Math.min(nivel, 10), target: 10,
    },
  ];

  return { badges, puntualidad, espaciosUnicos };
}

// ── Desafío semanal ─────────────────────────────────────────────────────────

function calcularDesafioSemanal(reservas) {
  // Desafío: hacer reservas esta semana
  const hoy = new Date();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1); // Lunes
  inicioSemana.setHours(0, 0, 0, 0);

  const inicioStr = `${inicioSemana.getFullYear()}-${String(inicioSemana.getMonth() + 1).padStart(2, "0")}-${String(inicioSemana.getDate()).padStart(2, "0")}`;

  const reservasSemana = reservas.filter(r => r.fecha_reserva >= inicioStr && r.id_estado !== 4);

  // Espacios únicos esta semana
  const espaciosUnicos = new Set(reservasSemana.map(r => r.id_espacio)).size;

  return {
    title: "Reserva 3 espacios diferentes esta semana",
    progress: Math.min(espaciosUnicos, 3),
    target: 3,
    reward: 200,
  };
}

// ── API pública ─────────────────────────────────────────────────────────────

export async function obtenerGamificacion(userId) {
  // Traer reservas del usuario
  const { data: misReservas, error } = await supabase
    .from("Reserva")
    .select("id_reserva, id_espacio, fecha_reserva, hora_inicio, id_estado")
    .eq("id_usuario", userId)
    .order("fecha_reserva", { ascending: false });

  if (error) {
    console.error("Error trayendo reservas para gamificación:", error);
    return null;
  }

  const reservas = misReservas || [];
  const xp = calcularXP(reservas);
  const nivel = calcularNivel(xp);
  const rango = getRango(nivel);
  const racha = calcularRacha(reservas);
  const nextLevelXp = nivel * XP_POR_NIVEL;
  const { badges, puntualidad } = calcularBadges(reservas, xp, nivel, racha);
  const desafioSemanal = calcularDesafioSemanal(reservas);
  const totalReservas = reservas.filter(r => r.id_estado !== 4).length;

  return {
    xp, nivel, rango, racha, nextLevelXp,
    totalReservas, puntualidad,
    badges, desafioSemanal,
  };
}

export async function obtenerLeaderboard() {
  // Traer todas las reservas con usuario
  const { data, error } = await supabase
    .from("Reserva")
    .select("id_usuario, id_estado, Usuario(nombre, primer_apellido)");

  if (error || !data) return [];

  // Agrupar por usuario y calcular XP
  const userMap = {};
  for (const r of data) {
    if (!r.id_usuario) continue;
    if (!userMap[r.id_usuario]) {
      userMap[r.id_usuario] = {
        id: r.id_usuario,
        nombre: r.Usuario ? `${r.Usuario.nombre} ${r.Usuario.primer_apellido?.[0] || ""}` : "?",
        avatar: r.Usuario ? `${r.Usuario.nombre?.[0] || ""}${r.Usuario.primer_apellido?.[0] || ""}`.toUpperCase() : "??",
        reservas: [],
      };
    }
    userMap[r.id_usuario].reservas.push(r);
  }

  const leaderboard = Object.values(userMap)
    .map(u => ({
      id: u.id,
      name: u.nombre,
      avatar: u.avatar,
      xp: calcularXP(u.reservas),
    }))
    .filter(u => u.xp > 0)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10)
    .map((u, i) => ({ ...u, rank: i + 1 }));

  return leaderboard;
}
