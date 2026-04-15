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
    const [lastname1, setLastName1] = useState("");
    const [lastname2, setLastName2] = useState("");
    const [empNum, setEmpNum] = useState("");
    const [email, setEmail] = useState(""); 
    const [pw, setPw] = useState("");
    const [loading, setLoading] = useState(false); // Para mostrar que está cargando
    const [errorMsg, setErrorMsg] = useState(""); // Para mostrar errores
    const [successMsg, setSuccessMsg] = useState(""); //Mensaje de exito en registro 

    // 1. CREAMOS LA FUNCIÓN DE REGISTRO
    const handleRegister = async () => {
        setErrorMsg("");
        setSuccessMsg("");
        // Validaciones básicas
        if (!email || !pw || !name || !lastname1 || !empNum) { //algunos empleados pueden venir del extranjero donde solo tienen un apellido por lo que solo se valida el primero
            setErrorMsg("Por favor, llena todos los campos.");
            return;
        }

        //validacion de email
        const emailLowerCase = email.trim().toLowerCase();
        const isValidDomain = emailLowerCase.endsWith("@accenture.com") || emailLowerCase.endsWith("@tec.mx");

        if (!isValidDomain) {
            setErrorMsg("Correo Electronico Invalido, Por favor, use su correo corporativo válido");
            return;
        }
        setLoading(true);
        
        try {
            // Llamada a Supabase
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password: pw,
                options: {
                    data: {
                    nombre: name,
                    primer_apellido: lastname1,
                    segundo_apellido: lastname2 || null,
                    numero_empleado: empNum // Lo guardamos en los metadatos de auth
                    }
                }
            });

            if (error) throw error;

            // Si llegamos aquí, el registro fue exitoso
            // Supabase por defecto requiere confirmar el correo, pero si lo desactivaste 
            // en tu panel (Email Confirmations -> Off), el usuario ya estará logueado.
            setSuccessMsg("¡Registro exitoso!. Redirigiendo a la página de inicio de sesión...");
            setTimeout(() => {
                onGoLogin(); // Redirige al login después de mostrar el mensaje de éxito
            }, 2000); // Espera 2 segundos para que el usuario vea el mensaje            
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
                        {/* Mostrar mensaje de éxito */}
                        {successMsg && (
                            <div style={{ 
                                color: '#4ade80', 
                                background: 'rgba(74, 222, 128, 0.1)', 
                                padding: '12px', 
                                borderRadius: '8px', 
                                marginBottom: '16px', 
                                fontSize: '14px', 
                                textAlign: 'center',
                                border: '1px solid rgba(74, 222, 128, 0.3)'
                            }}>
                                {successMsg}
                            </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                            <InputField label="Nombre" value={name} onChange={setName} placeholder="Tu nombre" />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                <InputField label="Primer Apellido" value={lastname1} onChange={setLastName1} placeholder="Paterno" />
                                <InputField label="Segundo Apellido" value={lastname2} onChange={setLastName2} placeholder="Materno (Opcional)" />
                            </div>
                            <InputField label="Número de empleado" value={empNum} onChange={setEmpNum} placeholder="EMP-XXXXX" />
                            <InputField label="Correo" value={email} onChange={setEmail} placeholder="ejemplo@mail.com" />
                            <InputField label="Contraseña" type="password" value={pw} onChange={setPw} placeholder="••••••••" />
                        </div>
                        <BtnPrimary onClick={handleRegister} disabled={loading} style={{ width: "100%", marginTop: 8 }}>
                            {loading ? "Registrando..." : "Regístrate"}
                        </BtnPrimary>
                    </div>
                </div>
            </div>
        </div>
  );
};