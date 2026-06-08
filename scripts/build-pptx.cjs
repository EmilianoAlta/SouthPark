// Genera presentacion-seguridad.pptx (PowerPoint nativo) a partir del contenido
// de presentacion-seguridad.html. PPTX nativo => sin "cuadro blanco" al abrir/
// exportar a PDF en otros dispositivos (no depende de CDN ni de background-clip:text).
//
//   node scripts/build-pptx.js
//
const PptxGenJS = require("pptxgenjs");

// ---- Paleta (sin '#') ----
const C = {
  bg: "1C0A20", bg2: "120615",
  card: "281333",       // fondo de tarjeta (glass sobre oscuro)
  cardBorder: "4A3556",
  purple1: "A100FF", purpleLight: "C850FF", purple5: "38193A",
  pink: "F6AFFA", pinkLight: "FDD6FF",
  text: "FFF8F8", textMuted: "B7A6BC", white: "FFFFFF",
  success: "4ADE80", warning: "FBBF24", danger: "F87171", blue: "60A5FA",
};

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";          // 13.333 x 7.5"
pptx.author = "Equipo SouthPark";
pptx.title = "SouthPark · Seguridad de Base de Datos";

const W = 13.333, H = 7.5;
const MX = 0.7;                       // margen lateral
const CW = W - MX * 2;                // ancho útil

// ---------- helpers ----------
function bg(slide) {
  slide.background = { color: C.bg };
  // glows decorativos
  slide.addShape("ellipse", { x: W - 3.2, y: -1.6, w: 4.2, h: 4.2, fill: { color: C.purple1, transparency: 82 }, line: { type: "none" } });
  slide.addShape("ellipse", { x: -1.6, y: H - 2.6, w: 4.6, h: 4.6, fill: { color: C.purple5, transparency: 70 }, line: { type: "none" } });
}

function phaseTag(slide, n, label) {
  slide.addText(`FASE ${n}`, {
    x: MX, y: 0.45, w: 1.4, h: 0.4, align: "center", valign: "middle",
    fontFace: "Nunito Sans", fontSize: 12, bold: true, color: C.purple5,
    fill: { color: C.pink }, rectRadius: 0.06, charSpacing: 1,
  });
  slide.addText(String(label).toUpperCase(), {
    x: MX + 1.55, y: 0.45, w: CW - 1.55, h: 0.4, valign: "middle",
    fontFace: "Nunito Sans", fontSize: 12, color: C.textMuted, charSpacing: 2,
  });
}

function title(slide, txt, opts = {}) {
  slide.addText(txt, {
    x: MX, y: 0.92, w: CW, h: 0.85, valign: "middle",
    fontFace: "Nunito Sans", fontSize: opts.fontSize || 30, bold: true, color: C.pinkLight,
    ...opts,
  });
}

// Tarjeta con barra de acento a la izquierda. text = array de runs PptxGenJS.
function card(slide, x, y, w, h, accent, runs, opts = {}) {
  slide.addShape("roundRect", {
    x, y, w, h, rectRadius: 0.1,
    fill: { color: opts.fill || C.card, transparency: opts.transparency ?? 12 },
    line: { color: C.cardBorder, width: 1 },
  });
  slide.addShape("roundRect", { x, y, w: 0.07, h, rectRadius: 0.03, fill: { color: accent }, line: { type: "none" } });
  if (runs) {
    slide.addText(runs, {
      x: x + 0.28, y: y + 0.12, w: w - 0.5, h: h - 0.24, valign: opts.valign || "top",
      fontFace: "Nunito Sans", ...opts.textOpts,
    });
  }
}

function chip(slide, x, y, txt, color, w = 1.5) {
  slide.addText(txt, {
    x, y, w, h: 0.32, align: "center", valign: "middle",
    fontFace: "JetBrains Mono", fontSize: 11, bold: true, color,
    fill: { color, transparency: 86 }, line: { color, width: 0.75, transparency: 55 }, rectRadius: 0.16,
  });
}

const sev = { alta: [C.danger, "🔴 ALTA"], media: [C.warning, "🟡 MEDIA"], baja: [C.success, "🟢 BAJA"] };

