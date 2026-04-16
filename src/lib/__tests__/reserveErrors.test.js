// src/lib/__tests__/reserveErrors.test.js
import { describe, it, expect } from "vitest";
import {
  CONFLICT_REGEX,
  parseConflictoError,
  motivoToMensaje,
  cancelErrorToMensaje,
} from "../reserveErrors";

describe("CONFLICT_REGEX", () => {
  it("matches the canonical conflicto:<motivo>:lugares_restantes=<n> format", () => {
    const m = CONFLICT_REGEX.exec("conflicto:cupo_insuficiente:lugares_restantes=3");
    expect(m).not.toBeNull();
    expect(m[1]).toBe("cupo_insuficiente");
    expect(m[2]).toBe("3");
  });

  it("supports negative lugares_restantes (overflow scenario)", () => {
    const m = CONFLICT_REGEX.exec("conflicto:cupo_insuficiente:lugares_restantes=-2");
    expect(m).not.toBeNull();
    expect(m[2]).toBe("-2");
  });
});

describe("parseConflictoError", () => {
  it("returns null when input is null or undefined", () => {
    expect(parseConflictoError(null)).toBeNull();
    expect(parseConflictoError(undefined)).toBeNull();
  });

  it("returns null when message does not match the protocol", () => {
    expect(parseConflictoError("network down")).toBeNull();
    expect(parseConflictoError(new Error("random failure"))).toBeNull();
  });

  it("parses an Error instance with conflict message", () => {
    const err = new Error("conflicto:traslape_horario:lugares_restantes=5");
    expect(parseConflictoError(err)).toEqual({
      motivo: "traslape_horario",
      lugares_restantes: 5,
    });
  });

  it("parses a raw string", () => {
    expect(
      parseConflictoError("conflicto:espacio_mantenimiento:lugares_restantes=0")
    ).toEqual({ motivo: "espacio_mantenimiento", lugares_restantes: 0 });
  });

  it("clamps negative lugares_restantes to 0", () => {
    expect(
      parseConflictoError("conflicto:cupo_insuficiente:lugares_restantes=-4")
    ).toEqual({ motivo: "cupo_insuficiente", lugares_restantes: 0 });
  });

  it("handles supabase-style error object (with .message)", () => {
    const err = { message: "conflicto:rango_invalido:lugares_restantes=0" };
    expect(parseConflictoError(err)).toEqual({
      motivo: "rango_invalido",
      lugares_restantes: 0,
    });
  });
});

describe("motivoToMensaje", () => {
  it("mentions lugares restantes for cupo_insuficiente", () => {
    const msg = motivoToMensaje("cupo_insuficiente", 2);
    expect(msg).toMatch(/2/);
    expect(msg.toLowerCase()).toMatch(/cupo|lugares/);
  });

  it("returns a friendly message for traslape_horario", () => {
    expect(motivoToMensaje("traslape_horario")).toMatch(/traslap/i);
  });

  it("returns a friendly message for espacio_mantenimiento", () => {
    expect(motivoToMensaje("espacio_mantenimiento")).toMatch(/mantenimiento/i);
  });

  it("returns a friendly message for espacio_inexistente", () => {
    expect(motivoToMensaje("espacio_inexistente")).toMatch(/existe/i);
  });

  it("returns a friendly message for rango_invalido", () => {
    expect(motivoToMensaje("rango_invalido")).toMatch(/hora/i);
  });

  it("falls back to showing the motivo literal when unknown", () => {
    expect(motivoToMensaje("motivo_nuevo_backend")).toMatch(/motivo_nuevo_backend/);
  });

  it("defaults lugares_restantes to 0 when not provided", () => {
    const msg = motivoToMensaje("cupo_insuficiente");
    expect(msg).toMatch(/0/);
  });
});

describe("cancelErrorToMensaje", () => {
  it("maps 'No autorizado' to permission message", () => {
    expect(cancelErrorToMensaje(new Error("No autorizado para cancelar"))).toMatch(
      /permiso/i
    );
  });

  it("maps 'ya está' to already-cancelled message", () => {
    expect(cancelErrorToMensaje("La reserva ya está cancelada")).toMatch(
      /cancelada|finalizada/i
    );
  });

  it("maps 'Reserva no encontrada' to not-exists message", () => {
    expect(cancelErrorToMensaje("Reserva no encontrada")).toMatch(/existe/i);
  });

  it("returns raw message when no rule matches", () => {
    expect(cancelErrorToMensaje("Error inesperado xyz")).toBe("Error inesperado xyz");
  });

  it("returns default text when message is empty", () => {
    expect(cancelErrorToMensaje("")).toMatch(/Error desconocido/i);
    expect(cancelErrorToMensaje(null)).toMatch(/Error desconocido/i);
  });
});
