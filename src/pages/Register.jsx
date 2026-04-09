// src/pages/Register.jsx
// REGISTER SCREEN
import React, { useState } from "react";
import { C } from "../config/constants";
import { Logo, Icons } from "../components/ui/Icons";
import { BtnPrimary } from "../components/ui/Buttons";
import { InputField } from "../components/ui/InputField";
import { supabase } from "../supabaseClient";

export default function RegisterScreen({ onRegister, onGoLogin }) {
    const [name, setName] = useState(""); 
    const [empNum, setEmpNum] = useState("");
    const [email, setEmail] = useState(""); 
    const [pw, setPw] = useState("");
    const [loading, setLoading] = useState(false); // Para mostrar que está cargando
    const [errorMsg, setErrorMsg] = useState(""); // Para mostrar errores

    // 1. CREAMOS LA FUNCIÓN DE REGISTRO
    const handleRegister = async () => {
        // Validaciones básicas
        if (!email || !pw || !name || !empNum) {
            setErrorMsg("Por favor, llena todos los campos.");
            return;
        }

        setLoading(true);
        setErrorMsg("");

        try {
            // Llamada a Supabase
            const { data, error } = await supabase.auth.signUp({
            email: email,
            password: pw,
            options: {
                data: {
                nombre: name,
                numero_empleado: empNum // Lo guardamos en los metadatos de auth
                }
            }
            });

            if (error) throw error;

            // Si llegamos aquí, el registro fue exitoso
            // Supabase por defecto requiere confirmar el correo, pero si lo desactivaste 
            // en tu panel (Email Confirmations -> Off), el usuario ya estará logueado.
            onRegister(); 
            
        } catch (error) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };
    return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
            <header style={{ background: C.headerBg, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", flexShrink: 0 }}>
                <Logo size={44} />
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                    <span style={{ fontSize: 14, color: C.text }}>Acerca de</span>
                    <span style={{ fontSize: 14, color: C.text }}>Mi perfil</span>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.purple1, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icons.user}</div>
                </div>
            </header>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                <div className="auth-card">
                    {/* Left: Login CTA */}
                    <div className="auth-side" style={{ background: C.cardMid, padding: "48px 36px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                        <h3 style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 12 }}>¿Ya tienes cuenta?</h3>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 28, lineHeight: 1.6 }}>Inicia sesión para acceder a tus reservaciones</p>
                        <BtnPrimary onClick={onGoLogin} style={{ background: C.white, color: C.purple5 }}>Inicia Sesión</BtnPrimary>
                    </div>
                    {/* Right: Register form */}
                    <div style={{ flex: 1, background: C.cardDark, padding: "48px 40px", display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                            <Logo size={60} />
                        </div>
                        <h2 style={{ fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 28 }}>Regístrate</h2>
                        {/* Mostrat mensaje de error */}
                        {errorMsg && (
                            <div style={{ color: C.danger, fontSize: 13, marginBottom: 16, textAlign: "center", background: "rgba(248,113,113,0.1)", padding: 8, borderRadius: 8 }}>
                                {errorMsg}
                            </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                            <InputField label="Nombre" value={name} onChange={setName} placeholder="Tu nombre" />
                            <InputField label="Número de empleado" value={empNum} onChange={setEmpNum} placeholder="EMP-XXXXX" />
                            <InputField label="Correo" value={email} onChange={setEmail} placeholder="ejemplo@mail.com" />
                            <InputField label="Contraseña" type="password" value={pw} onChange={setPw} placeholder="••••••••" />
                        </div>
                        <BtnPrimary onClick={onRegister} disabled={loading} style={{ width: "100%", marginTop: 8 }}>
                            {loading ? "Registrando..." : "Regístrate"}
                        </BtnPrimary>
                    </div>
                </div>
            </div>
        </div>
  );
};