// ============================================================
// 0 — Portada
// ============================================================
{
  const s = pptx.addSlide(); bg(s);
  s.addShape("roundRect", { x: W/2 - 0.6, y: 0.7, w: 1.2, h: 1.2, rectRadius: 0.22,
    fill: { color: C.purple1 }, line: { type: "none" } });
  s.addText("🛡️", { x: W/2 - 0.6, y: 0.7, w: 1.2, h: 1.2, align: "center", valign: "middle", fontSize: 44 });
  s.addText("Seguridad de Base de Datos", { x: 0, y: 2.05, w: W, h: 0.85, align: "center",
    fontFace: "Nunito Sans", fontSize: 44, bold: true, color: C.white });
  s.addText("SouthPark · Reservación de espacios", { x: 0, y: 2.85, w: W, h: 0.4, align: "center",
    fontFace: "Nunito Sans", fontSize: 18, bold: true, color: C.purpleLight });
  s.addText("Análisis de datos sensibles, amenazas y medidas de protección sobre React + Supabase (PostgreSQL).",
    { x: W/2 - 3.2, y: 3.35, w: 6.4, h: 0.6, align: "center", fontFace: "Nunito Sans", fontSize: 13, color: C.textMuted });
  chip(s, W/2 - 3.0, 4.0, "React 18", C.purpleLight, 1.7);
  chip(s, W/2 - 1.1, 4.0, "Supabase Auth", C.success, 2.0);
  chip(s, W/2 + 1.1, 4.0, "PostgreSQL + RLS", C.blue, 2.1);
  s.addText("EQUIPO", { x: 0, y: 4.55, w: W, h: 0.3, align: "center", fontFace: "Nunito Sans",
    fontSize: 12, bold: true, color: C.purpleLight, charSpacing: 2 });
  const team = [
    ["Emiliano Altamirano Baez", "A00838577"],
    ["Lucas Mateo Tapia Callisperis", "A00840248"],
    ["Rafael Cárdenas Meneses", "A00838348"],
    ["Emiliano Enríquez López", "A01174554"],
    ["Sergio Rodríguez Pérez", "A00838856"],
  ];
  let tx = W/2 - 5.6; const ty = 4.95, tw = 2.25;
  team.forEach(([nom, mat]) => {
    s.addShape("roundRect", { x: tx, y: ty, w: tw, h: 0.75, rectRadius: 0.1,
      fill: { color: C.card, transparency: 12 }, line: { color: C.cardBorder, width: 1 } });
    s.addText([
      { text: nom + "\n", options: { fontSize: 10.5, bold: true, color: C.text } },
      { text: mat, options: { fontSize: 9.5, color: C.purpleLight, fontFace: "JetBrains Mono" } },
    ], { x: tx, y: ty, w: tw, h: 0.75, align: "center", valign: "middle", fontFace: "Nunito Sans" });
    tx += tw + 0.05;
  });
  s.addText("M5 — BD: Seguridad   ·   2026", { x: 0, y: 6.1, w: W, h: 0.3, align: "center",
    fontFace: "JetBrains Mono", fontSize: 11, color: C.textMuted });
}

// ============================================================
// 1 — Datos sensibles
// ============================================================
{
  const s = pptx.addSlide(); bg(s);
  phaseTag(s, 1, "Identificación de datos sensibles");
  title(s, "¿Qué datos guarda la base de datos?");
  const cols = [
    [C.danger, "alta", "Alta sensibilidad", ["Contraseñas (hash bcrypt)", "Número de empleado", "Correo corporativo", "Nombre completo (PII)"]],
    [C.warning, "media", "Media sensibilidad", ["Historial de reservas", "Gamificación / puntos", "Logs de conflicto", "Bloqueos temporales"]],
    [C.success, "baja", "Baja sensibilidad", ["Catálogo de espacios", "Zonas y planos", "Estados y beneficios"]],
  ];
  const cw = (CW - 0.6) / 3, cy = 1.95, ch = 3.0;
  cols.forEach(([acc, lvl, h3, items], k) => {
    const x = MX + k * (cw + 0.3);
    card(s, x, cy, cw, ch, acc);
    s.addText(sev[lvl][1], { x: x + 0.28, y: cy + 0.18, w: cw - 0.5, h: 0.32, fontFace: "JetBrains Mono", fontSize: 11, bold: true, color: acc });
    s.addText(h3, { x: x + 0.28, y: cy + 0.6, w: cw - 0.5, h: 0.4, fontFace: "Nunito Sans", fontSize: 16, bold: true, color: C.text });
    s.addText(items.map(t => ({ text: t, options: { bullet: { code: "2022" }, color: C.text } })),
      { x: x + 0.28, y: cy + 1.1, w: cw - 0.5, h: ch - 1.2, fontFace: "Nunito Sans", fontSize: 12.5, lineSpacingMultiple: 1.25 });
  });
  card(s, MX, 5.15, CW, 1.35, C.purpleLight, [
    { text: "Impacto de una fuga: ", options: { bold: true, color: C.purpleLight } },
    { text: "PII de empleados reales de Accenture → phishing dirigido e ingeniería social. El historial revela patrones de presencia física (quién, dónde y a qué hora) → riesgo de privacidad y seguridad.", options: { color: C.text } },
  ], { textOpts: { fontSize: 13, valign: "middle", lineSpacingMultiple: 1.15 }, valign: "middle" });
}

