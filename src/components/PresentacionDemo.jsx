import React, { useRef } from "react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const PURPLE = "#A100FF";
const PURPLE_DARK = "#38193A";
const PURPLE_MID = "#8141AA";
const PURPLE_LIGHT = "#B257ED";
const WHITE = "#FFFFFF";
const GRAY = "#F5F0F7";

const slides = [
  // Slide 0: Portada
  {
    bg: `linear-gradient(135deg, ${PURPLE_DARK} 0%, ${PURPLE_MID} 50%, ${PURPLE_LIGHT} 100%)`,
    render: () => (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: WHITE }}>
        <img src="/logo.png" alt="SouthPark" style={{ width: 120, marginBottom: 24, filter: "brightness(2)" }} />
        <h1 style={{ fontSize: 48, fontWeight: 800, margin: 0, textAlign: "center" }}>WorkHub MTY</h1>
        <p style={{ fontSize: 22, opacity: 0.85, margin: "12px 0 0" }}>Sistema de Gestión de Espacios de Trabajo</p>
        <div style={{ marginTop: 40, fontSize: 14, opacity: 0.7, textAlign: "center", lineHeight: 1.8 }}>
          <p style={{ margin: 0 }}>Emiliano Altamirano · Lucas Mateo Tapia · Rafael Cárdenas</p>
          <p style={{ margin: 0 }}>Emiliano Enríquez · Sergio Rodríguez</p>
          <p style={{ margin: "16px 0 0", fontSize: 13 }}>Sprint 2 Review — Abril 2026</p>
        </div>
      </div>
    ),
  },
  // Slide 1: Agenda
  {
    bg: WHITE,
    render: () => (
      <div style={{ padding: "40px 80px", height: "100%", boxSizing: "border-box" }}>
        <h2 style={{ color: PURPLE, fontSize: 34, margin: "0 0 24px", borderBottom: `3px solid ${PURPLE}`, paddingBottom: 10 }}>Agenda</h2>
        {["Resumen del Proyecto", "Product Roadmap", "Sprint 1 — Entregables", "Sprint 2 — Entregables", "Demo en Vivo", "Métricas y Calidad", "Deployment", "Siguientes Pasos"].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: PURPLE, color: WHITE, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, marginRight: 14, flexShrink: 0 }}>{i + 1}</div>
            <span style={{ fontSize: 18, color: PURPLE_DARK }}>{item}</span>
          </div>
        ))}
      </div>
    ),
  },
  // Slide 2: Resumen del Proyecto
  {
    bg: WHITE,
    render: () => (
      <div style={{ padding: "40px 60px", height: "100%", boxSizing: "border-box" }}>
        <h2 style={{ color: PURPLE, fontSize: 32, margin: "0 0 20px", borderBottom: `3px solid ${PURPLE}`, paddingBottom: 10 }}>Resumen del Proyecto</h2>
        <p style={{ fontSize: 17, color: PURPLE_DARK, lineHeight: 1.5, marginBottom: 24 }}>
          <strong>WorkHub MTY</strong> es una plataforma web para la gestión centralizada de espacios de trabajo en el ATC Monterrey de Accenture. Permite a los empleados reservar escritorios, consultar disponibilidad en tiempo real y gestionar sus reservas.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
          {[
            { label: "Stack", value: "React 18 + Vite + Supabase" },
            { label: "Base de Datos", value: "PostgreSQL (Supabase)" },
            { label: "Auth", value: "JWT + RLS" },
            { label: "Realtime", value: "Supabase WebSocket" },
            { label: "Deploy", value: "Vercel CDN" },
            { label: "Tests", value: "30 unitarios (Vitest)" },
          ].map((item, i) => (
            <div key={i} style={{ background: GRAY, borderRadius: 12, padding: "20px 24px", borderLeft: `4px solid ${PURPLE}` }}>
              <div style={{ fontSize: 13, color: PURPLE_MID, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 17, color: PURPLE_DARK, fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  // Slide 3: Product Roadmap
  {
    bg: WHITE,
    render: () => {
      const categories = [
        { name: "Gestion de\nusuarios", items: [["Registro e inicio de sesion", "Autenticacion", "Perfiles y roles"], ["Reservar espacio", "Cancelar reserva", "Visualizar reservas"], ["Edicion de usuarios", "Customizacion de perfil", "Agrupaciones por equipo"], ["Distribucion equitativa entre pisos", "Analisis de datos"], ["Sugerencias con IA", "Panel de administrador"]] },
        { name: "Gestion de\nespacios", items: [["Digitalizar planos de piso", "Disponibilidad en tiempo real"], ["Validacion de conflictos", "Seleccion con mapa"], ["Manejo de espacios compartidos", "Distribucion equitativa"], ["Acceso prioritario", "Incentivos in-person"], ["Bloqueo de espacios", "Acceso prioritario"]] },
        { name: "Sistema de\nreservas", items: [["Seleccion de espacios individuales"], ["Cancelacion y modificacion", "Seleccion de salas de reunion"], ["Manejo de no-show", "Check-in/check-out", "Integrar equipos"], ["Reservas frecuentes", "Sistema de incentivos"], ["Reservas de emergencia", "Reservas frecuentes"]] },
        { name: "Documentacion\ny UX", items: [["Documentacion tecnica inicial", "MockUps pantallas", "Pruebas unitarias"], ["Pruebas de flujo completo", "Tests automatizados"], ["Dashboard de datos", "Compatibilidad movil", "Accesibilidad"], ["Optimizacion de rendimiento", "Mejoras de UX"], ["Pruebas de usabilidad", "Documentacion final", "Release plan"]] },
      ];
      const sprints = ["Sprint 1", "Sprint 2", "Sprint 3", "Sprint 4", "Sprint 5"];
      const sprintDates = ["10-21 Mar", "24 Mar-11 Abr", "14-25 Abr", "28 Abr-9 May", "12-23 May"];
      const colors = ["#D9A8F0", "#C87EE0", "#B257ED", "#9B46A0", "#8141AA"];
      const cellBg = ["#F3E5FA", "#EDD9F7", "#E6CCF4", "#DFBFF0", "#D8B2ED"];
      return (
        <div style={{ padding: "28px 36px", height: "100%", boxSizing: "border-box" }}>
          <h2 style={{ color: PURPLE_DARK, fontSize: 28, margin: "0 0 16px", fontWeight: 900, textAlign: "center", letterSpacing: 1 }}>PRODUCT ROADMAP</h2>
          {/* Sprint headers */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <div style={{ width: 110, flexShrink: 0 }} />
            {sprints.map((s, i) => (
              <div key={i} style={{ flex: 1, background: colors[i], color: WHITE, textAlign: "center", padding: "8px 2px 6px", fontWeight: 800, fontSize: 13, borderRadius: 10 }}>
                <div>{s}</div>
                <div style={{ fontSize: 9, opacity: 0.85, fontWeight: 400, marginTop: 2 }}>{sprintDates[i]}</div>
              </div>
            ))}
          </div>
          {/* Category rows */}
          {categories.map((cat, ci) => (
            <div key={ci} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <div style={{ width: 110, flexShrink: 0, fontWeight: 700, fontSize: 11, color: PURPLE_DARK, display: "flex", alignItems: "center", paddingRight: 6, whiteSpace: "pre-line", lineHeight: 1.3 }}>
                {cat.name}
              </div>
              {cat.items.map((sprintItems, si) => (
                <div key={si} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, background: cellBg[si], borderRadius: 8, padding: "5px 4px" }}>
                  {sprintItems.filter(x => x).map((item, ii) => (
                    <div key={ii} style={{ background: colors[si], color: WHITE, fontSize: 9, padding: "4px 6px", textAlign: "center", borderRadius: 6, fontWeight: 600, lineHeight: 1.25 }}>{item}</div>
                  ))}
                </div>
              ))}
            </div>
          ))}
          {/* Status legend */}
          <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 12 }}>
            {[{label: "Completado", color: "#4ADE80"}, {label: "En progreso", color: "#FBBF24"}, {label: "Planificado", color: "#D1D5DB"}].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                <span style={{ color: PURPLE_DARK, fontSize: 11 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    },
  },
  // Slide 4: Sprint 1
  {
    bg: WHITE,
    render: () => (
      <div style={{ padding: "40px 60px", height: "100%", boxSizing: "border-box" }}>
        <h2 style={{ color: PURPLE, fontSize: 32, margin: "0 0 16px", borderBottom: `3px solid ${PURPLE}`, paddingBottom: 10 }}>Sprint 1 — Fundamentos</h2>
        <p style={{ fontSize: 15, color: PURPLE_MID, marginBottom: 16 }}>Velocity: 29 SP | 10 - 21 Marzo 2026</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { title: "Registro con correo institucional", desc: "Solo @accenture.com y @tec.mx", who: "Rafael + Emiliano A." },
            { title: "Autenticación (Login/Logout)", desc: "Supabase Auth con JWT", who: "Rafael Cárdenas" },
            { title: "Dashboard con Sidebar", desc: "Navegación entre secciones", who: "Emiliano Altamirano" },
            { title: "Mapa de Pisos SVG", desc: "Áreas interactivas con disponibilidad", who: "Emiliano A. + Lucas" },
            { title: "Disponibilidad en Tiempo Real", desc: "Verde/Rojo/Amarillo por estado", who: "Lucas Mateo Tapia" },
            { title: "Configuración Supabase", desc: "Auth + PostgreSQL + RLS", who: "Rafael Cárdenas" },
          ].map((item, i) => (
            <div key={i} style={{ background: GRAY, borderRadius: 10, padding: "16px 20px", borderLeft: `4px solid ${PURPLE}` }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: PURPLE_DARK, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>{item.desc}</div>
              <div style={{ fontSize: 12, color: PURPLE_MID, fontWeight: 600 }}>{item.who}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  // Slide 5: Sprint 2
  {
    bg: WHITE,
    render: () => (
      <div style={{ padding: "40px 60px", height: "100%", boxSizing: "border-box" }}>
        <h2 style={{ color: PURPLE, fontSize: 32, margin: "0 0 14px", borderBottom: `3px solid ${PURPLE}`, paddingBottom: 10 }}>Sprint 2 — Sistema de Reservas</h2>
        <p style={{ fontSize: 15, color: PURPLE_MID, marginBottom: 14 }}>Velocity: 74 SP | 24 Mar - 11 Abr 2026</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { epic: "Reservar Espacio (21 SP)", who: "Rafael Cárdenas + Emiliano A.", items: "Formulario, validación, confirmación" },
            { epic: "Visualizar Reservas (13 SP)", who: "Sergio Rodríguez", items: "Tabla, filtros por estado, detalles" },
            { epic: "Cancelar Reserva (14 SP)", who: "Emiliano Enríquez", items: "Modal confirmación, liberación espacio" },
            { epic: "Validación Conflictos (26 SP)", who: "Lucas Mateo + Emiliano A.", items: "Overlap, capacidad, errores amigables" },
          ].map((item, i) => (
            <div key={i} style={{ background: GRAY, borderRadius: 10, padding: "16px 20px", borderLeft: `4px solid ${PURPLE}` }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: PURPLE_DARK, marginBottom: 4 }}>{item.epic}</div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>{item.items}</div>
              <div style={{ fontSize: 12, color: PURPLE_MID, fontWeight: 600 }}>{item.who}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 16 }}>
          {[
            { icon: "✓", label: "30 Tests Pasando", color: "#4ADE80" },
            { icon: "⚡", label: "Supabase Realtime", color: PURPLE },
            { icon: "🛡", label: "RLS Seguridad", color: "#60A5FA" },
          ].map((b, i) => (
            <div key={i} style={{ flex: 1, background: b.color, color: WHITE, borderRadius: 10, padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 15 }}>
              {b.icon} {b.label}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  // Slide 6: Métricas y Calidad
  {
    bg: WHITE,
    render: () => (
      <div style={{ padding: "36px 60px", height: "100%", boxSizing: "border-box" }}>
        <h2 style={{ color: PURPLE, fontSize: 32, margin: "0 0 18px", borderBottom: `3px solid ${PURPLE}`, paddingBottom: 10 }}>Métricas y Calidad</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
          {[
            { value: "30", label: "Tests Unitarios", sub: "100% passing" },
            { value: "20", label: "Casos de Prueba", sub: "20/20 aprobados" },
            { value: "4", label: "Defectos", sub: "4/4 resueltos" },
            { value: "74", label: "Story Points", sub: "Sprint 2" },
          ].map((m, i) => (
            <div key={i} style={{ background: `linear-gradient(135deg, ${PURPLE_MID}, ${PURPLE_LIGHT})`, borderRadius: 14, padding: "18px 14px", textAlign: "center", color: WHITE }}>
              <div style={{ fontSize: 36, fontWeight: 900 }}>{m.value}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>{m.label}</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 3 }}>{m.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: GRAY, borderRadius: 12, padding: 16 }}>
            <h3 style={{ color: PURPLE_DARK, margin: "0 0 8px", fontSize: 16 }}>Pruebas Automatizadas</h3>
            <p style={{ fontSize: 14, color: "#555", margin: "4px 0" }}>• reserveErrors.test.js — 21 tests</p>
            <p style={{ fontSize: 14, color: "#555", margin: "4px 0" }}>• ConfirmModal.test.jsx — 9 tests</p>
            <p style={{ fontSize: 14, color: "#555", margin: "4px 0" }}>• Tiempo de ejecución: 2.40s</p>
          </div>
          <div style={{ background: GRAY, borderRadius: 12, padding: 16 }}>
            <h3 style={{ color: PURPLE_DARK, margin: "0 0 8px", fontSize: 16 }}>Defectos Resueltos</h3>
            <p style={{ fontSize: 14, color: "#555", margin: "4px 0" }}>• DEF-01: Correo @tec.mx rechazado</p>
            <p style={{ fontSize: 14, color: "#555", margin: "4px 0" }}>• DEF-02: Modal no cerraba en backdrop</p>
            <p style={{ fontSize: 14, color: "#555", margin: "4px 0" }}>• DEF-03: Error silencioso RLS</p>
            <p style={{ fontSize: 14, color: "#555", margin: "4px 0" }}>• DEF-04: Overlap hora fin</p>
          </div>
        </div>
      </div>
    ),
  },
  // Slide 7: Deployment
  {
    bg: WHITE,
    render: () => (
      <div style={{ padding: "40px 60px", height: "100%", boxSizing: "border-box" }}>
        <h2 style={{ color: PURPLE, fontSize: 32, margin: "0 0 20px", borderBottom: `3px solid ${PURPLE}`, paddingBottom: 10 }}>Deployment</h2>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
          <div style={{ background: `linear-gradient(135deg, ${PURPLE_MID}, ${PURPLE_LIGHT})`, borderRadius: 16, padding: "24px 48px", color: WHITE, textAlign: "center" }}>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>URL DE PRODUCCIÓN</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>workhub-mty.vercel.app</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
          {[
            { title: "Frontend", desc: "React 18 SPA en Vercel CDN global con HTTPS automático" },
            { title: "Backend", desc: "Supabase: PostgreSQL + Auth + RLS + Realtime" },
            { title: "Build", desc: "Vite 5.4.21 — 401 KB JS, 1.5 KB CSS, 0.4 KB HTML" },
          ].map((item, i) => (
            <div key={i} style={{ background: GRAY, borderRadius: 12, padding: 20, borderTop: `4px solid ${PURPLE}` }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: PURPLE_DARK, marginBottom: 8 }}>{item.title}</div>
              <div style={{ fontSize: 14, color: "#555", lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  // Slide 8: Siguientes Pasos
  {
    bg: `linear-gradient(135deg, ${PURPLE_DARK} 0%, ${PURPLE_MID} 100%)`,
    render: () => (
      <div style={{ padding: "40px 60px", height: "100%", boxSizing: "border-box", color: WHITE }}>
        <h2 style={{ fontSize: 32, margin: "0 0 20px", borderBottom: "3px solid rgba(255,255,255,0.3)", paddingBottom: 10 }}>Siguientes Pasos</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { sprint: "Sprint 3", items: ["Sistema de Check-in/Check-out con QR", "Reserva de estacionamiento", "Gestión de no-show", "Edición de usuarios"] },
            { sprint: "Sprint 4", items: ["Dashboard de datos y reportes", "Compatibilidad móvil", "Optimización de rendimiento", "Distribución equitativa de pisos"] },
            { sprint: "Sprint 5", items: ["Sugerencias con IA", "Panel de administrador", "Bloqueo de espacios", "Documentación final y release"] },
            { sprint: "Riesgos", items: ["Plan de pruebas incompleto (ROJO → resuelto)", "Sistema QR requiere investigación", "Estacionamiento aún no implementado"] },
          ].map((s, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 20, border: "1px solid rgba(255,255,255,0.2)" }}>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 12, color: "#F6AFFA" }}>{s.sprint}</div>
              {s.items.map((item, j) => (
                <div key={j} style={{ fontSize: 14, marginBottom: 8, paddingLeft: 16, position: "relative" }}>
                  <span style={{ position: "absolute", left: 0 }}>•</span> {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  // Slide 9: Gracias
  {
    bg: `linear-gradient(135deg, ${PURPLE_DARK} 0%, ${PURPLE_MID} 50%, ${PURPLE_LIGHT} 100%)`,
    render: () => (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: WHITE }}>
        <h1 style={{ fontSize: 56, fontWeight: 900, margin: 0 }}>¡Gracias!</h1>
        <p style={{ fontSize: 22, opacity: 0.8, margin: "16px 0 40px" }}>¿Preguntas?</p>
        <div style={{ fontSize: 16, opacity: 0.7, textAlign: "center", lineHeight: 2 }}>
          <p style={{ margin: 0 }}>workhub-mty.vercel.app</p>
          <p style={{ margin: 0 }}>github.com/EmilianoAlta/SouthPark</p>
        </div>
      </div>
    ),
  },
];

export default function PresentacionDemo() {
  const slidesRef = useRef(null);
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [exporting, setExporting] = React.useState(false);

  const exportPDF = async () => {
    setExporting(true);
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [960, 540] });
    const container = slidesRef.current;
    const slideEls = container.querySelectorAll("[data-slide]");

    for (let i = 0; i < slideEls.length; i++) {
      const canvas = await html2canvas(slideEls[i], { scale: 2, useCORS: true, backgroundColor: null });
      const imgData = canvas.toDataURL("image/png");
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, 960, 540);
    }
    pdf.save("WorkHub_MTY_Presentacion.pdf");
    setExporting(false);
  };

  return (
    <div style={{ background: "#1a1a2e", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" }}>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, zIndex: 10 }}>
        <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0}
          style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: currentSlide === 0 ? "#555" : PURPLE, color: WHITE, fontWeight: 700, cursor: currentSlide === 0 ? "default" : "pointer", fontSize: 14 }}>
          ← Anterior
        </button>
        <span style={{ color: WHITE, fontSize: 16, fontWeight: 600, minWidth: 80, textAlign: "center" }}>
          {currentSlide + 1} / {slides.length}
        </span>
        <button onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))} disabled={currentSlide === slides.length - 1}
          style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: currentSlide === slides.length - 1 ? "#555" : PURPLE, color: WHITE, fontWeight: 700, cursor: currentSlide === slides.length - 1 ? "default" : "pointer", fontSize: 14 }}>
          Siguiente →
        </button>
        <button onClick={exportPDF} disabled={exporting}
          style={{ padding: "10px 24px", borderRadius: 8, border: `2px solid ${PURPLE}`, background: "transparent", color: PURPLE, fontWeight: 700, cursor: exporting ? "default" : "pointer", fontSize: 14, marginLeft: 16 }}>
          {exporting ? "Exportando..." : "⬇ Descargar PDF"}
        </button>
      </div>

      {/* Visible slide */}
      <div style={{ width: 960, height: 540, borderRadius: 12, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", background: slides[currentSlide].bg, fontFamily: "'Nunito Sans', sans-serif" }}>
        {slides[currentSlide].render()}
      </div>

      {/* Hidden slides for PDF export */}
      <div ref={slidesRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
        {slides.map((slide, i) => (
          <div key={i} data-slide={i} style={{ width: 960, height: 540, background: slide.bg, fontFamily: "'Nunito Sans', sans-serif", overflow: "hidden" }}>
            {slide.render()}
          </div>
        ))}
      </div>
    </div>
  );
}
