// src/components/AdminDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "react-qr-code";
import { C } from "../config/constants";
import { supabase } from "../supabaseClient";
import { Icons } from "./ui/Icons";
import { BtnPrimary, BtnSecondary } from "./ui/Buttons";
import { StatusBadge } from "./ui/Widgets";

// ── Helpers ──────────────────────────────────────────────────────────────────

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const DIAS_SEMANA = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function hoyStr() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,"0")}-${String(h.getDate()).padStart(2,"0")}`;
}

// ── Animated number ─────────────────────────────────────────────────────────

function AnimatedNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef();
  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * eased));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);
  return <>{display}</>;
}

// ── Bar Chart (horizontal animated) ─────────────────────────────────────────

function BarChart({ data, color = C.purple1, maxBarWidth = 100 }) {
  const [animated, setAnimated] = useState(false);
  const maxVal = Math.max(...data.map(d => d.value), 1);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 100, fontSize: 12, color: C.textMuted, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</div>
          <div style={{ flex: 1, height: 24, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
            <div style={{
              height: "100%", borderRadius: 6,
              background: `linear-gradient(90deg, ${color}, ${C.purpleLight})`,
              width: animated ? `${(d.value / maxVal) * maxBarWidth}%` : "0%",
              transition: `width 1s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.08}s`,
              boxShadow: `0 0 12px ${color}40`,
            }} />
            <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>{d.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Donut Chart ─────────────────────────────────────────────────────────────

function DonutChart({ data, size = 160 }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t); }, []);

  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 60, cx = size / 2, cy = size / 2, circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="20" />
        {data.map((d, i) => {
          const pct = d.value / total;
          const dash = pct * circumference;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth="20"
              strokeDasharray={`${animated ? dash : 0} ${circumference}`}
              strokeDashoffset={-currentOffset}
              style={{ transition: `stroke-dasharray 1.2s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.15}s`, filter: `drop-shadow(0 0 6px ${d.color}50)` }}
            />
          );
        })}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="22" fontWeight="800"
          fontFamily="'JetBrains Mono', monospace" style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>
          {total}
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, boxShadow: `0 0 8px ${d.color}60` }} />
            <span style={{ color: C.textMuted }}>{d.label}</span>
            <span style={{ fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Line Chart (SVG animated) ───────────────────────────────────────────────

function BarChartVertical({ data, color = C.purple1 }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t); }, []);
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
        {data.map((d, i) => {
          const pct = (d.value / maxVal) * 100;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
              <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "#fff", fontWeight: 700, marginBottom: 4 }}>
                {d.value > 0 ? d.value : ""}
              </span>
              <div style={{
                width: "100%", maxWidth: 28, borderRadius: "4px 4px 0 0",
                background: `linear-gradient(180deg, ${color}, ${C.purpleLight})`,
                height: animated ? `${Math.max(pct, 4)}%` : "0%",
                transition: `height 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.05}s`,
                boxShadow: `0 0 8px ${color}30`,
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 9, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Heat Map (día/hora) ─────────────────────────────────────────────────────

function HeatMap({ data, height = 140 }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 300); return () => clearTimeout(t); }, []);

  // data = { "Lun-9": 5, "Mar-10": 3, ... }
  const horas = [7,8,9,10,11,12,13,14,15,16,17,18,19];
  const dias = ["Lun","Mar","Mié","Jue","Vie"];
  const maxVal = Math.max(...Object.values(data), 1);

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `40px repeat(${horas.length}, 1fr)`, gap: 3, minWidth: 500 }}>
        <div />
        {horas.map(h => (
          <div key={h} style={{ fontSize: 10, color: C.textMuted, textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{h}:00</div>
        ))}
        {dias.map((dia, di) => (
          <React.Fragment key={dia}>
            <div style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center" }}>{dia}</div>
            {horas.map((h, hi) => {
              const val = data[`${dia}-${h}`] || 0;
              const intensity = val / maxVal;
              return (
                <div key={h} title={`${dia} ${h}:00 — ${val} reservas`} style={{
                  height: 18, borderRadius: 3,
                  background: val > 0 ? `rgba(161,0,255,${animated ? intensity * 0.8 + 0.1 : 0})` : "rgba(255,255,255,0.03)",
                  transition: `background 0.8s ease ${(di * horas.length + hi) * 0.015}s`,
                  cursor: "default",
                  boxShadow: intensity > 0.6 ? `0 0 8px rgba(161,0,255,${intensity * 0.4})` : "none",
                }} />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Export to CSV ────────────────────────────────────────────────────────────

function exportToCSV(rows, headers, filename) {
  const BOM = "\uFEFF";
  const csv = BOM + [headers.join(","), ...rows.map(r => headers.map(h => {
    const val = r[h] ?? "";
    return typeof val === "string" && (val.includes(",") || val.includes('"')) ? `"${val.replace(/"/g, '""')}"` : val;
  }).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── Card wrapper ────────────────────────────────────────────────────────────

