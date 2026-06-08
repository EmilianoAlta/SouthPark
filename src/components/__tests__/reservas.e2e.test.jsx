// src/components/__tests__/reservas.e2e.test.jsx
//
// Prueba END-TO-END (de punta a punta) con BACKEND SIMULADO.
// Recorre el flujo completo de cancelación de una reserva a través de la UI real
// (ReservationsView + ConfirmModal + UserContext), contra un Supabase simulado en
// memoria. No requiere red, credenciales ni navegador: corre dentro de Vitest/jsdom.
//
// Flujo cubierto:
//   1. El usuario entra a "Tus Reservaciones" y se cargan sus reservas (GET simulado).
//   2. Cambia a vista de lista y ve una reserva PENDIENTE con botón "Cancelar".
//   3. Hace clic en "Cancelar" → se abre el modal de confirmación.
//   4. Confirma → se llama el RPC `cancelar_reserva` (simulado, muta el estado).
//   5. La UI muestra el toast de éxito y la reserva queda CANCELADA (sin botón cancelar).

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

// ── Backend simulado (Supabase en memoria) ───────────────────────────────────
const store = { reservas: [] };

function seedReservas() {
  store.reservas = [
    {
      id_reserva: 101, id_usuario: "u1", id_espacio: 1,
      fecha_reserva: "2026-06-10", hora_inicio: "10:00:00", hora_fin: "11:00:00",
      asistentes: 4, id_estado: 3, // 3 = Pendiente
      fecha_solicitud: "2026-06-02T10:00:00Z",
      Espacio: { tipo: "Sala de Juntas", codigo: "ICSJ-3040" },
    },
    {
      id_reserva: 102, id_usuario: "u1", id_espacio: 2,
      fecha_reserva: "2026-05-20", hora_inicio: "09:00:00", hora_fin: "10:00:00",
      asistentes: 1, id_estado: 5, // 5 = Finalizada
      fecha_solicitud: "2026-05-19T10:00:00Z",
      Espacio: { tipo: "Hot Desk", codigo: "MZSJ-115" },
    },
  ];
}

// Query builder encadenable que imita supabase-js
function makeQuery(table) {
  const q = {
    _table: table,
    select() { return q; },
    eq() { return q; },
    order() {
      // Devuelve copia de las filas (clonadas para reflejar mutaciones del store)
      return Promise.resolve({ data: store.reservas.map((r) => ({ ...r })), error: null });
    },
  };
  return q;
}

const rpcSpy = vi.fn();

vi.mock("../../supabaseClient", () => ({
  supabase: {
    from: (table) => makeQuery(table),
    rpc: (fn, args) => {
      rpcSpy(fn, args);
      if (fn === "cancelar_reserva") {
        const r = store.reservas.find((x) => x.id_reserva === args.p_id_reserva);
        if (!r) return Promise.resolve({ data: false, error: null });
        r.id_estado = 4; // 4 = Cancelada
        return Promise.resolve({ data: true, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  },
}));

// Usuario autenticado simulado — referencia ESTABLE para no disparar el
// useEffect([userProfile]) en bucle infinito.
const USER_CTX = { userProfile: { id_usuario: "u1", nombre: "Test" } };
vi.mock("../../context/UserContext", () => ({
  useUser: () => USER_CTX,
}));

import ReservationsView from "../ReservationsView";

describe("E2E (backend simulado): cancelar una reserva de punta a punta", () => {
  beforeEach(() => {
    seedReservas();
    rpcSpy.mockClear();
  });

  it("el usuario carga sus reservas, cancela la pendiente y la UI lo refleja", async () => {
    render(<ReservationsView animateIn={false} onGoToAreas={() => {}} />);

    // 1. Cambiar a vista de lista
    fireEvent.click(screen.getByRole("button", { name: /lista/i }));

    // 2. Se cargó la reserva pendiente con su botón "Cancelar"
    const tabla = await screen.findByRole("table");
    expect(within(tabla).getByText("Sala de Juntas")).toBeInTheDocument();
    expect(within(tabla).getByText("ICSJ-3040")).toBeInTheDocument();

    const btnCancelarFila = within(tabla).getByRole("button", { name: "Cancelar" });
    expect(btnCancelarFila).toBeInTheDocument();

    // 3. Abrir el modal de confirmación
    fireEvent.click(btnCancelarFila);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Cancelar reserva")).toBeInTheDocument();

    // 4. Confirmar la cancelación
    fireEvent.click(within(dialog).getByRole("button", { name: "Si, cancelar" }));

    // 5a. Se invocó el RPC con el id correcto
    await waitFor(() => {
      expect(rpcSpy).toHaveBeenCalledWith("cancelar_reserva", { p_id_reserva: 101 });
    });

    // 5b. Aparece el toast de éxito
    expect(await screen.findByText("Reserva cancelada correctamente.")).toBeInTheDocument();

    // 5c. Tras el refetch, la reserva quedó cancelada → ya no hay botón "Cancelar"
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
    });

    // El estado en el store simulado quedó en 4 (Cancelada)
    expect(store.reservas.find((r) => r.id_reserva === 101).id_estado).toBe(4);
  });
});
