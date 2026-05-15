// src/components/FloorEditor.jsx
// Editor visual de plano: dibuja áreas con el mouse sobre el PNG del piso.
import React, { useState, useRef, useEffect, useCallback } from "react";
import { C } from "../config/constants";
import { Icons } from "./ui/Icons";
import { BtnPrimary, BtnSecondary } from "./ui/Buttons";
import { supabase } from "../supabaseClient";

const FLOOR_CONFIG = {
  1: { label: "PB",     img: "/floors/piso-pb.png" },
  2: { label: "MZ",     img: "/floors/piso-mz.png" },
  3: { label: "Piso 3", img: "/floors/piso-3.png"  },
  4: { label: "Piso 9", img: "/floors/piso-9.png"  },
};

const TIPOS = ["Sala de Juntas", "Open Space", "Phone Booth", "Pantry", "Recepcion", "Media Scape", "Comedor", "Work Lab", "Area Colaborativa", "Touch Point", "Hot Desk", "Zona Creativa", "Oficina"];

export default function FloorEditor({ animateIn }) {
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [areas, setAreas] = useState([]);       // áreas existentes del piso
  const [drawing, setDrawing] = useState(null);  // {startX, startY} mientras se dibuja
  const [tempRect, setTempRect] = useState(null); // rect temporal durante drag
  const [selectedArea, setSelectedArea] = useState(null); // área seleccionada para editar
  const [editForm, setEditForm] = useState({ codigo: "", tipo: "Sala de Juntas", capacidad: 4 });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const svgRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Cargar áreas existentes del piso ──
  const fetchAreas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("Espacio")
      .select("*, Zona(piso, nombre_zona)")
      .eq("Zona.piso", selectedFloor);

    if (!error && data) {
      // Filtrar porque el eq en relación puede traer nulls
      const filtered = data.filter(e => e.Zona?.piso === selectedFloor);
      setAreas(filtered);
    } else if (error) {
      console.error("Error cargando espacios:", error);
    }
    setLoading(false);
    setSelectedArea(null); setTempRect(null);
  }, [selectedFloor]);

  useEffect(() => { fetchAreas(); }, [fetchAreas]);

  // ── Helpers para convertir coords de mouse a SVG viewBox ──
  const mouseToSvg = (e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 71;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(71, y)) };
  };

  // ── Mouse handlers para dibujar ──
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // solo click izquierdo
    // No dibujar si click sobre un área existente
    if (e.target.closest("[data-area-id]")) return;
    const pos = mouseToSvg(e);
    setDrawing({ startX: pos.x, startY: pos.y });
    setTempRect(null);
    setSelectedArea(null);
  };

  const handleMouseMove = (e) => {
    if (!drawing) return;
    const pos = mouseToSvg(e);
    const x = Math.min(drawing.startX, pos.x);
    const y = Math.min(drawing.startY, pos.y);
    const w = Math.abs(pos.x - drawing.startX);
    const h = Math.abs(pos.y - drawing.startY);
    if (w > 1 && h > 1) {
      setTempRect({ x, y, w, h });
    }
  };

  const handleMouseUp = () => {
    if (drawing && tempRect && tempRect.w > 2 && tempRect.h > 2) {
      // Abrir form para asignar datos al nuevo rectángulo — mantener tempRect visible
      setSelectedArea({ isNew: true, rect: tempRect });
      setEditForm({ codigo: "", tipo: "Sala de Juntas", capacidad: 4 });
    } else {
      setTempRect(null);
    }
    setDrawing(null);
  };

  // ── Click en área existente ──
  const handleAreaClick = (e, espacio) => {
    e.stopPropagation();
    setSelectedArea({ isNew: false, espacio });
    setEditForm({
      codigo: espacio.codigo || "",
      tipo: espacio.tipo || "Sala de Juntas",
      capacidad: espacio.capacidad || 4,
    });
  };

  // ── Obtener id_zona para el piso seleccionado ──
  const getZonaId = async () => {
    const { data } = await supabase
      .from("Zona")
      .select("id_zona")
      .eq("piso", selectedFloor)
      .limit(1)
      .single();
    return data?.id_zona;
  };

  // ── Guardar nueva área ──
  const handleSaveNew = async () => {
    if (!editForm.codigo.trim()) { showToast("El codigo es obligatorio.", "error"); return; }
    setSaving(true);
    try {
      const idZona = await getZonaId();
      if (!idZona) throw new Error("No se encontro la zona para este piso.");

      const { error } = await supabase.from("Espacio").insert({
        codigo: editForm.codigo.trim(),
        tipo: editForm.tipo,
        capacidad: parseInt(editForm.capacidad) || 4,
        coord_x: Math.round(selectedArea.rect.x * 10) / 10,
        coord_y: Math.round(selectedArea.rect.y * 10) / 10,
        ancho: Math.round(selectedArea.rect.w * 10) / 10,
        alto: Math.round(selectedArea.rect.h * 10) / 10,
        id_zona: idZona,
        estado_espacio: "disponible",
        disponible: true,
      });

      if (error) throw error;
      showToast(`Area "${editForm.codigo}" creada.`);
      setSelectedArea(null); setTempRect(null);
      fetchAreas();
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Actualizar área existente ──
  const handleUpdate = async () => {
    if (!editForm.codigo.trim()) { showToast("El codigo es obligatorio.", "error"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("Espacio")
        .update({
          codigo: editForm.codigo.trim(),
          tipo: editForm.tipo,
          capacidad: parseInt(editForm.capacidad) || 4,
        })
        .eq("id_espacio", selectedArea.espacio.id_espacio);

      if (error) throw error;
      showToast(`Area "${editForm.codigo}" actualizada.`);
      setSelectedArea(null); setTempRect(null);
      fetchAreas();
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar área ──
  const handleDelete = async () => {
    if (!selectedArea?.espacio) return;
    if (!window.confirm(`¿Eliminar "${selectedArea.espacio.codigo}"? Esto borrara el espacio y sus reservas asociadas podrian quedar huerfanas.`)) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("Espacio")
        .delete()
        .eq("id_espacio", selectedArea.espacio.id_espacio);

      if (error) throw error;
      showToast(`Area eliminada.`);
      setSelectedArea(null); setTempRect(null);
      fetchAreas();
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const floorImg = FLOOR_CONFIG[selectedFloor]?.img;

  return (
    <div style={{ animation: animateIn ? "fadeUp 0.5s ease forwards" : "none", opacity: animateIn ? 1 : 0 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Editor de Plano</h1>
          <p style={{ fontSize: 14, color: C.textMuted }}>Dibuja areas sobre el plano y asigna datos. Los cambios aplican para todos los usuarios.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: C.textMuted }}>Piso</span>
          <select value={selectedFloor} onChange={e => setSelectedFloor(+e.target.value)} style={{
            padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.glassBorder}`,
            background: "rgba(161,0,255,0.12)", color: C.text, fontSize: 14, fontFamily: "inherit", cursor: "pointer",
          }}>
            {Object.entries(FLOOR_CONFIG).map(([f, cfg]) => (
              <option key={f} value={f} style={{ background: "#1a0a1e" }}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Instrucciones */}
      <div style={{
        borderRadius: 12, padding: "12px 18px", marginBottom: 16,
        background: "rgba(161,0,255,0.08)", border: `1px solid ${C.glassBorder}`,
        fontSize: 13, color: C.textMuted, display: "flex", alignItems: "center", gap: 10,
      }}>
        {Icons.edit}
        <span><strong style={{ color: C.white }}>Click y arrastra</strong> sobre el plano para crear un area nueva. <strong style={{ color: C.white }}>Click en un area</strong> existente para editarla.</span>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* ── SVG Canvas ── */}
        <div style={{
          flex: 1, borderRadius: 16, border: `2px solid ${C.glassBorder}`,
          background: "rgba(0,0,0,0.6)", padding: 16, position: "relative", overflow: "hidden",
          cursor: drawing ? "crosshair" : "default",
        }}>
          <div style={{ position: "absolute", top: 12, left: 16, fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", zIndex: 2 }}>
            {FLOOR_CONFIG[selectedFloor]?.label} — {areas.length} areas
          </div>

          <svg
            ref={svgRef}
            viewBox="0 0 100 71"
            style={{ width: "100%", height: "auto", userSelect: "none" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { setDrawing(null); setTempRect(null); }}
          >
            {/* Plano de fondo */}
            {floorImg && (
              <image href={floorImg} x="0" y="0" width="100" height="71" preserveAspectRatio="xMidYMid meet" style={{ opacity: 0.85 }} />
            )}
            {!floorImg && (
              <>
                <rect x="0" y="0" width="100" height="71" fill="rgba(255,255,255,0.02)" />
                <text x="50" y="36" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="3">Sin plano — sube un PNG a /public/floors/</text>
              </>
            )}

            {/* Grid de referencia sutil */}
            {[10,20,30,40,50,60,70,80,90].map(x => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="71" stroke="rgba(255,255,255,0.06)" strokeWidth="0.15" />)}
            {[10,20,30,40,50,60].map(y => <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.15" />)}

            {/* Áreas existentes */}
            {areas.map(esp => {
              const isSelected = selectedArea && !selectedArea.isNew && selectedArea.espacio?.id_espacio === esp.id_espacio;
              return (
                <g key={esp.id_espacio} data-area-id={esp.id_espacio} onClick={(e) => handleAreaClick(e, esp)} style={{ cursor: "pointer" }}>
                  <rect
                    x={esp.coord_x} y={esp.coord_y} width={esp.ancho} height={esp.alto} rx="0.8"
                    fill={isSelected ? `${C.purple1}50` : `${C.success}25`}
                    stroke={isSelected ? C.purpleLight : `${C.success}90`}
                    strokeWidth={isSelected ? "0.6" : "0.3"}
                    strokeDasharray={isSelected ? "none" : "none"}
                  />
                  <text x={esp.coord_x + esp.ancho / 2} y={esp.coord_y + esp.alto / 2 - 0.5} textAnchor="middle" fill={C.white} fontSize={Math.min(1.6, esp.ancho / 6)} fontWeight="700" style={{ pointerEvents: "none", textShadow: "0 0 3px rgba(0,0,0,0.9)" }}>
                    {esp.tipo}
                  </text>
                  <text x={esp.coord_x + esp.ancho / 2} y={esp.coord_y + esp.alto / 2 + 1.5} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={Math.min(1.2, esp.ancho / 8)} style={{ pointerEvents: "none", textShadow: "0 0 2px rgba(0,0,0,0.9)" }}>
                    {esp.codigo}
                  </text>
                </g>
              );
            })}

            {/* Rectángulo mientras se arrastra */}
            {drawing && tempRect && (
              <rect
                x={tempRect.x} y={tempRect.y} width={tempRect.w} height={tempRect.h} rx="0.8"
                fill={`${C.purple1}25`} stroke={C.purpleLight} strokeWidth="0.4" strokeDasharray="1 0.5"
              />
            )}

            {/* Rectángulo de nueva área confirmada — persiste mientras se edita el form */}
            {selectedArea?.isNew && selectedArea.rect && (
              <rect
                x={selectedArea.rect.x} y={selectedArea.rect.y}
                width={selectedArea.rect.w} height={selectedArea.rect.h} rx="0.8"
                fill={`${C.purple1}35`} stroke={C.purpleLight} strokeWidth="0.5"
              >
                <animate attributeName="stroke-opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="fill-opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
              </rect>
            )}
          </svg>
        </div>

        {/* ── Panel lateral ── */}
        <div style={{ width: 300, borderRadius: 16, background: C.cardDark, padding: 24, border: `1px solid ${C.glassBorder}`, display: "flex", flexDirection: "column" }}>
          {selectedArea ? (
            <>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                {selectedArea.isNew ? "Nueva Area" : "Editar Area"}
              </h3>
              <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 20 }}>
                {selectedArea.isNew
                  ? `Posicion: ${Math.round(selectedArea.rect.x)}x${Math.round(selectedArea.rect.y)} — ${Math.round(selectedArea.rect.w)}x${Math.round(selectedArea.rect.h)}`
                  : `ID: ${selectedArea.espacio.id_espacio}`
                }
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 4, display: "block" }}>Codigo</label>
                  <input
                    value={editForm.codigo}
                    onChange={e => setEditForm({ ...editForm, codigo: e.target.value })}
                    placeholder="Ej: PBSJ-076"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.glassBorder}`, background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 4, display: "block" }}>Tipo</label>
                  <select
                    value={editForm.tipo}
                    onChange={e => setEditForm({ ...editForm, tipo: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.glassBorder}`, background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 14, fontFamily: "inherit", cursor: "pointer", boxSizing: "border-box" }}
                  >
                    {TIPOS.map(t => <option key={t} value={t} style={{ background: "#1a0a1e" }}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 4, display: "block" }}>Capacidad</label>
                  <input
                    type="number" min="1" max="200"
                    value={editForm.capacidad}
                    onChange={e => setEditForm({ ...editForm, capacidad: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.glassBorder}`, background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
                <BtnPrimary
                  onClick={selectedArea.isNew ? handleSaveNew : handleUpdate}
                  style={{ width: "100%", opacity: saving ? 0.6 : 1 }}
                  disabled={saving}
                >
                  {saving ? "Guardando..." : selectedArea.isNew ? "Crear Area" : "Guardar Cambios"}
                </BtnPrimary>

                {!selectedArea.isNew && (
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    style={{
                      width: "100%", padding: "10px 16px", borderRadius: 10, fontSize: 14, fontWeight: 700,
                      background: "rgba(248,113,113,0.1)", color: C.danger, border: `1px solid ${C.danger}40`,
                      cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.1)"}
                  >
                    Eliminar Area
                  </button>
                )}

                <button
                  onClick={() => setSelectedArea(null)}
                  style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: C.textMuted }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>{Icons.edit}</div>
              <p style={{ fontSize: 14, marginBottom: 6 }}>Dibuja sobre el plano</p>
              <p style={{ fontSize: 12, opacity: 0.6 }}>Click y arrastra para crear un area, o selecciona una existente para editarla.</p>
              {loading && <p style={{ fontSize: 12, marginTop: 12, color: C.purple1 }}>Cargando areas...</p>}
            </div>
          )}
        </div>
      </div>

      {/* Lista de áreas del piso */}
      <div style={{ marginTop: 20, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.glassBorder}`, background: C.glass }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.glassBorder}` }}>
              {["ID", "Codigo", "Tipo", "Capacidad", "Coordenadas", "Estado"].map((h, i) => (
                <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {areas.length === 0 && !loading ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: C.textMuted, fontSize: 13 }}>No hay areas en este piso. Dibuja una sobre el plano.</td></tr>
            ) : areas.map(esp => (
              <tr
                key={esp.id_espacio}
                onClick={() => handleAreaClick({ stopPropagation: () => {} }, esp)}
                style={{ borderBottom: "1px solid rgba(161,0,255,0.08)", cursor: "pointer", transition: "background 0.15s",
                  background: selectedArea?.espacio?.id_espacio === esp.id_espacio ? "rgba(161,0,255,0.1)" : "transparent" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(161,0,255,0.06)"}
                onMouseLeave={e => { if (selectedArea?.espacio?.id_espacio !== esp.id_espacio) e.currentTarget.style.background = "transparent"; }}
              >
                <td style={{ padding: "10px 16px", fontSize: 13, color: C.textMuted }}>{esp.id_espacio}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, color: C.white }}>{esp.codigo}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, color: C.textMuted }}>{esp.tipo}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, color: C.textMuted }}>{esp.capacidad}</td>
                <td style={{ padding: "10px 16px", fontSize: 11, color: C.textMuted, fontFamily: "JetBrains Mono, monospace" }}>
                  {esp.coord_x},{esp.coord_y} — {esp.ancho}x{esp.alto}
                </td>
                <td style={{ padding: "10px 16px", fontSize: 12 }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                    color: esp.estado_espacio === "disponible" ? C.success : esp.estado_espacio === "mantenimiento" ? C.warning : C.danger,
                    background: esp.estado_espacio === "disponible" ? "rgba(74,222,128,0.12)" : esp.estado_espacio === "mantenimiento" ? "rgba(251,191,36,0.12)" : "rgba(248,113,113,0.12)",
                  }}>
                    {esp.estado_espacio}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Toast */}
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
    </div>
  );
}