function Card({ title, children, style, action }) {
  return (
    <div style={{
      background: "rgba(161,0,255,0.06)", borderRadius: 16, border: `1px solid ${C.glassBorder}`,
      padding: 24, ...style,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function AdminDashboard({ animateIn }) {
  const [loading, setLoading] = useState(true);
  const [reservas, setReservas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [espacios, setEspacios] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userReservas, setUserReservas] = useState([]);
  const [tab, setTab] = useState("general");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [updatingUser, setUpdatingUser] = useState(null);
  const [zonas, setZonas] = useState([]);
  const [zonasEst, setZonasEst] = useState([]);
  const [qrLoading, setQrLoading] = useState(false);

  // ── Fetch data ──────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [rRes, uRes, eRes] = await Promise.all([
      supabase.from("Reserva").select("*, Espacio(codigo, tipo, capacidad, Zona(piso, nombre_zona)), Usuario(nombre, primer_apellido, correo)").order("fecha_reserva", { ascending: false }),
      supabase.from("Usuario").select("*"),
      supabase.from("Espacio").select("*, Zona(piso, nombre_zona)"),
    ]);
    if (rRes.data) setReservas(rRes.data);
    if (uRes.data) setUsuarios(uRes.data);
    if (eRes.data) setEspacios(eRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Fetch QR data (lazy — only when tab is active) ───────────────────────
  useEffect(() => {
    if (tab !== "qrcodes") return;
    setQrLoading(true);
    Promise.all([
      supabase.from("Zona").select("id_zona, nombre_zona, piso").order("piso"),
      supabase.from("ZonaEstacionamiento").select("id_zona_est, nombre_nivel, nivel").order("nivel"),
    ]).then(([{ data: z }, { data: ze }]) => {
      setZonas(z || []);
      setZonasEst(ze || []);
      setQrLoading(false);
    });
  }, [tab]);

  // ── Fetch user detail ────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedUser) { setUserReservas([]); return; }
    supabase.from("Reserva").select("*, Espacio(codigo, tipo, Zona(piso, nombre_zona))")
      .eq("id_usuario", selectedUser.id_usuario)
      .order("fecha_reserva", { ascending: false })
      .then(({ data }) => setUserReservas(data || []));
  }, [selectedUser]);

  // ── Computed stats ────────────────────────────────────────────────────────

  const hoy = hoyStr();
  const totalReservas = reservas.length;
  const reservasActivas = reservas.filter(r => r.id_estado === 1 || r.id_estado === 2 || r.id_estado === 3).length;
  const reservasHoy = reservas.filter(r => r.fecha_reserva === hoy && r.id_estado !== 4).length;
  const canceladas = reservas.filter(r => r.id_estado === 4).length;
  const finalizadas = reservas.filter(r => r.id_estado === 5).length;
  const noShows = reservas.filter(r => {
    if (r.id_estado !== 1 && r.id_estado !== 3) return false;
    return r.fecha_reserva < hoy;
  }).length;

  // Espacios más usados
  const espacioCount = {};
  reservas.filter(r => r.id_estado !== 4).forEach(r => {
    const code = r.Espacio?.codigo || "?";
    espacioCount[code] = (espacioCount[code] || 0) + 1;
  });
  const topEspacios = Object.entries(espacioCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  // Usuarios más activos
  const userCount = {};
  reservas.filter(r => r.id_estado !== 4).forEach(r => {
    const name = r.Usuario ? `${r.Usuario.nombre} ${r.Usuario.primer_apellido}` : "?";
    userCount[name] = (userCount[name] || 0) + 1;
  });
  const topUsuarios = Object.entries(userCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  // Reservas por estado (donut)
  const donutData = [
    { label: "Confirmadas", value: reservas.filter(r => r.id_estado === 1).length, color: C.blue },
    { label: "Activas", value: reservas.filter(r => r.id_estado === 2).length, color: C.success },
    { label: "Pendientes", value: reservas.filter(r => r.id_estado === 3).length, color: C.warning },
    { label: "Canceladas", value: canceladas, color: C.danger },
    { label: "Finalizadas", value: finalizadas, color: C.purpleLight },
  ].filter(d => d.value > 0);

  // Reservas por día (últimos 14 días)
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const count = reservas.filter(r => r.fecha_reserva === ds && r.id_estado !== 4).length;
    last14.push({ label: `${d.getDate()}/${d.getMonth()+1}`, value: count });
  }

  // Heat map data
  const heatData = {};
  reservas.filter(r => r.id_estado !== 4).forEach(r => {
    const d = new Date(r.fecha_reserva + "T12:00:00");
    const dia = DIAS_SEMANA[d.getDay()];
    if (dia === "Dom" || dia === "Sáb") return;
    const diaMap = { "Lun": "Lun", "Mar": "Mar", "Mié": "Mié", "Jue": "Jue", "Vie": "Vie" };
    const diaKey = diaMap[dia];
    if (!diaKey) return;
    const hora = parseInt(String(r.hora_inicio).slice(0, 2));
    const key = `${diaKey}-${hora}`;
    heatData[key] = (heatData[key] || 0) + 1;
  });

  // Tasa de asistencia
  const reservasPasadas = reservas.filter(r => r.fecha_reserva < hoy && r.id_estado !== 4);
  const asistieron = reservas.filter(r => r.fecha_reserva < hoy && (r.id_estado === 2 || r.id_estado === 5));
  const tasaAsistencia = reservasPasadas.length > 0 ? Math.round((asistieron.length / reservasPasadas.length) * 100) : 0;

  // ── User detail stats ──────────────────────────────────────────────────

  const userTotalReservas = userReservas.length;
  const userActivas = userReservas.filter(r => r.id_estado === 1 || r.id_estado === 2 || r.id_estado === 3).length;
  const userCanceladas = userReservas.filter(r => r.id_estado === 4).length;
  const userFinalizadas = userReservas.filter(r => r.id_estado === 5).length;
  const userNoShows = userReservas.filter(r => (r.id_estado === 1 || r.id_estado === 3) && r.fecha_reserva < hoy).length;
  const userAsistio = userReservas.filter(r => r.fecha_reserva < hoy && (r.id_estado === 2 || r.id_estado === 5)).length;
  const userPasadas = userReservas.filter(r => r.fecha_reserva < hoy && r.id_estado !== 4).length;
  const userTasaAsistencia = userPasadas > 0 ? Math.round((userAsistio / userPasadas) * 100) : 0;

  // ── Export handlers ───────────────────────────────────────────────────

  const exportGeneral = () => {
    const headers = ["fecha_reserva","hora_inicio","hora_fin","espacio","tipo","piso","usuario","correo","asistentes","estado"];
    const estadoMap = { 1: "Confirmada", 2: "Activa", 3: "Pendiente", 4: "Cancelada", 5: "Finalizada" };
    const rows = reservas.map(r => ({
      fecha_reserva: r.fecha_reserva,
      hora_inicio: r.hora_inicio,
      hora_fin: r.hora_fin,
      espacio: r.Espacio?.codigo || "",
      tipo: r.Espacio?.tipo || "",
      piso: r.Espacio?.Zona?.piso || "",
      usuario: r.Usuario ? `${r.Usuario.nombre} ${r.Usuario.primer_apellido}` : "",
      correo: r.Usuario?.correo || "",
      asistentes: r.asistentes,
      estado: estadoMap[r.id_estado] || r.id_estado,
    }));
    exportToCSV(rows, headers, `reservas_${hoy}`);
  };

  const exportUsuarios = () => {
    const headers = ["nombre","apellido","correo","total_reservas","activas","canceladas","finalizadas","no_shows"];
    const rows = usuarios.map(u => {
      const ur = reservas.filter(r => r.id_usuario === u.id_usuario);
      return {
        nombre: u.nombre,
        apellido: u.primer_apellido,
        correo: u.correo,
        total_reservas: ur.length,
        activas: ur.filter(r => [1,2,3].includes(r.id_estado)).length,
        canceladas: ur.filter(r => r.id_estado === 4).length,
        finalizadas: ur.filter(r => r.id_estado === 5).length,
        no_shows: ur.filter(r => (r.id_estado === 1 || r.id_estado === 3) && r.fecha_reserva < hoy).length,
      };
    });
    exportToCSV(rows, headers, `usuarios_${hoy}`);
  };

  // ── Filtered reservas for reports ─────────────────────────────────────

  const reservasFiltradas = reservas.filter(r => {
    if (fechaDesde && r.fecha_reserva < fechaDesde) return false;
    if (fechaHasta && r.fecha_reserva > fechaHasta) return false;
    return true;
  });

  const rfNoCancel = reservasFiltradas.filter(r => r.id_estado !== 4);
  const rfCanceladas = reservasFiltradas.filter(r => r.id_estado === 4);
  const rfNoShows = reservasFiltradas.filter(r => (r.id_estado === 1 || r.id_estado === 3) && r.fecha_reserva < hoy);
  const rfAsistieron = reservasFiltradas.filter(r => r.fecha_reserva < hoy && (r.id_estado === 2 || r.id_estado === 5));
  const rfPasadas = reservasFiltradas.filter(r => r.fecha_reserva < hoy && r.id_estado !== 4);

  // ── User management ───────────────────────────────────────────────────

  const toggleUserEstado = async (user) => {
    const nuevoEstado = user.estado === "activo" ? "inactivo" : "activo";
    setUpdatingUser(user.id_usuario);
    const { error } = await supabase.from("Usuario").update({ estado: nuevoEstado }).eq("id_usuario", user.id_usuario);
    if (!error) await fetchAll();
    setUpdatingUser(null);
  };

  const cambiarRol = async (user, nuevoRol) => {
    setUpdatingUser(user.id_usuario);
    const { error } = await supabase.from("Usuario").update({ id_rol: nuevoRol }).eq("id_usuario", user.id_usuario);
    if (!error) await fetchAll();
    setUpdatingUser(null);
  };

  // ── Report exports ────────────────────────────────────────────────────

  const estadoMap = { 1: "Confirmada", 2: "Activa", 3: "Pendiente", 4: "Cancelada", 5: "Finalizada" };

  const exportAsistencias = () => {
    const headers = ["fecha_reserva","hora_inicio","hora_fin","espacio","usuario","correo","asistentes","estado","asistio"];
    const rows = rfPasadas.map(r => ({
      fecha_reserva: r.fecha_reserva, hora_inicio: r.hora_inicio, hora_fin: r.hora_fin,
      espacio: r.Espacio?.codigo || "", usuario: r.Usuario ? `${r.Usuario.nombre} ${r.Usuario.primer_apellido}` : "",
      correo: r.Usuario?.correo || "", asistentes: r.asistentes, estado: estadoMap[r.id_estado] || r.id_estado,
      asistio: (r.id_estado === 2 || r.id_estado === 5) ? "Sí" : "No (No-Show)",
    }));
    exportToCSV(rows, headers, `reporte_asistencias_${hoy}`);
  };

  const exportCancelaciones = () => {
    const headers = ["fecha_reserva","hora_inicio","hora_fin","espacio","tipo","usuario","correo","asistentes","fecha_solicitud"];
    const rows = rfCanceladas.map(r => ({
      fecha_reserva: r.fecha_reserva, hora_inicio: r.hora_inicio, hora_fin: r.hora_fin,
      espacio: r.Espacio?.codigo || "", tipo: r.Espacio?.tipo || "",
      usuario: r.Usuario ? `${r.Usuario.nombre} ${r.Usuario.primer_apellido}` : "",
      correo: r.Usuario?.correo || "", asistentes: r.asistentes,
      fecha_solicitud: r.fecha_solicitud || "",
    }));
    exportToCSV(rows, headers, `reporte_cancelaciones_${hoy}`);
  };

  const exportEspaciosRanking = () => {
    const headers = ["espacio","tipo","piso","total_reservas","asistentes_totales"];
    const espMap = {};
    rfNoCancel.forEach(r => {
      const code = r.Espacio?.codigo || "?";
      if (!espMap[code]) espMap[code] = { espacio: code, tipo: r.Espacio?.tipo || "", piso: r.Espacio?.Zona?.piso || "", total_reservas: 0, asistentes_totales: 0 };
      espMap[code].total_reservas++;
      espMap[code].asistentes_totales += r.asistentes || 0;
    });
    const rows = Object.values(espMap).sort((a, b) => b.total_reservas - a.total_reservas);
    exportToCSV(rows, headers, `reporte_espacios_${hoy}`);
  };

  // Date filter component
  const DateFilter = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: C.textMuted }}>Desde</span>
      <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{
        padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.glassBorder}`,
        background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 12, fontFamily: "inherit",
      }} />
      <span style={{ fontSize: 12, color: C.textMuted }}>Hasta</span>
      <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{
        padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.glassBorder}`,
        background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 12, fontFamily: "inherit",
      }} />
      {(fechaDesde || fechaHasta) && (
        <button onClick={() => { setFechaDesde(""); setFechaHasta(""); }} style={{
          padding: "6px 10px", borderRadius: 8, border: "none", background: "rgba(248,113,113,0.15)",
          color: C.danger, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
        }}>Limpiar</button>
      )}
    </div>
  );

  // ── Styles ────────────────────────────────────────────────────────────

  const statBox = (label, value, color, icon) => (
    <div style={{
      background: "rgba(161,0,255,0.06)", borderRadius: 14, border: `1px solid ${C.glassBorder}`,
      padding: "20px 24px", flex: 1, minWidth: 160,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color, lineHeight: 1 }}>
            <AnimatedNumber value={value} />
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
        </div>
        <div style={{ color, opacity: 0.6 }}>{icon}</div>
      </div>
    </div>
  );

  const tabBtn = (id, label) => (
    <button onClick={() => { setTab(id); if (id !== "perfil") setSelectedUser(null); }} style={{
      padding: "10px 20px", borderRadius: 10, border: `1px solid ${tab === id ? C.purple1 : C.glassBorder}`,
      background: tab === id ? `${C.purple1}25` : "transparent", color: tab === id ? C.purpleLight : C.textMuted,
      fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s",
    }}>{label}</button>
  );

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", opacity: animateIn ? 1 : 0, transition: "opacity 0.5s" }}>
        <div style={{ fontSize: 18, color: C.textMuted }}>Cargando estadísticas...</div>
      </div>
    );
  }

  return (
    <div style={{ opacity: animateIn ? 1 : 0, transform: animateIn ? "none" : "translateY(20px)", transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Panel de Administración</h1>
          <p style={{ fontSize: 14, color: C.textMuted }}>Estadísticas y gestión de usuarios</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {tabBtn("general", "Dashboard")}
          {tabBtn("reportes", "Reportes")}
          {tabBtn("usuarios", "Usuarios")}
          {tabBtn("qrcodes", "Códigos QR")}
        </div>
      </div>

      {/* ═══════ TAB: GENERAL ═══════ */}
      {tab === "general" && (
        <>
          {/* Stats row */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            {statBox("Total Reservas", totalReservas, C.purpleLight, Icons.calendar)}
            {statBox("Hoy", reservasHoy, C.blue, Icons.clock)}
            {statBox("Activas", reservasActivas, C.success, Icons.check)}
            {statBox("No-Shows", noShows, C.danger, Icons.alert)}
            {statBox("Asistencia", tasaAsistencia, C.warning,
              <span style={{ fontSize: 11, fontWeight: 700 }}>%</span>
            )}
          </div>

          {/* Charts row 1 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <Card title="Reservas por Estado">
              <DonutChart data={donutData} />
            </Card>
            <Card title="Últimos 14 Días" action={
              <button onClick={exportGeneral} style={{
                padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.glassBorder}`,
                background: "rgba(161,0,255,0.12)", color: C.purpleLight, fontSize: 12, cursor: "pointer",
                fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
              }}>
                {Icons.trendUp} Exportar CSV
              </button>
            }>
              <BarChartVertical data={last14} color={C.purple1} />
            </Card>
          </div>

          {/* Charts row 2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <Card title="Espacios Más Utilizados">
              <BarChart data={topEspacios} color={C.purple1} />
            </Card>
            <Card title="Usuarios Más Activos">
              <BarChart data={topUsuarios} color={C.success} />
            </Card>
          </div>

          {/* Heat map */}
          <Card title="Mapa de Calor — Horarios Más Demandados">
            <HeatMap data={heatData} />
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 11, color: C.textMuted }}>Menos</span>
              {[0.1, 0.3, 0.5, 0.7, 0.9].map(o => (
                <span key={o} style={{ width: 14, height: 14, borderRadius: 3, background: `rgba(161,0,255,${o})` }} />
              ))}
              <span style={{ fontSize: 11, color: C.textMuted }}>Más</span>
            </div>
          </Card>
        </>
      )}

      {/* ═══════ TAB: REPORTES ═══════ */}
      {tab === "reportes" && (
        <>
          <div style={{ marginBottom: 20 }}>
            <DateFilter />
          </div>

          {/* Reporte de Asistencias */}
          <Card title={`Reporte de Asistencias (${rfPasadas.length} reservas pasadas)`} action={
            <button onClick={exportAsistencias} style={{
              padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.glassBorder}`,
              background: "rgba(161,0,255,0.12)", color: C.purpleLight, fontSize: 12, cursor: "pointer",
              fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
            }}>{Icons.trendUp} Exportar CSV</button>
          }>
            <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
              {statBox("Asistieron", rfAsistieron.length, C.success, Icons.check)}
              {statBox("No-Shows", rfNoShows.length, C.danger, Icons.alert)}
              {statBox("Tasa Asistencia", rfPasadas.length > 0 ? Math.round((rfAsistieron.length / rfPasadas.length) * 100) : 0, C.warning,
                <span style={{ fontSize: 11, fontWeight: 700 }}>%</span>
              )}
            </div>
            <div style={{ maxHeight: 350, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Fecha","Horario","Espacio","Usuario","Correo","Asistentes","Resultado"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: C.textMuted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${C.glassBorder}`, position: "sticky", top: 0, background: "rgba(161,0,255,0.06)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rfPasadas.map((r, i) => {
                    const asistio = r.id_estado === 2 || r.id_estado === 5;
                    return (
                      <tr key={r.id_reserva} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, color: "#fff" }}>{r.fecha_reserva}</td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, fontFamily: "'JetBrains Mono', monospace", color: C.textMuted }}>{String(r.hora_inicio).slice(0,5)} - {String(r.hora_fin).slice(0,5)}</td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, color: "#fff", fontWeight: 600 }}>{r.Espacio?.codigo || "—"}</td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, color: "#fff" }}>{r.Usuario ? `${r.Usuario.nombre} ${r.Usuario.primer_apellido}` : "—"}</td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, color: C.textMuted }}>{r.Usuario?.correo || "—"}</td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, fontFamily: "'JetBrains Mono', monospace", color: "#fff" }}>{r.asistentes}</td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: asistio ? `${C.success}20` : `${C.danger}20`,
                            color: asistio ? C.success : C.danger,
                          }}>{asistio ? "Asistió" : "No-Show"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rfPasadas.length === 0 && <p style={{ textAlign: "center", color: C.textMuted, padding: 20, fontSize: 13 }}>No hay reservas pasadas en el rango seleccionado</p>}
            </div>
          </Card>

          <div style={{ height: 20 }} />

          {/* Reporte de Cancelaciones */}
          <Card title={`Reporte de Cancelaciones (${rfCanceladas.length})`} action={
            <button onClick={exportCancelaciones} style={{
              padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.glassBorder}`,
              background: "rgba(161,0,255,0.12)", color: C.purpleLight, fontSize: 12, cursor: "pointer",
              fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
            }}>{Icons.trendUp} Exportar CSV</button>
          }>
            <div style={{ maxHeight: 350, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Fecha Reserva","Horario","Espacio","Tipo","Usuario","Correo","Asistentes"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: C.textMuted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${C.glassBorder}`, position: "sticky", top: 0, background: "rgba(161,0,255,0.06)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rfCanceladas.map((r, i) => (
                    <tr key={r.id_reserva} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, color: "#fff" }}>{r.fecha_reserva}</td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, fontFamily: "'JetBrains Mono', monospace", color: C.textMuted }}>{String(r.hora_inicio).slice(0,5)} - {String(r.hora_fin).slice(0,5)}</td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, color: "#fff", fontWeight: 600 }}>{r.Espacio?.codigo || "—"}</td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, color: C.textMuted }}>{r.Espacio?.tipo || "—"}</td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, color: "#fff" }}>{r.Usuario ? `${r.Usuario.nombre} ${r.Usuario.primer_apellido}` : "—"}</td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, color: C.textMuted }}>{r.Usuario?.correo || "—"}</td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, fontFamily: "'JetBrains Mono', monospace", color: "#fff" }}>{r.asistentes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rfCanceladas.length === 0 && <p style={{ textAlign: "center", color: C.textMuted, padding: 20, fontSize: 13 }}>No hay cancelaciones en el rango seleccionado</p>}
            </div>
          </Card>

          <div style={{ height: 20 }} />

          {/* Reporte de Espacios Más Utilizados */}
          <Card title={`Espacios Más Utilizados (${rfNoCancel.length} reservas)`} action={
            <button onClick={exportEspaciosRanking} style={{
              padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.glassBorder}`,
              background: "rgba(161,0,255,0.12)", color: C.purpleLight, fontSize: 12, cursor: "pointer",
              fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
            }}>{Icons.trendUp} Exportar CSV</button>
          }>
            {(() => {
              const espMap = {};
              rfNoCancel.forEach(r => {
                const code = r.Espacio?.codigo || "?";
                if (!espMap[code]) espMap[code] = { codigo: code, tipo: r.Espacio?.tipo || "", total: 0, asistentes: 0 };
                espMap[code].total++;
                espMap[code].asistentes += r.asistentes || 0;
              });
              const ranking = Object.values(espMap).sort((a, b) => b.total - a.total);
              if (ranking.length === 0) return <p style={{ textAlign: "center", color: C.textMuted, padding: 20, fontSize: 13 }}>No hay reservas en el rango seleccionado</p>;
              return (
                <>
                  <BarChart data={ranking.slice(0, 10).map(e => ({ label: e.codigo, value: e.total }))} color={C.purple1} />
                  <div style={{ marginTop: 16, maxHeight: 250, overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr>
                          {["#","Espacio","Tipo","Reservas","Asistentes Totales"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: C.textMuted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${C.glassBorder}`, position: "sticky", top: 0, background: "rgba(161,0,255,0.06)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ranking.map((e, i) => (
                          <tr key={e.codigo} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                            <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, fontFamily: "'JetBrains Mono', monospace", color: i < 3 ? C.warning : C.textMuted, fontWeight: i < 3 ? 700 : 400 }}>{i + 1}</td>
                            <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, color: "#fff", fontWeight: 600 }}>{e.codigo}</td>
                            <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, color: C.textMuted }}>{e.tipo}</td>
                            <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, fontFamily: "'JetBrains Mono', monospace", color: "#fff", fontWeight: 700 }}>{e.total}</td>
                            <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, fontFamily: "'JetBrains Mono', monospace", color: C.textMuted }}>{e.asistentes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </Card>
        </>
      )}

      {/* ═══════ TAB: USUARIOS ═══════ */}
      {tab === "usuarios" && !selectedUser && (
        <Card title={`Usuarios Registrados (${usuarios.length})`} action={
          <button onClick={exportUsuarios} style={{
            padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.glassBorder}`,
            background: "rgba(161,0,255,0.12)", color: C.purpleLight, fontSize: 12, cursor: "pointer",
            fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
          }}>
            {Icons.trendUp} Exportar CSV
          </button>
        }>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Usuario","Correo","Rol","Estado","Reservas","No-Shows","Asistencia","Acciones"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: C.textMuted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${C.glassBorder}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, i) => {
                  const ur = reservas.filter(r => r.id_usuario === u.id_usuario);
                  const uActivas = ur.filter(r => [1,2,3].includes(r.id_estado)).length;
                  const uNoShows = ur.filter(r => (r.id_estado === 1 || r.id_estado === 3) && r.fecha_reserva < hoy).length;
                  const uPasadas = ur.filter(r => r.fecha_reserva < hoy && r.id_estado !== 4).length;
                  const uAsistio = ur.filter(r => r.fecha_reserva < hoy && (r.id_estado === 2 || r.id_estado === 5)).length;
                  const uTasa = uPasadas > 0 ? Math.round((uAsistio / uPasadas) * 100) : 0;
                  const iniciales = `${u.nombre?.[0] || ""}${u.primer_apellido?.[0] || ""}`.toUpperCase();

                  return (
                    <tr key={u.id_usuario} style={{
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                      transition: "background 0.2s",
                    }} onMouseEnter={e => e.currentTarget.style.background = "rgba(161,0,255,0.08)"}
                       onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)"}>
                      <td style={{ padding: "12px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.purple1}, ${C.purpleLight})`,
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff",
                          }}>{iniciales}</div>
                          <span style={{ fontWeight: 600, color: "#fff" }}>{u.nombre} {u.primer_apellido}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px", color: C.textMuted, borderBottom: `1px solid rgba(255,255,255,0.04)` }}>{u.correo}</td>
                      <td style={{ padding: "12px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                        <select value={u.id_rol} onChange={e => cambiarRol(u, parseInt(e.target.value))}
                          disabled={updatingUser === u.id_usuario}
                          style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit",
                            background: u.id_rol === 1 ? `${C.purple1}30` : "rgba(255,255,255,0.08)",
                            color: u.id_rol === 1 ? C.purpleLight : C.textMuted,
                          }}>
                          <option value={1} style={{ background: "#1a0a1e" }}>Admin</option>
                          <option value={2} style={{ background: "#1a0a1e" }}>Empleado</option>
                        </select>
                      </td>
                      <td style={{ padding: "12px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                        <button onClick={() => toggleUserEstado(u)} disabled={updatingUser === u.id_usuario} style={{
                          padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit",
                          background: (u.estado || "activo") === "activo" ? `${C.success}20` : `${C.danger}20`,
                          color: (u.estado || "activo") === "activo" ? C.success : C.danger,
                        }}>{(u.estado || "activo") === "activo" ? "Activo" : "Inactivo"}</button>
                      </td>
                      <td style={{ padding: "12px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#fff", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>{ur.length}</td>
                      <td style={{ padding: "12px", fontFamily: "'JetBrains Mono', monospace", color: uNoShows > 0 ? C.danger : C.textMuted, fontWeight: uNoShows > 0 ? 700 : 400, borderBottom: `1px solid rgba(255,255,255,0.04)` }}>{uNoShows}</td>
                      <td style={{ padding: "12px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", maxWidth: 80 }}>
                            <div style={{ height: "100%", borderRadius: 3, background: uTasa >= 80 ? C.success : uTasa >= 50 ? C.warning : C.danger, width: `${uTasa}%`, transition: "width 1s" }} />
                          </div>
                          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: uTasa >= 80 ? C.success : uTasa >= 50 ? C.warning : C.danger }}>{uTasa}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                        <button onClick={() => { setSelectedUser(u); setTab("perfil"); }} style={{
                          padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.glassBorder}`,
                          background: "transparent", color: C.purpleLight, fontSize: 12, cursor: "pointer",
                          fontFamily: "inherit", fontWeight: 600,
                        }}>Ver perfil</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ═══════ TAB: CÓDIGOS QR ═══════ */}
      {tab === "qrcodes" && (
        <>
          {/* Print CSS — se inyecta solo cuando este tab está activo */}
          <style>{`
            @media print {
              header, nav, .tab-bar, button { display: none !important; }
              body { background: white !important; color: black !important; }
              .qr-card { page-break-inside: avoid; }
            }
          `}</style>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>
              Imprime o coloca cada código en su zona. Al escanearlo, el usuario verá solo su reserva de esa zona.
            </p>
            <button
              onClick={() => window.print()}
              style={{
                padding: "8px 18px", borderRadius: 10, border: `1px solid ${C.glassBorder}`,
                background: "rgba(161,0,255,0.12)", color: C.purpleLight, fontSize: 13,
                cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              🖨️ Imprimir todos
            </button>
          </div>

          {qrLoading ? (
            <div style={{ textAlign: "center", color: C.textMuted, padding: 40 }}>Cargando zonas...</div>
          ) : (
            <>
              {/* ── Zonas de trabajo ── */}
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.purpleLight, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                🏢 Zonas de Trabajo
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20, marginBottom: 32 }}>
                {zonas.map(z => {
                  const qrUrl = `${window.location.origin}/checkin?zona=${z.id_zona}`;
                  return (
                    <div key={z.id_zona} className="qr-card" style={{
                      background: "rgba(161,0,255,0.06)", borderRadius: 16,
                      border: `1px solid ${C.glassBorder}`, padding: 24,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
                    }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0, textAlign: "center" }}>
                        Piso {z.piso} · {z.nombre_zona}
                      </h4>
                      <div style={{ background: "#fff", padding: 14, borderRadius: 12 }}>
                        <QRCode value={qrUrl} size={170} />
                      </div>
                      <p style={{ fontSize: 10, color: C.textMuted, textAlign: "center", wordBreak: "break-all", margin: 0 }}>
                        {qrUrl}
                      </p>
                      <button
                        onClick={() => navigator.clipboard.writeText(qrUrl)}
                        style={{
                          padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.glassBorder}`,
                          background: "transparent", color: C.textMuted, fontSize: 11,
                          cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                        }}
                      >
                        📋 Copiar URL
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* ── Zonas de estacionamiento ── */}
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.purpleLight, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                🅿️ Estacionamiento
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
                {zonasEst.map(ze => {
                  const qrUrl = `${window.location.origin}/checkin?parking=${ze.id_zona_est}`;
                  return (
                    <div key={ze.id_zona_est} className="qr-card" style={{
                      background: "rgba(161,0,255,0.06)", borderRadius: 16,
                      border: `1px solid ${C.glassBorder}`, padding: 24,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
                    }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0, textAlign: "center" }}>
                        {ze.nombre_nivel}
                      </h4>
                      <div style={{ background: "#fff", padding: 14, borderRadius: 12 }}>
                        <QRCode value={qrUrl} size={170} />
                      </div>
                      <p style={{ fontSize: 10, color: C.textMuted, textAlign: "center", wordBreak: "break-all", margin: 0 }}>
                        {qrUrl}
                      </p>
                      <button
                        onClick={() => navigator.clipboard.writeText(qrUrl)}
                        style={{
                          padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.glassBorder}`,
                          background: "transparent", color: C.textMuted, fontSize: 11,
                          cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                        }}
                      >
                        📋 Copiar URL
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ═══════ TAB: PERFIL INDIVIDUAL ═══════ */}
      {tab === "perfil" && selectedUser && (
        <>
          <button onClick={() => { setTab("usuarios"); setSelectedUser(null); }} style={{
            padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.glassBorder}`,
            background: "transparent", color: C.textMuted, fontSize: 13, cursor: "pointer",
            fontFamily: "inherit", marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
          }}>
            ← Volver a usuarios
          </button>

          {/* User header card */}
          <div style={{
            background: `linear-gradient(135deg, ${C.purple1}15, ${C.purpleLight}10)`,
            borderRadius: 16, border: `1px solid ${C.glassBorder}`, padding: 28, marginBottom: 24,
            display: "flex", alignItems: "center", gap: 24,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 16, background: `linear-gradient(135deg, ${C.purple1}, ${C.purpleLight})`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff",
              boxShadow: `0 8px 24px ${C.purple1}40`,
            }}>
              {`${selectedUser.nombre?.[0] || ""}${selectedUser.primer_apellido?.[0] || ""}`.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{selectedUser.nombre} {selectedUser.primer_apellido} {selectedUser.segundo_apellido || ""}</h2>
              <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0" }}>{selectedUser.correo}</p>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <span style={{
                  padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                  background: selectedUser.id_rol === 1 ? `${C.purple1}30` : "rgba(255,255,255,0.08)",
                  color: selectedUser.id_rol === 1 ? C.purpleLight : C.textMuted,
                }}>{selectedUser.id_rol === 1 ? "Administrador" : "Empleado"}</span>
                {selectedUser.numero_empleado && (
                  <span style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, background: "rgba(255,255,255,0.06)", color: C.textMuted }}>
                    #{selectedUser.numero_empleado}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* User stats */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            {statBox("Total Reservas", userTotalReservas, C.purpleLight, Icons.calendar)}
            {statBox("Activas", userActivas, C.success, Icons.check)}
            {statBox("Canceladas", userCanceladas, C.warning, Icons.alert)}
            {statBox("No-Shows", userNoShows, C.danger,
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            )}
            {statBox("Asistencia", userTasaAsistencia, userTasaAsistencia >= 80 ? C.success : userTasaAsistencia >= 50 ? C.warning : C.danger,
              <span style={{ fontSize: 11, fontWeight: 700 }}>%</span>
            )}
          </div>

          {/* User donut + reservas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <Card title="Distribución de Reservas">
              <DonutChart data={[
                { label: "Confirmadas", value: userReservas.filter(r => r.id_estado === 1).length, color: C.blue },
                { label: "Activas", value: userReservas.filter(r => r.id_estado === 2).length, color: C.success },
                { label: "Pendientes", value: userReservas.filter(r => r.id_estado === 3).length, color: C.warning },
                { label: "Canceladas", value: userCanceladas, color: C.danger },
                { label: "Finalizadas", value: userFinalizadas, color: C.purpleLight },
              ].filter(d => d.value > 0)} />
            </Card>
            <Card title="Espacios Frecuentes">
              {(() => {
                const ec = {};
                userReservas.filter(r => r.id_estado !== 4).forEach(r => {
                  const code = r.Espacio?.codigo || "?";
                  ec[code] = (ec[code] || 0) + 1;
                });
                const top = Object.entries(ec).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }));
                return top.length ? <BarChart data={top} color={C.purple1} /> : <p style={{ color: C.textMuted, fontSize: 13 }}>Sin reservas</p>;
              })()}
            </Card>
          </div>

          {/* Historial de reservas */}
          <Card title={`Historial de Reservas (${userReservas.length})`}>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Fecha","Horario","Espacio","Tipo","Asistentes","Estado"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: C.textMuted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${C.glassBorder}`, position: "sticky", top: 0, background: "rgba(161,0,255,0.06)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {userReservas.map((r, i) => {
                    const estadoMap = { 1: "confirmed", 2: "active", 3: "pending", 4: "cancelled", 5: "finished" };
                    const isNoShow = (r.id_estado === 1 || r.id_estado === 3) && r.fecha_reserva < hoy;
                    return (
                      <tr key={r.id_reserva} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, color: "#fff" }}>{r.fecha_reserva}</td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, fontFamily: "'JetBrains Mono', monospace", color: C.textMuted }}>{String(r.hora_inicio).slice(0,5)} - {String(r.hora_fin).slice(0,5)}</td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, color: "#fff", fontWeight: 600 }}>{r.Espacio?.codigo || "—"}</td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, color: C.textMuted }}>{r.Espacio?.tipo || "—"}</td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)`, fontFamily: "'JetBrains Mono', monospace", color: "#fff" }}>{r.asistentes}</td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                          {isNoShow ? (
                            <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${C.danger}25`, color: C.danger }}>No-Show</span>
                          ) : (
                            <StatusBadge status={estadoMap[r.id_estado] || "pending"} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
