// src/components/ui/__tests__/ConfirmModal.test.jsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmModal from "../ConfirmModal";

describe("ConfirmModal", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      <ConfirmModal
        open={false}
        title="Título"
        message="Mensaje"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows title, message, and default button texts when open", () => {
    render(
      <ConfirmModal
        open
        title="¿Seguro?"
        message="Acción irreversible"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText("¿Seguro?")).toBeInTheDocument();
    expect(screen.getByText("Acción irreversible")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
  });

  it("uses custom confirmText and cancelText props", () => {
    render(
      <ConfirmModal
        open
        title="X"
        confirmText="Cancelar reserva"
        cancelText="Volver"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Cancelar reserva" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver" })).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        open
        title="X"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        open
        title="X"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onCancel when clicking the backdrop", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        open
        title="X"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );
    const dialog = screen.getByRole("dialog");
    await user.click(dialog);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not call onCancel when clicking inside the modal content", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        open
        title="Título interno"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByText("Título interno"));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("disables both buttons and shows 'Procesando...' while busy", () => {
    render(
      <ConfirmModal
        open
        title="X"
        busy
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    const confirmBtn = screen.getByRole("button", { name: "Procesando..." });
    expect(confirmBtn).toBeDisabled();
  });

  it("ignores backdrop click while busy", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        open
        title="X"
        busy
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByRole("dialog"));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("renders without message prop", () => {
    render(
      <ConfirmModal
        open
        title="Solo título"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText("Solo título")).toBeInTheDocument();
  });
});
