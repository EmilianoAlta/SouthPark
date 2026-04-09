// src/pages/Login.jsx
import { useState } from 'react';
import { C } from '../config/constants';
import { Logo, LogoPurple, Icons } from '../components/ui/Icons';
import { BtnPrimary } from '../components/ui/Buttons';
import { InputField } from '../components/ui/InputField';
import { supabase } from '../supabaseClient';
export default function LoginScreen({ onLogin, onGoRegister}){
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    //Login Function
    const handleLogin = async() => {
        if(!email || !pw) {
            setErrorMsg("Por favor, ingresa tu correo y contraseña.");
            return;
        }
        setLoading(true);
        setErrorMsg("");
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: pw,
            });

            if (error) {
                // Traducir el error msg que arroje supabase
                if (error.message.includes("Invalid login credentials")){
                    throw new Error("Correo o contraseña incorrectos.");
                }
                throw error;
            }
            // Login exitoso
            onLogin();

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
                    <span style={{ fontSize: 14, color: C.text, cursor: "pointer" }}>Acerca de</span>
                    <span style={{ fontSize: 14, color: C.text, cursor: "pointer" }}>Inicia sesión</span>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.purple1, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icons.user}</div>
                </div>
            </header>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                <div className="auth-card">
                    {/* Left: Login form */}
                    <div style={{ flex: 1, background: C.cardMid, padding: "48px 40px", display: "flex", flexDirection: "column" }}>
                        <LogoPurple size={80} />
                        <p style={{ fontSize: 12, color: C.textMuted, marginTop: 8, marginBottom: 28 }}>Bienvenido de Nuevo</p>
                        <h2 style={{ fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 32 }}>Inicia Sesión</h2>
                        {errorMsg && (
                            <div style={{ color: "#7F1D1D", fontSize: 13, marginBottom: 16, textAlign: "center", background: "rgba(248,113,113,0.5)", padding: 8, borderRadius: 8, border: `1px solid ${C.danger}` }}>
                                {errorMsg}
                            </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>
                            <InputField label="Correo" value={email} onChange={setEmail} placeholder="ejemplo@mail.com" />
                            <InputField label="Contraseña" type="password" value={pw} onChange={setPw} placeholder="••••••••" />
                        </div>
                        <BtnPrimary onClick={onLogin} disabled={loading} style={{ width: "100%", marginBottom: 16 }}>
                            {loading ? "Iniciando..." : "Inicia Sesión"}
                        </BtnPrimary>
                        <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center" }}>
                            ¿Olvidaste tu contraseña? <span style={{ color: C.purple1, cursor: "pointer" }}>Recuperala Aquí</span>
                        </p>
                    </div>
                    {/* Right: Register CTA */}
                    <div className="auth-side" style={{ background: C.cardDark, padding: "48px 36px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                        <Logo size={80} />
                        <h3 style={{ fontSize: 24, fontWeight: 700, color: C.text, marginTop: 32, marginBottom: 12 }}>¿No tienes cuenta?</h3>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 28, lineHeight: 1.6 }}>Regístrate para reservar espacios de trabajo inteligentes</p>
                        <BtnPrimary onClick={onGoRegister} style={{ background: C.white, color: C.purple5 }}>Regístrate</BtnPrimary>
                    </div>
                </div>
            </div>
        </div>
    );
}