// src/lib/reserveErrors.js
// Utilidades para traducir errores de las RPCs de reservas a mensajes UI.

export const CONFLICT_REGEX = /conflicto:([^:]+):lugares_restantes=(-?\d+)/;

/**
 * Parsea un error de la RPC `crear_reserva` cuyo mensaje sigue el formato
 * `conflicto:<motivo>:lugares_restantes=<n>`.
 *
 * @param {Error|string|null|undefined} err
 * @returns {{ motivo: string, lugares_restantes: number } | null}
 */
export function parseConflictoError(err) {
  const msg = typeof err === "string" ? err : err?.message || "";
  const m = CONFLICT_REGEX.exec(msg);
  if (!m) return null;
  return {
    motivo: m[1],
    lugares_restantes: Math.max(0, parseInt(m[2], 10)),
  };
}

/**
 * Mapea un motivo del backend a un mensaje UI amigable en español.
 */
export function motivoToMensaje(motivo, lugares_restantes = 0) {
  switch (motivo) {
    case "cupo_insuficiente":
      return `Sin cupo suficiente. Solo quedan ${lugares_restantes} lugares en ese horario.`;
    case "traslape_horario":
      return "Ese horario se traslapa con otra reserva existente.";
    case "espacio_mantenimiento":
      return "El espacio está en mantenimiento y no se puede reservar.";
    case "espacio_inexistente":
      return "El espacio seleccionado ya no existe en la base de datos.";
    case "rango_invalido":
      return "La hora de inicio debe ser anterior a la de fin.";
    default:
      return `Conflicto: ${motivo}`;
  }
}

/**
 * Traduce los mensajes de error de `cancelar_reserva` a texto UI.
 */
export function cancelErrorToMensaje(err) {
  const msg = typeof err === "string" ? err : err?.message || "";
  if (msg.includes("No autorizado")) return "No tienes permiso para cancelar esta reserva.";
  if (msg.includes("ya está")) return "La reserva ya está cancelada o finalizada.";
  if (msg.includes("Reserva no encontrada")) return "La reserva ya no existe.";
  return msg || "Error desconocido al cancelar.";
}
