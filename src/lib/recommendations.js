// src/lib/recommendations.js
// Motor de recomendaciones: GPT-4o-mini con fallback local.
import { supabase } from "../supabaseClient";

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// ── Fetch de datos ─────────────────────────────────────────────────────────

async function fetchHistorial(userId) {
  const { data, error } = await supabase
    .from("Reserva")
    .select("id_reserva, id_espacio, fecha_reserva, hora_inicio, hora_fin, asistentes, id_estado, Espacio(codigo, tipo, capacidad, Zona(piso, nombre_zona))")
    .eq("id_usuario", userId)
    .in("id_estado", [1, 2, 3, 5])
    .order("fecha_reserva", { ascending: false })
    .limit(200);

  if (error) { console.error("Error trayendo historial:", error); return []; }
  return data || [];
}

async function fetchEspaciosDisponibles() {
  const { data, error } = await supabase
    .from("Espacio")
    .select("id_espacio, codigo, tipo, capacidad, estado_espacio, disponible, Zona(piso, nombre_zona)")
    .eq("estado_espacio", "disponible");

  if (error) { console.error("Error trayendo espacios:", error); return []; }
  return data || [];
}

// ── Llamada a GPT-4o-mini ──────────────────────────────────────────────────

async function llamarGPT(historial, espaciosDisponibles) {
  // Preparar resumen compacto del historial para no gastar tokens
  const resumenHistorial = historial.slice(0, 50).map((r) => ({
    fecha: r.fecha_reserva,
    inicio: String(r.hora_inicio).slice(0, 5),
    fin: String(r.hora_fin).slice(0, 5),
    asistentes: r.asistentes,
    espacio: r.Espacio?.codigo || "?",
    tipo: r.Espacio?.tipo || "?",
    piso: r.Espacio?.Zona?.piso || "?",
    estado: r.id_estado,
  }));

  const resumenEspacios = espaciosDisponibles.slice(0, 30).map((e) => ({
    codigo: e.codigo,
    tipo: e.tipo,
    capacidad: e.capacidad,
    piso: e.Zona?.piso || "?",
    zona: e.Zona?.nombre_zona || "?",
  }));

  const systemPrompt = `Eres un motor de recomendaciones de espacios de trabajo para una oficina corporativa.
Analiza el historial de reservas del usuario y genera recomendaciones personalizadas basadas en sus patrones.

Responde SOLO con un JSON valido (sin markdown, sin backticks) con esta estructura exacta:
{
  "insights": {
    "horario": { "titulo": "Horario Preferido", "insight": "...", "detalle": "..." },
    "espacios": { "titulo": "Espacios Favoritos", "insight": "...", "detalle": "..." },
    "equipo": { "titulo": "Patron de Equipo", "insight": "...", "detalle": "..." }
  },
  "recomendaciones": [
    {
      "id": 1,
      "title": "CodEspacio - Dia HH:MM",
      "reason": "Explicacion personalizada de por que se recomienda...",
      "confidence": 85,
      "type": "pattern|optimization|team|alert",
      "tags": ["Tag1", "Tag2"]
    }
  ]
}

Tipos validos: "pattern" (patron de uso), "optimization" (optimizacion), "team" (equipo), "alert" (alerta/mantenimiento).
Genera entre 2 y 5 recomendaciones. El campo confidence va de 60 a 97.
Los insights deben ser concisos y basados en datos reales del historial.
Responde en espanol.`;

  const userPrompt = `Historial de reservas del usuario (${historial.length} total, mostrando las ultimas ${resumenHistorial.length}):
${JSON.stringify(resumenHistorial, null, 1)}

Espacios disponibles actualmente:
${JSON.stringify(resumenEspacios, null, 1)}

Genera recomendaciones personalizadas basadas en los patrones observados.`;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI API error ${resp.status}: ${err}`);
  }

  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content || "";

  // Limpiar posible markdown wrapping
  const limpio = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  return JSON.parse(limpio);
}

// ── Fallback local (sin API key) ───────────────────────────────────────────

const DIAS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

function horaANumero(h) {
  const [hh, mm] = String(h).split(":").map(Number);
  return hh + (mm || 0) / 60;
}

function franjaTexto(horaDecimal) {
  if (horaDecimal < 10) return "temprano por la manana";
  if (horaDecimal < 13) return "por la manana";
  if (horaDecimal < 16) return "por la tarde";
  return "al final del dia";
}

function moda(arr) {
  const freq = {};
  arr.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
  let best = null, max = 0;
  for (const [k, c] of Object.entries(freq)) {
    if (c > max) { max = c; best = k; }
  }
  return { valor: best, cuenta: max, total: arr.length };
}

function top(arr, n = 3) {
  const freq = {};
  arr.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([valor, cuenta]) => ({ valor, cuenta }));
}

function fallbackLocal(historial, espacios) {
  if (historial.length < 2) {
    return {
      insights: {
        horario: { titulo: "Horario Preferido", insight: "Sin datos suficientes", detalle: "Reserva mas espacios para obtener insights" },
        espacios: { titulo: "Espacios Favoritos", insight: "Sin datos suficientes", detalle: "Reserva mas espacios para obtener insights" },
        equipo: { titulo: "Patron de Equipo", insight: "Sin datos suficientes", detalle: "Reserva mas espacios para obtener insights" },
      },
      recomendaciones: [],
    };
  }

  const horas = historial.map((r) => horaANumero(r.hora_inicio));
  const tipos = historial.map((r) => r.Espacio?.tipo).filter(Boolean);
  const pisos = historial.map((r) => r.Espacio?.Zona?.piso).filter(Boolean);
  const dias = historial.map((r) => DIAS[new Date(r.fecha_reserva + "T12:00:00").getDay()]);
  const asistentes = historial.map((r) => r.asistentes);
  const espacioCodigos = historial.map((r) => r.Espacio?.codigo).filter(Boolean);

  const horaPromedio = horas.reduce((a, b) => a + b, 0) / horas.length;
  const asistentesPromedio = Math.round(asistentes.reduce((a, b) => a + b, 0) / asistentes.length);
  const tipoFav = moda(tipos);
  const pisoFav = moda(pisos.map(String));
  const diaFav = moda(dias);
  const topEsp = top(espacioCodigos, 3);

  const pctTipo = Math.round((tipoFav.cuenta / historial.length) * 100);
  const pctPiso = Math.round((pisoFav.cuenta / historial.length) * 100);

  const insights = {
    horario: {
      titulo: "Horario Preferido",
      insight: `Reservas ${franjaTexto(horaPromedio)} (${diaFav.valor || "variable"})`,
      detalle: `${Math.round(horaPromedio)}:00 hrs promedio en ${historial.length} reservas`,
    },
    espacios: {
      titulo: "Espacios Favoritos",
      insight: `Tipo "${tipoFav.valor}" en Piso ${pisoFav.valor}`,
      detalle: `${topEsp.map((e) => e.valor).join(", ") || "-"} mas frecuentes`,
    },
    equipo: {
      titulo: "Patron de Equipo",
      insight: `~${asistentesPromedio} personas por reserva`,
      detalle: `${historial.length} reservas analizadas`,
    },
  };

  const recs = [];
  let id = 1;

  if (tipoFav.valor && diaFav.valor) {
    const e = espacios.find((e) => e.tipo === tipoFav.valor && e.capacidad >= asistentesPromedio);
    if (e) recs.push({ id: id++, title: `${e.codigo} — ${diaFav.valor} ${Math.round(horaPromedio)}:00`, reason: `Basado en tus ultimas ${historial.length} reservas, prefieres "${tipoFav.valor}" los ${diaFav.valor.toLowerCase()}s ${franjaTexto(horaPromedio)}.`, confidence: Math.min(97, pctTipo + 15), type: "pattern", tags: ["Tu horario preferido", tipoFav.valor] });
  }

  if (pisoFav.valor) {
    const piso = Number(pisoFav.valor);
    const e = espacios.find((e) => e.Zona?.piso === piso && e.capacidad >= asistentesPromedio);
    if (e) recs.push({ id: id++, title: `${e.codigo} — Piso ${piso}`, reason: `El ${pctPiso}% de tus reservas han sido en el Piso ${piso}. ${e.codigo} esta disponible.`, confidence: Math.min(95, pctPiso + 10), type: "optimization", tags: [`Piso ${piso}`, "Tu zona habitual"] });
  }

  if (asistentesPromedio > 1) {
    const e = espacios.find((e) => e.capacidad >= asistentesPromedio && e.capacidad <= asistentesPromedio * 2);
    if (e) recs.push({ id: id++, title: `${e.codigo} — Ideal para ~${asistentesPromedio} personas`, reason: `Tu grupo promedio es de ${asistentesPromedio} personas. ${e.codigo} se ajusta bien.`, confidence: 82, type: "team", tags: ["Equipo", "Espacio flexible"] });
  }

  if (tipoFav.valor) {
    const e = espacios.find((e) => e.tipo !== tipoFav.valor && e.capacidad >= asistentesPromedio);
    if (e) recs.push({ id: id++, title: `${e.codigo} — Prueba algo diferente`, reason: `Normalmente reservas "${tipoFav.valor}". Prueba "${e.tipo}" para variar.`, confidence: 68, type: "alert", tags: ["Explorar", e.tipo] });
  }

  return { insights, recomendaciones: recs };
}

// ── API publica ────────────────────────────────────────────────────────────

export async function obtenerRecomendaciones(userId) {
  const [historial, espacios] = await Promise.all([
    fetchHistorial(userId),
    fetchEspaciosDisponibles(),
  ]);

  let resultado;

  // Intentar con GPT-4o-mini si hay API key y hay historial
  if (OPENAI_KEY && historial.length >= 2) {
    try {
      resultado = await llamarGPT(historial, espacios);
      // Asegurar que los IDs sean unicos
      resultado.recomendaciones = (resultado.recomendaciones || []).map((r, i) => ({
        ...r,
        id: r.id || i + 1,
      }));
    } catch (e) {
      console.warn("Fallback a motor local — error de OpenAI:", e.message);
      resultado = fallbackLocal(historial, espacios);
    }
  } else {
    resultado = fallbackLocal(historial, espacios);
  }

  return {
    recomendaciones: resultado.recomendaciones || [],
    insights: resultado.insights || {},
    totalReservasAnalizadas: historial.length,
    usandoGPT: !!OPENAI_KEY && historial.length >= 2,
  };
}
