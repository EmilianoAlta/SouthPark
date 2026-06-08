// src/lib/__tests__/recommendations.test.js
import { describe, it, expect } from "vitest";
import { horaANumero, franjaTexto, moda, top, fallbackLocal } from "../recommendations";

describe("horaANumero", () => {
  it("convierte 'HH:MM' a horas decimales", () => {
    expect(horaANumero("09:00")).toBe(9);
    expect(horaANumero("09:30")).toBe(9.5);
    expect(horaANumero("14:15")).toBeCloseTo(14.25, 2);
  });

  it("tolera segundos en el string de hora", () => {
    expect(horaANumero("08:00:00")).toBe(8);
  });
});

describe("franjaTexto", () => {
  it("clasifica la hora en la franja correcta", () => {
    expect(franjaTexto(8)).toBe("temprano por la manana");
    expect(franjaTexto(11)).toBe("por la manana");
    expect(franjaTexto(14)).toBe("por la tarde");
    expect(franjaTexto(17)).toBe("al final del dia");
  });

  it("respeta los límites de cada franja", () => {
    expect(franjaTexto(9.99)).toBe("temprano por la manana");
    expect(franjaTexto(10)).toBe("por la manana");
    expect(franjaTexto(13)).toBe("por la tarde");
    expect(franjaTexto(16)).toBe("al final del dia");
  });
});

describe("moda", () => {
  it("devuelve el valor más frecuente con su conteo", () => {
    const r = moda(["a", "b", "a", "a", "c"]);
    expect(r.valor).toBe("a");
    expect(r.cuenta).toBe(3);
    expect(r.total).toBe(5);
  });

  it("maneja arreglo vacío sin romperse", () => {
    const r = moda([]);
    expect(r.valor).toBeNull();
    expect(r.cuenta).toBe(0);
  });
});

describe("top", () => {
  it("devuelve los N valores más frecuentes ordenados", () => {
    const r = top(["x", "y", "x", "z", "x", "y"], 2);
    expect(r).toHaveLength(2);
    expect(r[0].valor).toBe("x");
    expect(r[0].cuenta).toBe(3);
    expect(r[1].valor).toBe("y");
  });

  it("no devuelve más elementos que los disponibles", () => {
    expect(top(["a"], 3)).toHaveLength(1);
  });
});

describe("fallbackLocal", () => {
  it("devuelve insights de 'sin datos' con menos de 2 reservas", () => {
    const r = fallbackLocal([], []);
    expect(r.recomendaciones).toEqual([]);
    expect(r.insights.horario.insight).toBe("Sin datos suficientes");
  });

  const historial = [
    { hora_inicio: "10:00", asistentes: 4, fecha_reserva: "2026-05-04", Espacio: { codigo: "ICSJ-3040", tipo: "Sala de Juntas", Zona: { piso: 3 } } },
    { hora_inicio: "10:30", asistentes: 5, fecha_reserva: "2026-05-05", Espacio: { codigo: "ICSJ-3041", tipo: "Sala de Juntas", Zona: { piso: 3 } } },
    { hora_inicio: "09:00", asistentes: 3, fecha_reserva: "2026-05-06", Espacio: { codigo: "MZSJ-115", tipo: "Hot Desk", Zona: { piso: 2 } } },
  ];
  const espacios = [
    { codigo: "ICSJ-3050", tipo: "Sala de Juntas", capacidad: 8, Zona: { piso: 3 } },
    { codigo: "SJ-9087", tipo: "Open Space", capacidad: 20, Zona: { piso: 9 } },
  ];

  it("genera insights basados en los patrones del historial", () => {
    const r = fallbackLocal(historial, espacios);
    expect(r.insights.horario.titulo).toBe("Horario Preferido");
    // Tipo favorito es "Sala de Juntas" (2 de 3)
    expect(r.insights.espacios.insight).toContain("Sala de Juntas");
  });

  it("genera entre 1 y 5 recomendaciones con campos válidos", () => {
    const r = fallbackLocal(historial, espacios);
    expect(r.recomendaciones.length).toBeGreaterThanOrEqual(1);
    expect(r.recomendaciones.length).toBeLessThanOrEqual(5);
    for (const rec of r.recomendaciones) {
      expect(rec).toHaveProperty("title");
      expect(rec).toHaveProperty("reason");
      expect(rec.confidence).toBeGreaterThanOrEqual(60);
      expect(rec.confidence).toBeLessThanOrEqual(97);
      expect(["pattern", "optimization", "team", "alert"]).toContain(rec.type);
    }
  });

  it("asigna ids únicos a las recomendaciones", () => {
    const r = fallbackLocal(historial, espacios);
    const ids = r.recomendaciones.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
