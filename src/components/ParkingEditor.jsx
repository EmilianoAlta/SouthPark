// src/components/ParkingEditor.jsx
// Editor visual de estacionamiento: dibuja cajones sobre el PNG del sótano.
import React, { useState, useRef, useEffect, useCallback } from "react";
import { C } from "../config/constants";
import { Icons } from "./ui/Icons";
import { BtnPrimary } from "./ui/Buttons";
import { supabase } from "../supabaseClient";

const PARKING_CONFIG = {
  1: { label: "Sótano 3", img: "/floors/parking-s3.png" },
  2: { label: "Sótano 2", img: "/floors/parking-s2.png" },
  3: { label: "Sótano 1", img: "/floors/parking-s1.png" },
  4: { label: "Planta Baja T2", img: "/floors/parking-pb.png" },
  5: { label: "Nivel 1 T2", img: "/floors/parking-n1.png" },
  6: { label: "Nivel 2 T2", img: "/floors/parking-n2.png" },
  7: { label: "Azotea T2", img: "/floors/parking-azotea.png" },
};

const TIPOS_CAJON = ["Normal", "Discapacitado", "Ejecutivo", "Moto", "Eléctrico"];

export default function ParkingEditor({ animateIn }) {
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [cajones, setCajones] = useState([]);
  const [drawing, setDrawing] = useState(null);
  const [tempRect, setTempRect] = useState(null);
  const [selectedCajon, setSelectedCajon] = useState(null);
  const [editForm, setEditForm] = useState({ codigo: "", tipo: "Normal" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const svgRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCajones = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("Cajon")
      .select("*, ZonaEstacionamiento(nivel, nombre_nivel)")
      .eq("id_zona_est", selectedLevel);

    // id_zona_est matchea con el nivel porque insertamos en orden (1,2,3)
    // Pero necesitamos el id real
    const { data: zonas } = await supabase
      .from("ZonaEstacionamiento")
      .select("id_zona_est")
      .eq("nivel", selectedLevel)
      .limit(1)
      .single();

    if (zonas) {
      const { data: cajonesData } = await supabase
        .from("Cajon")
        .select("*, ZonaEstacionamiento(nivel, nombre_nivel)")
        .eq("id_zona_est", zonas.id_zona_est);
      setCajones(cajonesData || []);
    } else {
      setCajones([]);
    }
    setLoading(false);
    setSelectedCajon(null); setTempRect(null);
  }, [selectedLevel]);

  useEffect(() => { fetchCajones(); }, [fetchCajones]);

  const mouseToSvg = (e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 71;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(71, y)) };
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("[data-cajon-id]")) return;
    const pos = mouseToSvg(e);
    setDrawing({ startX: pos.x, startY: pos.y });
    setTempRect(null);
    setSelectedCajon(null);
  };

  const handleMouseMove = (e) => {
    if (!drawing) return;
    const pos = mouseToSvg(e);
    const x = Math.min(drawing.startX, pos.x);
    const y = Math.min(drawing.startY, pos.y);
    const w = Math.abs(pos.x - drawing.startX);
    const h = Math.abs(pos.y - drawing.startY);
    if (w > 0.5 && h > 0.5) setTempRect({ x, y, w, h });
  };

  const handleMouseUp = () => {
    if (drawing && tempRect && tempRect.w > 1 && tempRect.h > 1) {
      setSelectedCajon({ isNew: true, rect: tempRect });
      setEditForm({ codigo: "", tipo: "Normal" });
    } else {
      setTempRect(null);
    }
    setDrawing(null);
  };

  const handleCajonClick = (e, cajon) => {
    e.stopPropagation();
    setSelectedCajon({ isNew: false, cajon });
    setEditForm({ codigo: cajon.codigo || "", tipo: cajon.tipo || "Normal" });
  };

  const getZonaEstId = async () => {
    const { data } = await supabase
      .from("ZonaEstacionamiento")
      .select("id_zona_est")
      .eq("nivel", selectedLevel)
      .limit(1)
      .single();
    return data?.id_zona_est;
  };

  const handleSaveNew = async () => {
    if (!editForm.codigo.trim()) { showToast("El código es obligatorio.", "error"); return; }
    setSaving(true);
    try {
      const idZona = await getZonaEstId();
      if (!idZona) throw new Error("No se encontró la zona de estacionamiento.");

      const { error } = await supabase.from("Cajon").insert({
        codigo: editForm.codigo.trim(),
        tipo: editForm.tipo,
        coord_x: Math.round(selectedCajon.rect.x * 10) / 10,
        coord_y: Math.round(selectedCajon.rect.y * 10) / 10,
        ancho: Math.round(selectedCajon.rect.w * 10) / 10,
        alto: Math.round(selectedCajon.rect.h * 10) / 10,
        id_zona_est: idZona,
        estado: "disponible",
      });

      if (error) throw error;
      showToast(`Cajón "${editForm.codigo}" creado.`);
      setSelectedCajon(null); setTempRect(null);
      fetchCajones();
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editForm.codigo.trim()) { showToast("El código es obligatorio.", "error"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("Cajon")
        .update({ codigo: editForm.codigo.trim(), tipo: editForm.tipo })
        .eq("id_cajon", selectedCajon.cajon.id_cajon);

      if (error) throw error;
      showToast(`Cajón "${editForm.codigo}" actualizado.`);
      setSelectedCajon(null); fetchCajones();
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCajon?.cajon) return;
    if (!window.confirm(`¿Eliminar cajón "${selectedCajon.cajon.codigo}"?`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("Cajon").delete().eq("id_cajon", selectedCajon.cajon.id_cajon);
      if (error) throw error;
      showToast("Cajón eliminado.");
      setSelectedCajon(null); fetchCajones();
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const levelImg = PARKING_CONFIG[selectedLevel]?.img;

  return (
    <div style={{ animation: animateIn ? "fadeUp 0.5s ease forwards" : "none", opacity: animateIn ? 1 : 0 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999, padding: "14px 24px", borderRadius: 12,
          background: toast.type === "error" ? C.danger : C.success, color: "#fff", fontWeight: 700,
          fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", animation: "fadeUp 0.3s ease",
        }}>{toast.message}</div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Editor de Estacionamiento</h1>
          <p style={{ fontSize: 14, color: C.textMuted }}>Dibuja cajones sobre el plano del sótano.</p>
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

      <div style={{
        borderRadius: 12, padding: "12px 18px", marginBottom: 16,
        background: "rgba(161,0,255,0.08)", border: `1px solid ${C.glassBorder}`,
        fontSize: 13, color: C.textMuted, display: "flex", alignItems: "center", gap: 10,
      }}>
        {Icons.edit}
        <span><strong style={{ color: C.white }}>Click y arrastra</strong> para crear un cajón. <strong style={{ color: C.white }}>Click en un cajón</strong> existente para editarlo.</span>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{
          flex: 1, borderRadius: 16, border: `2px solid ${C.glassBorder}`,
          background: "#000", padding: 16, position: "relative", overflow: "hidden",
          cursor: drawing ? "crosshair" : "default",
        }}>
          <div style={{ position: "absolute", top: 12, left: 16, fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", zIndex: 2 }}>
            {PARKING_CONFIG[selectedLevel]?.label} — {cajones.length} cajones
          </div>

          <svg ref={svgRef} viewBox="0 0 100 71" style={{ width: "100%", height: "auto", userSelect: "none" }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
            onMouseLeave={() => { setDrawing(null); setTempRect(null); }}>

            {levelImg && <image href={levelImg} x="0" y="0" width="100" height="71" preserveAspectRatio="xMidYMid meet" style={{ opacity: 0.85 }} />}
            {!levelImg && <text x="50" y="36" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="3">Sin plano</text>}

            {[10,20,30,40,50,60,70,80,90].map(x => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="71" stroke="rgba(255,255,255,0.06)" strokeWidth="0.15" />)}
            {[10,20,30,40,50,60].map(y => <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.15" />)}

            {cajones.map(c => {
              const isSelected = selectedCajon && !selectedCajon.isNew && selectedCajon.cajon?.id_cajon === c.id_cajon;
              return (
                <g key={c.id_cajon} data-cajon-id={c.id_cajon} onClick={(e) => handleCajonClick(e, c)} style={{ cursor: "pointer" }}>
                  <rect x={c.coord_x} y={c.coord_y} width={c.ancho} height={c.alto} rx="0.5"
                    fill={isSelected ? `${C.purple1}50` : `${C.blue}25`} stroke={isSelected ? C.purpleLight : `${C.blue}90`}
                    strokeWidth={isSelected ? "0.6" : "0.3"} />
                  <text x={Number(c.coord_x) + Number(c.ancho) / 2} y={Number(c.coord_y) + Number(c.alto) / 2 + 0.5}
                    textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={Math.min(1.4, c.ancho / 4)} fontWeight="700"
                    style={{ pointerEvents: "none", textShadow: "0 0 3px rgba(0,0,0,0.9)" }}>
                    {c.codigo}
                  </text>
                </g>
              );
            })}

            {drawing && tempRect && (
              <rect x={tempRect.x} y={tempRect.y} width={tempRect.w} height={tempRect.h} rx="0.5"
                fill={`${C.purple1}25`} stroke={C.purpleLight} strokeWidth="0.4" strokeDasharray="1 0.5" />
            )}

            {selectedCajon?.isNew && selectedCajon.rect && (
              <rect x={selectedCajon.rect.x} y={selectedCajon.rect.y} width={selectedCajon.rect.w} height={selectedCajon.rect.h} rx="0.5"
                fill={`${C.purple1}35`} stroke={C.purpleLight} strokeWidth="0.5">
                <animate attributeName="stroke-opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="fill-opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
              </rect>
            )}
          </svg>
        </div>

        <div style={{ width: 280, borderRadius: 16, background: C.cardDark, padding: 24, border: `1px solid ${C.glassBorder}`, display: "flex", flexDirection: "column" }}>
          {selectedCajon ? (
            <>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{selectedCajon.isNew ? "Nuevo Cajón" : "Editar Cajón"}</h3>
              <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 20 }}>
                {selectedCajon.isNew
                  ? `Pos: ${Math.round(selectedCajon.rect.x)}x${Math.round(selectedCajon.rect.y)}`
                  : `ID: ${selectedCajon.cajon.id_cajon}`}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 4, display: "block" }}>Código</label>
                  <input value={editForm.codigo} onChange={e => setEditForm({ ...editForm, codigo: e.target.value })}
                    placeholder="Ej: A01" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.glassBorder}`, background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 4, display: "block" }}>Tipo</label>
                  <select value={editForm.tipo} onChange={e => setEditForm({ ...editForm, tipo: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.glassBorder}`, background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 14, fontFamily: "inherit", cursor: "pointer", boxSizing: "border-box" }}>
                    {TIPOS_CAJON.map(t => <option key={t} value={t} style={{ background: "#1a0a1e" }}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
                <BtnPrimary onClick={selectedCajon.isNew ? handleSaveNew : handleUpdate} style={{ width: "100%", opacity: saving ? 0.6 : 1 }} disabled={saving}>
                  {saving ? "Guardando..." : selectedCajon.isNew ? "Crear Cajón" : "Guardar Cambios"}
                </BtnPrimary>
                {!selectedCajon.isNew && (
                  <button onClick={handleDelete} disabled={saving} style={{
                    width: "100%", padding: "10px 16px", borderRadius: 10, fontSize: 14, fontWeight: 700,
                    background: "rgba(248,113,113,0.1)", color: C.danger, border: `1px solid ${C.danger}40`,
                    cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
                  }}>Eliminar Cajón</button>
                )}
                <button onClick={() => setSelectedCajon(null)} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>Cancelar</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: C.textMuted }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>{Icons.edit}</div>
              <p style={{ fontSize: 14, marginBottom: 6 }}>Dibuja sobre el plano</p>
              <p style={{ fontSize: 12, opacity: 0.6 }}>Click y arrastra para crear un cajón.</p>
              {loading && <p style={{ fontSize: 12, marginTop: 12, color: C.purple1 }}>Cargando...</p>}
            </div>
          )}
        </div>
      </div>

      {/* Tabla de cajones */}
      <div style={{ marginTop: 20, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.glassBorder}`, background: C.glass }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.glassBorder}` }}>
              {["ID","Código","Tipo","Coordenadas","Estado"].map((h, i) => (
                <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cajones.length === 0 && !loading ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: C.textMuted, fontSize: 13 }}>No hay cajones en este nivel.</td></tr>
            ) : cajones.map(c => (
              <tr key={c.id_cajon} onClick={() => handleCajonClick({ stopPropagation: () => {} }, c)}
                style={{ borderBottom: "1px solid rgba(161,0,255,0.08)", cursor: "pointer", transition: "background 0.15s",
                  background: selectedCajon?.cajon?.id_cajon === c.id_cajon ? "rgba(161,0,255,0.1)" : "transparent" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(161,0,255,0.06)"}
                onMouseLeave={e => { if (selectedCajon?.cajon?.id_cajon !== c.id_cajon) e.currentTarget.style.background = "transparent"; }}>
                <td style={{ padding: "10px 16px", fontSize: 13, color: C.textMuted }}>{c.id_cajon}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, color: C.white }}>{c.codigo}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, color: C.textMuted }}>{c.tipo}</td>
                <td style={{ padding: "10px 16px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: C.textMuted }}>
                  ({Math.round(c.coord_x)}, {Math.round(c.coord_y)}) {Math.round(c.ancho)}x{Math.round(c.alto)}
                </td>
                <td style={{ padding: "10px 16px", fontSize: 13, color: c.estado === "disponible" ? C.success : C.danger }}>{c.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