// ============================================================
// 2 — Roles
// ============================================================
{
  const s = pptx.addSlide(); bg(s);
  phaseTag(s, 1, "Niveles de acceso");
  title(s, "¿Quién accede y con qué nivel?");
  const rows = [
    ["👑", "Administrador", "id_rol = 1", "Lectura/escritura de todas las tablas vía es_admin()", C.danger],
    ["👤", "Empleado", "id_rol = 2", "Solo sus propios datos: id_usuario = auth.uid(). Lee catálogos.", C.warning],
    ["🚪", "Anónimo", "sin sesión", "Sin acceso a datos de negocio. Solo registro / login.", C.blue],
    ["⚙️", "service_role", "backend", "Acceso total — NUNCA debe exponerse en el frontend.", C.success],
  ];
  let y = 1.95; const h = 0.92;
  rows.forEach(([ic, rol, tag, desc, col]) => {
    card(s, MX, y, CW, h, col);
    s.addText(ic, { x: MX + 0.2, y, w: 0.7, h, align: "center", valign: "middle", fontSize: 26 });
    s.addText(rol, { x: MX + 0.95, y: y + 0.14, w: 2.4, h: 0.35, fontFace: "Nunito Sans", fontSize: 16, bold: true, color: C.text });
    chip(s, MX + 0.95, y + 0.5, tag, col, 1.7);
    s.addText(desc, { x: MX + 3.5, y, w: CW - 3.8, h, valign: "middle", fontFace: "Nunito Sans", fontSize: 13.5, color: C.text });
    y += h + 0.14;
  });
  s.addText("🔑 Principio de mínimo privilegio: cada quien ve solo lo que necesita.",
    { x: 0, y: 6.55, w: W, h: 0.4, align: "center", fontFace: "Nunito Sans", fontSize: 14, bold: true, color: C.purpleLight });
}

// ============================================================
// 3 — Amenazas
// ============================================================
{
  const s = pptx.addSlide(); bg(s);
  phaseTag(s, 2, "Identificación de amenazas");
  title(s, "Amenazas evaluadas");
  const items = [
    ["💉", "Inyección SQL", "Mitigada — PostgREST parametriza; RPCs con parámetros tipados", C.success],
    ["🔓", "Acceso no autorizado", "Mitigada con Row Level Security (1 hallazgo abierto)", C.warning],
    ["🔑", "Robo de credenciales", "Parcial — hashing sí; falta MFA y rate-limit", C.warning],
    ["📤", "Secretos en el cliente", "ABIERTO — API key de OpenAI en el bundle", C.danger],
    ["🪜", "Escalada de privilegios", "Mitigada — el rol lo fija el backend, no el cliente", C.success],
    ["💾", "Pérdida de datos", "Mitigada — backups automáticos de Supabase", C.success],
  ];
  const cw = (CW - 0.4) / 2, ch = 1.35; let y0 = 1.95;
  items.forEach(([ic, t, d, col], k) => {
    const x = MX + (k % 2) * (cw + 0.4);
    const y = y0 + Math.floor(k / 2) * (ch + 0.2);
    card(s, x, y, cw, ch, col);
    s.addText([
      { text: ic + "  ", options: { fontSize: 18 } },
      { text: t, options: { fontSize: 15, bold: true, color: C.text } },
    ], { x: x + 0.28, y: y + 0.14, w: cw - 0.5, h: 0.4, fontFace: "Nunito Sans" });
    s.addText(d, { x: x + 0.28, y: y + 0.6, w: cw - 0.5, h: 0.65, fontFace: "Nunito Sans", fontSize: 12.5, color: C.textMuted, lineSpacingMultiple: 1.1 });
  });
}

