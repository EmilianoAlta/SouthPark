// src/components/ui/Buttons.jsx
import { C } from '../../config/constants';
export const BtnPrimary = ({ children, onClick, style = {}, disabled = false }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "12px 32px", borderRadius: 8, border: "none",
    background: C.purple1, color: "#fff", fontSize: 14, fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
    textTransform: "uppercase", letterSpacing: "0.05em",
    boxShadow: "0 4px 20px rgba(161,0,255,0.3)",
    opacity: disabled ? 0.5 : 1, transition: "all 0.2s", ...style,
  }}>{children}</button>
);

export const BtnSecondary = ({ children, onClick, style = {}, disabled = false }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "12px 32px", borderRadius: 8,
    border: `1px solid ${C.glassBorder}`, background: "rgba(255,255,255,0.05)",
    color: C.text, fontSize: 14, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
    opacity: disabled ? 0.5 : 1, transition: "all 0.2s", ...style,
  }}>{children}</button>
);