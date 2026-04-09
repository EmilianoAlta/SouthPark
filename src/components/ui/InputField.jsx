import React, { useState } from "react";
import { C } from "../../config/constants"; 
import { Icons } from "./Icons"; 

export const InputField = ({ label, type = "text", value, onChange, placeholder, icon }) => {
  // ¡Aquí es donde React se quejaba porque no sabía qué era useState!
  const [showPw, setShowPw] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: C.text, textTransform: "capitalize" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        <input
          type={type === "password" ? (showPw ? "text" : "password") : type}
          value={value} 
          onChange={e => onChange(e.target.value)} 
          placeholder={placeholder}
          style={{
            width: "100%", padding: "12px 16px", paddingRight: type === "password" ? 44 : 16,
            borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.95)", color: "#1a0a1e",
            fontSize: 14, fontFamily: "inherit", outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = C.purple1}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.2)"}
        />
        {type === "password" && (
          <button onClick={() => setShowPw(!showPw)} style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "#666", display: "flex",
          }}>
            {showPw ? Icons.eyeOff : Icons.eye}
          </button>
        )}
      </div>
    </div>
  );
};