// ============================================================
// 4 — Diagrama superficie de ataque
// ============================================================
{
  const s = pptx.addSlide(); bg(s);
  phaseTag(s, 2, "Puntos vulnerables del sistema");
  title(s, "Diagrama de superficie de ataque");
  const cx = MX + 1.4, cw = CW - 2.8;
  // Navegador
  card(s, cx, 2.0, cw, 1.3, C.blue);
  s.addText("🌐  Navegador (React + Vite bundle)", { x: cx + 0.3, y: 2.15, w: cw - 3.2, h: 0.4, fontFace: "Nunito Sans", fontSize: 15, bold: true, color: C.text });
  chip(s, cx + cw - 3.0, 2.16, "🔴 OpenAI key expuesta", C.danger, 2.7);
  s.addText("VITE_OPENAI_API_KEY → queda en el JS · VITE_SUPABASE_ANON_KEY (pública, OK)",
    { x: cx + 0.3, y: 2.62, w: cw - 0.6, h: 0.5, fontFace: "JetBrains Mono", fontSize: 11.5, color: C.textMuted });
  s.addText("↓ HTTPS / TLS", { x: 0, y: 3.4, w: W, h: 0.4, align: "center", fontFace: "Nunito Sans", fontSize: 16, color: C.purpleLight });
  // Supabase
  card(s, cx, 3.9, cw, 2.9, C.success);
  s.addText("🗄️  Supabase", { x: cx + 0.3, y: 4.05, w: cw - 0.6, h: 0.4, fontFace: "Nunito Sans", fontSize: 15, bold: true, color: C.text });
  const bw = (cw - 0.9) / 2;
  s.addText("Auth · bcrypt hash\ntrigger handle_new_user",
    { x: cx + 0.3, y: 4.55, w: bw, h: 0.7, fontFace: "JetBrains Mono", fontSize: 11.5, color: C.text, fill: { color: C.bg2 }, align: "left", valign: "middle", rectRadius: 0.08 });
  s.addText("PostgREST\nqueries parametrizadas",
    { x: cx + 0.6 + bw, y: 4.55, w: bw, h: 0.7, fontFace: "JetBrains Mono", fontSize: 11.5, color: C.text, fill: { color: C.bg2 }, align: "left", valign: "middle", rectRadius: 0.08 });
  s.addText("PostgreSQL + RLS · policies own_or_admin · es_admin() · RPCs SECURITY DEFINER · Backups ✅",
    { x: cx + 0.3, y: 5.4, w: cw - 0.6, h: 0.7, fontFace: "JetBrains Mono", fontSize: 11.5, color: C.text, fill: { color: "16331E" }, align: "left", valign: "middle", rectRadius: 0.08 });
}

// ============================================================
// 5 — Medidas A
// ============================================================
{
  const s = pptx.addSlide(); bg(s);
  phaseTag(s, 3, "Medidas implementadas (1 de 2)");
  title(s, "Autenticación, acceso y anti-inyección");
  card(s, MX, 1.95, CW, 2.2, C.success);
  s.addText("① Autenticación + control de acceso por rol", { x: MX + 0.3, y: 2.1, w: CW - 0.6, h: 0.4, fontFace: "Nunito Sans", fontSize: 16, bold: true, color: C.text });
  s.addText([
    "Supabase Auth (signInWithPassword / signUp).",
    "Validación de dominio en doble capa: frontend + trigger handle_new_user.",
    "RLS activado en todas las tablas; policies id_usuario = auth.uid() or es_admin().",
    "Anti-escalada: id_rol lo asigna el servidor, no el cliente.",
  ].map(t => ({ text: t, options: { bullet: { code: "2022" }, color: C.text } })),
    { x: MX + 0.3, y: 2.55, w: CW - 0.6, h: 1.5, fontFace: "Nunito Sans", fontSize: 13.5, lineSpacingMultiple: 1.15 });
  card(s, MX, 4.35, CW, 2.2, C.blue);
  s.addText("② Validación de entradas / prevención de SQLi", { x: MX + 0.3, y: 4.5, w: CW - 0.6, h: 0.4, fontFace: "Nunito Sans", fontSize: 16, bold: true, color: C.text });
  s.addText([
    "Sin SQL concatenado: el SDK envía parámetros tipados.",
    "Escritura de Reserva solo vía RPC crear_reserva / cancelar_reserva (procedimiento almacenado).",
    "Validaciones server-side: autenticación, hora_inicio < hora_fin, cupo y traslape.",
  ].map(t => ({ text: t, options: { bullet: { code: "2022" }, color: C.text } })),
    { x: MX + 0.3, y: 4.95, w: CW - 0.6, h: 1.5, fontFace: "Nunito Sans", fontSize: 13.5, lineSpacingMultiple: 1.15 });
}

