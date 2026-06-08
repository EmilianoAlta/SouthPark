// src/lib/__tests__/gamification.test.js
import { describe, it, expect } from "vitest";
import {
  calcularXP,
  calcularNivel,
  getRango,
  calcularRacha,
  calcularBadges,
  calcularDesafioSemanal,
} from "../gamification";

// ── Helpers de fecha relativos a "hoy" para tests deterministas ──────────────
function fechaConOffset(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const HOY = fechaConOffset(0);
const AYER = fechaConOffset(-1);
const ANTEAYER = fechaConOffset(-2);
const MANANA = fechaConOffset(1);

describe("calcularXP", () => {
  it("suma 50 XP por cada reserva finalizada (id_estado 5)", () => {
    const reservas = [
      { id_estado: 5, fecha_reserva: AYER },
      { id_estado: 5, fecha_reserva: AYER },
    ];
    expect(calcularXP(reservas)).toBe(100);
  });

  it("suma 50 XP (activa + check-in) por reserva activa (id_estado 2)", () => {
    expect(calcularXP([{ id_estado: 2, fecha_reserva: HOY }])).toBe(50);
  });

  it("resta 10 XP por reserva cancelada (id_estado 4)", () => {
    const reservas = [
      { id_estado: 5, fecha_reserva: AYER },
      { id_estado: 4, fecha_reserva: AYER },
    ];
    expect(calcularXP(reservas)).toBe(40); // 50 - 10
  });

  it("suma 30 XP a una reserva pendiente/confirmada futura", () => {
    expect(calcularXP([{ id_estado: 3, fecha_reserva: MANANA }])).toBe(30);
    expect(calcularXP([{ id_estado: 1, fecha_reserva: MANANA }])).toBe(30);
  });

  it("penaliza como no-show (-25) una reserva confirmada/pendiente ya vencida", () => {
    // 50 (finalizada) - 25 (no-show) = 25
    const reservas = [
      { id_estado: 5, fecha_reserva: AYER },
      { id_estado: 1, fecha_reserva: ANTEAYER },
    ];
    expect(calcularXP(reservas)).toBe(25);
  });

  it("nunca devuelve XP negativo (piso en 0)", () => {
    const reservas = [
      { id_estado: 4, fecha_reserva: AYER },
      { id_estado: 4, fecha_reserva: AYER },
    ];
    expect(calcularXP(reservas)).toBe(0);
  });

  it("devuelve 0 con historial vacío", () => {
    expect(calcularXP([])).toBe(0);
  });
});

describe("calcularNivel", () => {
  it("arranca en nivel 1 con 0 XP", () => {
    expect(calcularNivel(0)).toBe(1);
  });

  it("sube de nivel cada 500 XP", () => {
    expect(calcularNivel(499)).toBe(1);
    expect(calcularNivel(500)).toBe(2);
    expect(calcularNivel(1000)).toBe(3);
    expect(calcularNivel(2750)).toBe(6);
  });
});

describe("getRango", () => {
  it("asigna el rango correcto según el nivel", () => {
    expect(getRango(1)).toBe("Novato");
    expect(getRango(2)).toBe("Novato");
    expect(getRango(3)).toBe("Reservador");
    expect(getRango(5)).toBe("Habitual");
    expect(getRango(8)).toBe("Experto");
    expect(getRango(10)).toBe("Veterano");
    expect(getRango(15)).toBe("Leyenda");
    expect(getRango(20)).toBe("Maestro Supremo");
    expect(getRango(99)).toBe("Maestro Supremo");
  });
});

describe("calcularRacha", () => {
  it("devuelve 0 sin reservas", () => {
    expect(calcularRacha([])).toBe(0);
  });

  it("cuenta días consecutivos terminando hoy", () => {
    const reservas = [
      { id_estado: 5, fecha_reserva: HOY },
      { id_estado: 5, fecha_reserva: AYER },
      { id_estado: 5, fecha_reserva: ANTEAYER },
    ];
    expect(calcularRacha(reservas)).toBe(3);
  });

  it("ignora reservas canceladas en la racha", () => {
    const reservas = [
      { id_estado: 4, fecha_reserva: HOY }, // cancelada, no cuenta
      { id_estado: 5, fecha_reserva: AYER },
      { id_estado: 5, fecha_reserva: ANTEAYER },
    ];
    expect(calcularRacha(reservas)).toBe(2);
  });

  it("rompe la racha si la última reserva es de hace más de un día", () => {
    expect(calcularRacha([{ id_estado: 5, fecha_reserva: fechaConOffset(-5) }])).toBe(0);
  });

  it("colapsa varias reservas del mismo día en un solo día de racha", () => {
    const reservas = [
      { id_estado: 5, fecha_reserva: HOY },
      { id_estado: 2, fecha_reserva: HOY },
      { id_estado: 5, fecha_reserva: AYER },
    ];
    expect(calcularRacha(reservas)).toBe(2);
  });
});

describe("calcularBadges", () => {
  it("otorga 'Primer Paso' con al menos una reserva no cancelada", () => {
    const { badges } = calcularBadges([{ id_estado: 5, fecha_reserva: AYER, id_espacio: 1, hora_inicio: "10:00:00" }], 50, 1, 0);
    const primerPaso = badges.find((b) => b.name === "Primer Paso");
    expect(primerPaso.earned).toBe(true);
  });

  it("no otorga 'Nivel 10' por debajo del nivel 10", () => {
    const { badges } = calcularBadges([], 0, 5, 0);
    expect(badges.find((b) => b.name === "Nivel 10").earned).toBe(false);
  });

  it("calcula puntualidad como % de reservas con check-in sobre las pasadas", () => {
    const reservas = [
      { id_estado: 5, fecha_reserva: ANTEAYER, id_espacio: 1, hora_inicio: "08:00:00" },
      { id_estado: 2, fecha_reserva: AYER, id_espacio: 2, hora_inicio: "08:00:00" },
    ];
    const { puntualidad } = calcularBadges(reservas, 100, 2, 0);
    expect(puntualidad).toBeGreaterThan(0);
    expect(puntualidad).toBeLessThanOrEqual(100);
  });

  it("cuenta espacios únicos para el badge 'Explorador'", () => {
    const reservas = [1, 2, 3, 4, 5].map((id) => ({
      id_estado: 5, fecha_reserva: AYER, id_espacio: id, hora_inicio: "10:00:00",
    }));
    const { espaciosUnicos, badges } = calcularBadges(reservas, 250, 1, 0);
    expect(espaciosUnicos).toBe(5);
    expect(badges.find((b) => b.name === "Explorador").earned).toBe(true);
  });
});

describe("calcularDesafioSemanal", () => {
  it("tiene meta de 3 espacios y recompensa de 200 XP", () => {
    const desafio = calcularDesafioSemanal([]);
    expect(desafio.target).toBe(3);
    expect(desafio.reward).toBe(200);
    expect(desafio.progress).toBe(0);
  });

  it("no cuenta más allá de la meta", () => {
    const reservas = [10, 11, 12, 13].map((id) => ({
      id_estado: 5, fecha_reserva: HOY, id_espacio: id,
    }));
    const desafio = calcularDesafioSemanal(reservas);
    expect(desafio.progress).toBe(3);
  });
});
