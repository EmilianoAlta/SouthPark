// src/components/ui/ConfirmModal.jsx
import React from "react";
import { C } from "../../config/constants";
import { BtnPrimary, BtnSecondary } from "./Buttons";

export default function ConfirmModal({
  open,
  title = "¿Confirmar acción?",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
  busy = false,
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={busy ? undefined : onCancel}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.cardDark, borderRadius: 18, padding: 32, width: 440,
          border: `1px solid ${C.glassBorder}`, animation: "fadeUp 0.3s ease",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        }}
      >
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: C.white }}>
          {title}
        </h3>
        {message && (
          <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, marginBottom: 24 }}>
            {message}
          </p>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <BtnSecondary onClick={onCancel} disabled={busy}>
            {cancelText}
          </BtnSecondary>
          <BtnPrimary
            onClick={onConfirm}
            disabled={busy}
            style={danger ? {
              background: `linear-gradient(135deg, ${C.danger}, #c0392b)`,
              boxShadow: `0 0 20px ${C.danger}40`,
            } : undefined}
          >
            {busy ? "Procesando..." : confirmText}
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}