// ============================================================
// 6 — Medidas B
// ============================================================
{
  const s = pptx.addSlide(); bg(s);
  phaseTag(s, 3, "Medidas implementadas (2 de 2)");
  title(s, "Cifrado, respaldo y monitoreo");
  const cw = (CW - 0.4) / 2;
  card(s, MX, 1.95, cw, 2.1, C.purpleLight);
  s.addText("③ Cifrado de datos 🔐", { x: MX + 0.3, y: 2.1, w: cw - 0.6, h: 0.4, fontFace: "Nunito Sans", fontSize: 16, bold: true, color: C.text });
  s.addText(["Contraseñas con bcrypt (nunca en texto plano).", "En tránsito: HTTPS / TLS.", "En reposo: discos cifrados AES-256."]
    .map(t => ({ text: t, options: { bullet: { code: "2022" }, color: C.text } })),
    { x: MX + 0.3, y: 2.55, w: cw - 0.6, h: 1.4, fontFace: "Nunito Sans", fontSize: 13.5, lineSpacingMultiple: 1.2 });
  card(s, MX + cw + 0.4, 1.95, cw, 2.1, C.success);
  s.addText("④ Backup y recuperación 💾", { x: MX + cw + 0.7, y: 2.1, w: cw - 0.6, h: 0.4, fontFace: "Nunito Sans", fontSize: 16, bold: true, color: C.text });
  s.addText(["Backups automáticos diarios de Supabase.", "Esquema versionado en db/ (scripts 01–09).", "Reconstrucción total ejecutando los scripts en orden."]
    .map(t => ({ text: t, options: { bullet: { code: "2022" }, color: C.text } })),
    { x: MX + cw + 0.7, y: 2.55, w: cw - 0.6, h: 1.4, fontFace: "Nunito Sans", fontSize: 13.5, lineSpacingMultiple: 1.2 });
  card(s, MX, 4.25, CW, 2.3, C.warning);
  s.addText("⑤ Monitoreo y auditoría 📊", { x: MX + 0.3, y: 4.4, w: CW - 0.6, h: 0.4, fontFace: "Nunito Sans", fontSize: 16, bold: true, color: C.text });
  s.addText([
    "LogConflictoReserva: registra cada intento de reserva fallido (quién, espacio, motivo).",
    "BloqueoReserva + pg_cron: evitan condiciones de carrera y dobles reservas.",
    "Supabase Logs: accesos a la API y errores de autenticación.",
  ].map(t => ({ text: t, options: { bullet: { code: "2022" }, color: C.text } })),
    { x: MX + 0.3, y: 4.85, w: CW - 0.6, h: 1.6, fontFace: "Nunito Sans", fontSize: 13.5, lineSpacingMultiple: 1.2 });
}

// ============================================================
// 7 — Pruebas
// ============================================================
{
  const s = pptx.addSlide(); bg(s);
  phaseTag(s, 4, "Pruebas de seguridad");
  title(s, "Resultados de las pruebas");
  const rows = [
    ["Inyección SQL en login", "Tratada como literal, rechazada", "ok"],
    ["Leer Usuario de otro (RLS)", "Devuelve vacío — filtra por auth.uid()", "ok"],
    ["Insert directo a Reserva", "Bloqueado — solo vía RPC", "ok"],
    ["Cancelar reserva ajena", "Excepción 'No autorizado' (42501)", "ok"],
    ["Escalada de id_rol", "Endurecer con trigger de inmutabilidad", "warn"],
    ["Recuperación desde backup", "Restaura por backup o scripts db/", "ok"],
    ["Extraer secretos del bundle", "Se encuentra la API key de OpenAI", "fail"],
  ];
  let y = 1.9; const h = 0.5;
  rows.forEach(([t, d, st]) => {
    const col = st === "ok" ? C.success : st === "warn" ? C.warning : C.danger;
    const ic = st === "ok" ? "✅" : st === "warn" ? "⚠️" : "❌";
    card(s, MX, y, CW, h, col, null, {});
    s.addText(ic, { x: MX + 0.18, y, w: 0.5, h, align: "center", valign: "middle", fontSize: 15 });
    s.addText(t, { x: MX + 0.7, y, w: 4.2, h, valign: "middle", fontFace: "Nunito Sans", fontSize: 13.5, bold: true, color: C.text });
    s.addText(d, { x: MX + 5.0, y, w: CW - 5.2, h, valign: "middle", fontFace: "Nunito Sans", fontSize: 12.5, color: C.textMuted });
    y += h + 0.12;
  });
  s.addText("6 de 7 amenazas mitigadas · 1 hallazgo crítico por corregir",
    { x: 0, y: 6.7, w: W, h: 0.4, align: "center", fontFace: "Nunito Sans", fontSize: 15, bold: true, color: C.success });
}

// ============================================================
// 8 — Hallazgos abiertos
// ============================================================
{
  const s = pptx.addSlide(); bg(s);
  phaseTag(s, 4, "Hallazgos abiertos");
  title(s, "Áreas que necesitan mejora");
  card(s, MX, 2.0, CW, 1.9, C.danger);
  s.addText(sev.alta[1], { x: MX + 0.3, y: 2.2, w: 1.6, h: 0.32, fontFace: "JetBrains Mono", fontSize: 11, bold: true, color: C.danger });
  s.addText("API key de OpenAI expuesta", { x: MX + 1.9, y: 2.18, w: CW - 2.2, h: 0.4, fontFace: "Nunito Sans", fontSize: 16, bold: true, color: C.text });
  s.addText([
    { text: "recommendations.js usa VITE_OPENAI_API_KEY en el cliente → se incrusta en el bundle público. ", options: { color: C.text } },
    { text: "Solución: ", options: { bold: true, color: C.pink } },
    { text: "mover la llamada a un Edge Function / backend.", options: { color: C.text } },
  ], { x: MX + 0.3, y: 2.7, w: CW - 0.6, h: 1.0, fontFace: "Nunito Sans", fontSize: 13.5, lineSpacingMultiple: 1.2 });
  card(s, MX, 4.1, CW, 1.9, C.warning);
  s.addText(sev.media[1], { x: MX + 0.3, y: 4.3, w: 1.6, h: 0.32, fontFace: "JetBrains Mono", fontSize: 11, bold: true, color: C.warning });
  s.addText("Reserva legible por todos", { x: MX + 1.9, y: 4.28, w: CW - 2.2, h: 0.4, fontFace: "Nunito Sans", fontSize: 16, bold: true, color: C.text });
  s.addText([
    { text: "fix_rls_reserva.sql abrió la tabla con USING (true) para pintar el mapa → expone PII ajena. ", options: { color: C.text } },
    { text: "Solución: ", options: { bold: true, color: C.pink } },
    { text: "una vista agregada sin PII + restaurar own_or_admin.", options: { color: C.text } },
  ], { x: MX + 0.3, y: 4.8, w: CW - 0.6, h: 1.0, fontFace: "Nunito Sans", fontSize: 13.5, lineSpacingMultiple: 1.2 });
}

// ============================================================
// 9 — Aprendizajes
// ============================================================
{
  const s = pptx.addSlide(); bg(s);
  phaseTag(s, 5, "Documentación · Aprendizajes");
  title(s, "Lo que aprendimos");
  const rows = [
    ["🛡️", "La seguridad vive en el backend", "RLS + RPCs en el servidor; nunca confiar en validaciones del cliente."],
    ["📤", "Toda variable VITE_* es pública", "Los secretos van en un servidor o Edge Function, jamás en el bundle."],
    ["🔑", "Mínimo privilegio", "Abrir una policy a USING(true) por conveniencia introduce fugas de PII."],
  ];
  let y = 2.1; const h = 1.3;
  rows.forEach(([ic, t, d]) => {
    card(s, MX, y, CW, h, C.purpleLight);
    s.addText(ic, { x: MX + 0.25, y, w: 0.9, h, align: "center", valign: "middle", fontSize: 30 });
    s.addText(t, { x: MX + 1.2, y: y + 0.25, w: CW - 1.5, h: 0.4, fontFace: "Nunito Sans", fontSize: 16, bold: true, color: C.text });
    s.addText(d, { x: MX + 1.2, y: y + 0.65, w: CW - 1.5, h: 0.5, fontFace: "Nunito Sans", fontSize: 13, color: C.textMuted });
    y += h + 0.2;
  });
}

// ============================================================
// 10 — Resumen de la presentación
// ============================================================
{
  const s = pptx.addSlide(); bg(s);
  phaseTag(s, 6, "Presentación");
  title(s, "Lo que presentamos al grupo");
  const cards = [
    [C.danger, "⚠️", "1. Riesgos identificados", ["Inyección SQL y acceso no autorizado", "Robo de credenciales / escalada de rol", "Secretos expuestos en el cliente", "Pérdida de datos"]],
    [C.success, "🛡️", "2. Medidas implementadas", ["Auth + RLS por rol (own_or_admin)", "RPCs con validación server-side", "Cifrado bcrypt + TLS", "Backups + auditoría de conflictos"]],
    [C.blue, "📊", "3. Resultados y mejoras", ["6 de 7 amenazas mitigadas", "Hallazgo: API key de OpenAI → mover a backend", "Hallazgo: Reserva legible → vista sin PII"]],
    [C.purpleLight, "💬", "4. Preguntas del grupo", ["Abrimos espacio para dudas sobre RLS, las RPCs, el manejo de contraseñas y el plan de remediación."]],
  ];
  const cw = (CW - 0.4) / 2, ch = 2.15;
  cards.forEach(([acc, ic, h3, items], k) => {
    const x = MX + (k % 2) * (cw + 0.4);
    const y = 1.95 + Math.floor(k / 2) * (ch + 0.25);
    card(s, x, y, cw, ch, acc);
    s.addText(ic, { x: x + 0.28, y: y + 0.12, w: 0.6, h: 0.5, fontSize: 22 });
    s.addText(h3, { x: x + 0.85, y: y + 0.16, w: cw - 1.1, h: 0.4, fontFace: "Nunito Sans", fontSize: 15, bold: true, color: C.text });
    s.addText(items.map(t => ({ text: t, options: { bullet: { code: "2022" }, color: C.text } })),
      { x: x + 0.28, y: y + 0.65, w: cw - 0.5, h: ch - 0.8, fontFace: "Nunito Sans", fontSize: 12, lineSpacingMultiple: 1.15 });
  });
}

// ============================================================
// 11 — Plan de remediación / cierre
// ============================================================
{
  const s = pptx.addSlide(); bg(s);
  phaseTag(s, 6, "Cierre · Próximos pasos");
  title(s, "Plan de remediación");
  const rows = [
    ["🔴", "Alta", "Mover OpenAI a un Edge Function; eliminar la key del cliente.", C.danger],
    ["🟡", "Media", "Vista agregada sin PII para el mapa; restaurar own_or_admin en Reserva.", C.warning],
    ["🟡", "Media", "Trigger que impida cambiar id_rol / numero_empleado salvo admin.", C.warning],
    ["🟢", "Baja", "Activar confirmación de correo y evaluar MFA en Supabase Auth.", C.success],
  ];
  let y = 1.95; const h = 0.72;
  rows.forEach(([ic, p, d, col]) => {
    card(s, MX, y, CW, h, col);
    s.addText(ic, { x: MX + 0.18, y, w: 0.5, h, align: "center", valign: "middle", fontSize: 15 });
    chip(s, MX + 0.7, y + (h - 0.32) / 2, p, col, 1.1);
    s.addText(d, { x: MX + 1.95, y, w: CW - 2.2, h, valign: "middle", fontFace: "Nunito Sans", fontSize: 14, color: C.text });
    y += h + 0.16;
  });
  s.addText("¡Gracias!  ¿Preguntas? 🛡️", { x: 0, y: 5.55, w: W, h: 0.8, align: "center",
    fontFace: "Nunito Sans", fontSize: 28, bold: true, color: C.pinkLight });
}

pptx.writeFile({ fileName: "presentacion-seguridad.pptx" }).then(f => {
  console.log("OK ->", f);
}).catch(e => { console.error(e); process.exit(1); });
