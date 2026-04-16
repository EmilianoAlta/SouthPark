// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { C, aiRecommendations, floorAreas, gamificationData } from "../config/constants";
import { Logo, Icons } from "../components/ui/Icons";
import { BtnPrimary, BtnSecondary } from "../components/ui/Buttons";
import { StatusBadge, PulseDot, ConfidenceMeter, XPBar } from "../components/ui/Widgets";
import { useUser } from "../context/UserContext";

// Importamos las vistas segmentadas
import ReservationsView from "../components/ReservationsView";
import ProfileView from "../components/ProfileView";
import { supabase } from "../supabaseClient";

export default function DashboardApp({ onLogout }) {
  const [screen, setScreen] = useState("areas");
  const [animateIn, setAnimateIn] = useState(false);
  const { userProfile } = useUser();

  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [reserveModal, setReserveModal] = useState(null);
  const [bdEspacios, setBDEspacios] = useState([]);
  const [expandedRec, setExpandedRec] = useState(null);
  const [floatAlert, setFloatAlert] = useState(null);

  const ShowFloatAlert = (message, type = "success") => {
    setFloatAlert({message, type});
    setTimeout(() => setFloatAlert(null), 4000);
  }

  const [isReserving, setIsReserving] = useState(false);
  const [formReserva, setFormReserva] = useState({
    fecha_reserva: "",
    hora_inicio: "",
    hora_fin: "",
    asistentes: ""
  });

  // Constantes de horas (Monterrey)
  const hoy = new Date();
  // Extraemos la fecha exacta sin alterar la zona horaria del navegador
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const dd = String(hoy.getDate()).padStart(2, '0');
  const fechaHoyStr = `${yyyy}-${mm}-${dd}`;
  // Extraemos la hora exacta en formato 24hrs compatible con Supabase
  const hh = String(hoy.getHours()).padStart(2, '0');
  const min = String(hoy.getMinutes()).padStart(2, '0');
  const horaActualStr = `${hh}:${min}:00`;
  
  // funcion para limpiar el modal de reserva
  const cerrarModalYLimpiar = () => {
    setReserveModal(null);
    setFormReserva({ fecha_reserva: "", hora_inicio: "", hora_fin: "", asistentes: "" });
    setIsReserving(false);
  };

  useEffect(() => { 
    if(screen === "areas"){
      const fetchEspaciosYReservas = async () => {
        const {data, error} = await supabase
        .from("Espacio")
        .select(`*, Reserva(id_reserva, asistentes, id_estado, fecha_reserva, hora_inicio, hora_fin)`);
        
        if (!error && data) setBDEspacios(data);
        else console.error("Error trayendo el mapa:", error);
      };
      fetchEspaciosYReservas();
    }
    setAnimateIn(false); 
    const t = setTimeout(() => setAnimateIn(true), 50); 
    return () => clearTimeout(t); 
  }, [screen]);

  if (!userProfile) return null;

  const iniciales = `${userProfile.nombre?.[0] || ""}${userProfile.primer_apellido?.[0] || ""}`.toUpperCase();
  const areaStatusColor = (s) => s === "available" ? C.success : s === "occupied" ? C.danger : C.warning;

  const sidebarItems = [
    { id: "areas", icon: Icons.map, label: "Areas Disponibles" },
    { id: "reservations", icon: Icons.calendar, label: "Reservaciones" },
    { id: "ai", icon: Icons.sparkle, label: "IA Recomendaciones" },
    { id: "gamification", icon: Icons.trophy, label: "Gamificación" },
    { id: "profile", icon: Icons.user, label: "Perfil" },
  ];

  const handleConfirmReserve = async () => {
    if(!formReserva.fecha_reserva || !formReserva.hora_inicio || !formReserva.hora_fin || !formReserva.asistentes) {
      ShowFloatAlert("Por favor, completa todos los campos para reservar.", "error");
      return;
    }
    if(formReserva.hora_inicio >= formReserva.hora_fin) {
      ShowFloatAlert("La hora de inicio debe ser anterior a la hora de fin.", "error");
      return;
    }

    //Obtener el ID numérico correcto del espacio
    const espacioReal = bdEspacios.find(e => e.codigo === reserveModal.id);
    const espacioIdNumeric = reserveModal.dbId || espacioReal?.id_espacio;

    //Obtener la capacidad real del espacio
    const capacidadReal = espacioReal?.capacidad || reserveModal.capacity;
    if (!espacioIdNumeric) {
      ShowFloatAlert("Error: No se pudo verificar la identidad de la sala en la base de datos.", "error");
      return;
    }

    setIsReserving(true);
    try{
      const {data: reservasExistentes, error: errorReservas} = await supabase
        .from("Reserva")
        .select('hora_inicio, hora_fin, asistentes')
        .eq('id_espacio', espacioIdNumeric)
        .eq('fecha_reserva', formReserva.fecha_reserva)
        .in('id_estado', [1, 2, 3]); 

      if(errorReservas) throw errorReservas;

      // 1. Filtramos todas las reservas que chocan con nuestro horario
      const reservasEnConflicto = reservasExistentes?.filter(r => {
        const startA = formReserva.hora_inicio;
        const endA = formReserva.hora_fin;
        const startB = r.hora_inicio.slice(0,5);
        const endB = r.hora_fin.slice(0,5);
        // Hay choque si nuestro inicio es antes de su fin, Y nuestro fin es después de su inicio
        return (startA < endB && endA > startB); 
      }) || [];

      // 2. Sumamos los asistentes de las reservas que chocan
      const lugaresOcupados = reservasEnConflicto?.filter(r => {
        return (formReserva.hora_inicio < r.hora_fin && formReserva.hora_fin > r.hora_inicio);
      }).reduce((s, r) => s + r.asistentes, 0) || 0;

      const lugaresSolicitados = parseInt(formReserva.asistentes);

      // 3. Verificamos si hay espacio suficiente
      if (lugaresOcupados + lugaresSolicitados > capacidadReal) {
        const lugaresRestantes = Math.max(0, capacidadReal - lugaresOcupados);
        ShowFloatAlert(`Sin cupo suficiente. Solo quedan ${lugaresRestantes} lugares disponibles en ese horario.`, "error");
        setIsReserving(false);
        return;
      }

      // 🟢 GUARDADO DE RESERVA
      const { error: errorCrearReserva } = await supabase.from('Reserva').insert({
        id_usuario: userProfile.id_usuario,
        id_espacio: parseInt(espacioIdNumeric), // Usamos el numérico aquí
        fecha_reserva: formReserva.fecha_reserva,
        hora_inicio: `${formReserva.hora_inicio}:00`,
        hora_fin: `${formReserva.hora_fin}:00`,
        id_estado: 1, 
        asistentes: lugaresSolicitados
      });

      if(errorCrearReserva) throw errorCrearReserva;

      ShowFloatAlert(`Reserva creada exitosamente para ${reserveModal.name}.`, "success");
      cerrarModalYLimpiar();

      // Si con esta reserva el área se llena para este momento, la marcamos en la DB
      if (lugaresOcupados + lugaresSolicitados === capacidadReal) {
        supabase
          .from("Espacio")
          .update({ estado_espacio: 'ocupado', disponible: false })
          .eq('id_espacio', espacioIdNumeric)
          .then(({ error }) => {
            if(error) console.error("La sala se llenó, pero falló la actualización en Espacio:", error);
          });
      }

      // Recargar datos en el mapa inmediatamente
      const {data} = await supabase.from("Espacio").select(`*, Reserva(*)`);
      if (data) setBDEspacios(data);

    } catch(error){
      console.error("Error creando reserva:", error);
      ShowFloatAlert(`Error: ${error.message || "Error al conectar con la base de datos."}`, "error");
    } finally{
      setIsReserving(false);
    }
  }
  
  return (
    <div style={{ fontFamily: "'Nunito Sans', sans-serif", minHeight: "100vh", display: "flex", flexDirection: "column", background: "#1a0a1e", color: C.text }}>
      <header style={{ background: C.headerBg, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", borderBottom: `1px solid ${C.glassBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Logo size={44} />
          <span style={{ fontWeight: 800, fontSize: 18 }}>WorkSpace</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 14, cursor: "pointer" }} onClick={() => setScreen("profile")}>Mi perfil</span>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.purple1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
            {iniciales}
          </div>
        </div>
      </header>

      <div className="dash-layout">
        <nav className="dash-sidebar" style={{ background: C.cardLight, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 6, borderRight: `1px solid ${C.glassBorder}` }}>
           <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 800, fontSize: 18 }}>
              {iniciales}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.white, textTransform: "capitalize" }}>
                {userProfile.nombre} {userProfile.primer_apellido}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                {userProfile.id_rol === 1 ? "Administrador" : "Empleado"}
              </div>
            </div>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.2)", margin: "0 0 8px" }} />

          {sidebarItems.map(item => (
            <button key={item.id} onClick={() => setScreen(item.id)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderRadius: 10, border: "none",
              cursor: "pointer", fontSize: 14, fontWeight: screen === item.id ? 700 : 500, color: C.white, textAlign: "left", width: "100%",
              background: screen === item.id ? "linear-gradient(90deg, rgba(161,0,255,0.35) 0%, rgba(161,0,255,0.12) 100%)" : "transparent"
            }}>
              <span style={{ opacity: screen === item.id ? 1 : 0.65 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={onLogout} style={{ display: "flex", gap: 10, padding: "12px 16px", borderRadius: 10, border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.05)", textAlign: "left", width: "100%" }}>
            {Icons.logout} Cerrar Sesión
          </button>
        </nav>

        <main className="dash-main" style={{ padding: 32 }}>
          <div style={{ animation: animateIn ? "fadeUp 0.5s ease forwards" : "none", opacity: animateIn ? 1 : 0 }}>

            {screen === "reservations" && <ReservationsView animateIn={animateIn} onGoToAreas={() => setScreen("areas")} />}
            {screen === "profile" && <ProfileView animateIn={animateIn} />}

            {screen === "areas" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                  <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Areas Disponibles</h1>
                    <p style={{ fontSize: 14, color: C.textMuted }}>Ocupación en tiempo real: {fechaHoyStr} | {horaActualStr.slice(0,5)}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, color: C.textMuted }}>Piso</span>
                    <select value={selectedFloor} onChange={e => setSelectedFloor(+e.target.value)} style={{
                      padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.glassBorder}`,
                      background: "rgba(161,0,255,0.12)", color: C.text, fontSize: 14, fontFamily: "inherit", cursor: "pointer",
                    }}>
                      {[1, 2, 3, 4, 5, 6].map(f => <option key={f} value={f} style={{ background: "#1a0a1e" }}>Piso {f}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 24 }}>
                  <div style={{ flex: 1, borderRadius: 16, border: `2px solid ${C.glassBorder}`, background: "rgba(0,0,0,0.6)", padding: 20, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 16, left: 20, fontSize: 12, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", zIndex: 2 }}>Piso {selectedFloor}</div>
                    <svg viewBox="0 0 100 82" style={{ width: "100%", height: "auto" }}>
                      <path d="M 3 5 L 97 5 L 97 28 L 95 28 L 95 80 L 5 80 L 5 28 L 3 28 Z" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
                      {[20, 40, 60, 80].map(y => <line key={`h${y}`} x1="3" y1={y * 0.82} x2="97" y2={y * 0.82} stroke="rgba(255,255,255,0.04)" strokeWidth="0.2" />)}
                      {[20, 40, 60, 80].map(x => <line key={`v${x}`} x1={x} y1="5" x2={x} y2="80" stroke="rgba(255,255,255,0.04)" strokeWidth="0.2" />)}
                      {floorAreas.map(area => {
                        const espacioBD = bdEspacios.find(e => e.codigo === area.id);
                        const capacidadReal = espacioBD ? espacioBD.capacidad : area.capacity;
                        
                        const isMaintenance = espacioBD?.estado_espacio === 'mantenimiento';
                        const isOccupiedByAdmin = espacioBD?.estado_espacio === 'ocupado';
                        
                        // Sumar TODOS los asistentes que estén AHORA mismo
                        let asistentesAhora = 0;
                        if (isOccupiedByAdmin) {
                          asistentesAhora = capacidadReal; 
                        } else {
                          const reservasActivas = espacioBD?.Reserva?.filter(r => 
                            (r.id_estado === 1 || r.id_estado === 2) && 
                            r.fecha_reserva === fechaHoyStr &&
                            horaActualStr >= r.hora_inicio && horaActualStr < r.hora_fin // < en vez de <= para evitar overlap de horas exactas
                          ) || [];
                          
                          // Sumamos los asistentes de todas las reservas que están corriendo en este segundo
                          asistentesAhora = reservasActivas.reduce((suma, r) => suma + r.asistentes, 0);
                        }

                        const boxStatus = isMaintenance ? 'maintenance' : (asistentesAhora >= capacidadReal ? 'occupied' : 'available')
                        return(
                          <g key={area.id} onClick={() => setSelectedArea({...area, dbId: espacioBD?.id_espacio})} style={{ cursor: "pointer" }}>
                            <rect x={area.x} y={area.y} width={area.w} height={area.h} rx="1.5"
                              fill={selectedArea?.id === area.id ? `${areaStatusColor(boxStatus)}30` : `${areaStatusColor(boxStatus)}15`}
                              stroke={selectedArea?.id === area.id ? areaStatusColor(boxStatus) : `${areaStatusColor(boxStatus)}60`}
                              strokeWidth={selectedArea?.id === area.id ? "0.6" : "0.3"}
                              style={{ transition: "all 0.3s" }}
                            />
                            <text x={area.x + area.w / 2} y={area.y + area.h / 2 - 2} textAnchor="middle" fill={C.white} fontSize="2.8" fontWeight="700" fontFamily="inherit">{area.name}</text>
                            <text x={area.x + area.w / 2} y={area.y + area.h / 2 + 4} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="2" fontFamily="inherit">{area.type}</text>
                            {Array.from({ length: Math.min(capacidadReal, 8) }).map((_, di) => {

                              let dotColor = C.success; 
                              if (isMaintenance) {
                                dotColor = C.warning; 
                              } else if (di < asistentesAhora) {
                                dotColor = C.danger; 
                              }

                              const puntosEnFila = Math.min(capacidadReal, 4); 
                              const anchoDeFila = (puntosEnFila - 1) * 4; 
                              const startX = (area.x + area.w / 2) - (anchoDeFila / 2); 

                              return(
                                <circle 
                                  key={di} 
                                  cx={startX + (di % 4) * 4} 
                                  cy={area.y + area.h - 4 + Math.floor(di / 4) * 3} 
                                  r="0.8"
                                  fill={dotColor}
                                  style={{ transition: "fill 0.3s ease"}}
                                />
                              );
                            })}
                          </g>
                        );
                      })}
                    </svg>

                    <div style={{ display: "flex", gap: 20, marginTop: 16, justifyContent: "center" }}>
                      {[{ l: "Disponible", c: C.success }, { l: "Ocupado", c: C.danger }, { l: "Mantenimiento", c: C.warning }].map(({ l, c }) => (
                        <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textMuted }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: `${c}30`, border: `1px solid ${c}` }} />{l}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ width: 300, borderRadius: 16, background: C.cardDark, padding: 24, border: `1px solid ${C.glassBorder}`, display: "flex", flexDirection: "column" }}>
                    {selectedArea ? (
                      <>
                        <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{selectedArea.name}</h3>
                        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Piso {selectedArea.floor}</p>
                        <StatusBadge status={bdEspacios.find(e => e.codigo === selectedArea.id)?.estado_espacio || 'available'} />
                        <div style={{ margin: "20px 0", height: 1, background: "rgba(255,255,255,0.1)" }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 13, color: C.textMuted }}>Tipo</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedArea.type}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 13, color: C.textMuted }}>Capacidad</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedArea.capacity} personas</span>
                          </div>
                        </div>
                        <div style={{ flex: 1 }} />
                        {(bdEspacios.find(e => e.codigo === selectedArea.id)?.estado_espacio || 'disponible') === "disponible" ? (
                          <BtnPrimary onClick={() => setReserveModal(selectedArea)} style={{ width: "100%", marginTop: 20 }}>Seleccionar</BtnPrimary>
                        ) : (
                          <BtnSecondary style={{ width: "100%", marginTop: 20, opacity: 0.5, cursor: "not-allowed" }}>No disponible</BtnSecondary>
                        )}
                        <button onClick={() => setSelectedArea(null)} style={{ marginTop: 10, background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Volver</button>
                      </>
                    ) : (
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: C.textMuted }}>
                        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>{Icons.map}</div>
                        <p style={{ fontSize: 14 }}>Selecciona un área del mapa para ver sus detalles</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* MODAL DE RESERVA */}
                {reserveModal && (
                  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={cerrarModalYLimpiar}>
                    <div onClick={e => e.stopPropagation()} style={{ background: C.cardDark, borderRadius: 20, padding: 36, width: 480, border: `1px solid ${C.glassBorder}`, animation: "fadeUp 0.3s ease" }}>
                      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Reservar Espacio</h2>
                      <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24 }}>{reserveModal.name} — {reserveModal.type}</p>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                           <span style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, fontWeight: 600 }}>Usuario</span>
                           <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: `1px solid ${C.glassBorder}`, color: C.textMuted, fontSize: 14 }}>
                             {userProfile.nombre} {userProfile.primer_apellido}
                           </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                           <span style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, fontWeight: 600 }}>Capacidad Máxima</span>
                           <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: `1px solid ${C.glassBorder}`, color: C.textMuted, fontSize: 14 }}>
                             {bdEspacios.find(e => e.codigo === reserveModal.id)?.capacidad || reserveModal.capacity} Personas
                           </div>
                        </div>
                      </div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, marginBottom: 14 }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                           <span style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, fontWeight: 600 }}>Número de asistentes (Tú incluido)</span>
                           <input type="number" min="1" max={bdEspacios.find(e => e.codigo === reserveModal.id)?.capacidad || reserveModal.capacity} value={formReserva.asistentes} onChange={(e) => setFormReserva({...formReserva, asistentes: e.target.value})} style={{ padding: "10px 14px", background: "rgba(0,0,0,0.3)", borderRadius: 8, border: `1px solid ${C.glassBorder}`, color: "#fff", fontSize: 14, outline: "none" }} />
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                           <span style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, fontWeight: 600 }}>Fecha</span>
                           <input type="date" value={formReserva.fecha_reserva} onChange={(e) => setFormReserva({...formReserva, fecha_reserva: e.target.value})} style={{ padding: "10px 14px", background: "rgba(0,0,0,0.3)", borderRadius: 8, border: `1px solid ${C.glassBorder}`, color: "#fff", fontSize: 14, outline: "none", colorScheme: "dark" }} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                             <span style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, fontWeight: 600 }}>Hora Inicio</span>
                             <input type="time" value={formReserva.hora_inicio} onChange={(e) => setFormReserva({...formReserva, hora_inicio: e.target.value})} style={{ padding: "10px 14px", background: "rgba(0,0,0,0.3)", borderRadius: 8, border: `1px solid ${C.glassBorder}`, color: "#fff", fontSize: 14, outline: "none", colorScheme: "dark" }} />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                             <span style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, fontWeight: 600 }}>Hora Fin</span>
                             <input type="time" value={formReserva.hora_fin} onChange={(e) => setFormReserva({...formReserva, hora_fin: e.target.value})} style={{ padding: "10px 14px", background: "rgba(0,0,0,0.3)", borderRadius: 8, border: `1px solid ${C.glassBorder}`, color: "#fff", fontSize: 14, outline: "none", colorScheme: "dark" }} />
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", gap: 12 }}>
                        <BtnPrimary onClick={() => {if(!isReserving) handleConfirmReserve() }} style={{ flex: 1, opacity: isReserving ? 0.7 : 1 }}>
                          {isReserving ? "Procesando..." : "Confirmar Reserva"}
                        </BtnPrimary>
                        <BtnSecondary onClick={cerrarModalYLimpiar} style={{ flex: 0 }}>Cancelar</BtnSecondary>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ IA RECOMENDACIONES ═══ */}
            {screen === "ai" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${C.purple1}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 30px ${C.purple1}40` }}>{Icons.brain}</div>
                  <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Recomendaciones IA</h1>
                    <p style={{ fontSize: 14, color: C.textMuted }}>Análisis inteligente de tu comportamiento de uso</p>
                  </div>
                </div>

                <div style={{ padding: 28, borderRadius: 16, marginBottom: 28, background: `linear-gradient(135deg, rgba(161,0,255,0.15), rgba(200,80,255,0.08))`, border: `1px solid ${C.glassBorder}`, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${C.purple1}30 0%, transparent 70%)` }} />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <PulseDot /><span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.pink }}>Motor de IA Activo</span>
                    </div>
                    <p style={{ fontSize: 15, lineHeight: 1.7, color: C.text, maxWidth: 700, marginBottom: 20 }}>
                      El sistema analiza continuamente tu comportamiento de uso — horarios preferidos, tipos de espacios, patrones de equipo y niveles de ocupación — para generar recomendaciones inteligentes.
                    </p>
                    <div style={{ display: "flex", gap: 32 }}>
                      {[{ l: "Sesiones analizadas", v: "247" }, { l: "Precisión del modelo", v: "91%" }, { l: "Ahorro de tiempo", v: "3.2h/sem" }].map((m, i) => (
                        <div key={i}><div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: C.purpleLight }}>{m.v}</div><div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.l}</div></div>
                      ))}
                    </div>
                  </div>
                </div>

                <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Insights de Comportamiento</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
                  {[
                    { title: "Horario Preferido", ins: "Reservaciones entre 9:00-11:00 AM", det: "78% de reuniones matutinas", icon: Icons.clock, acc: C.purple1 },
                    { title: "Espacios Favoritos", ins: "Salas de 8-12 personas en pisos altos", det: "Piso 3 y 5 más frecuentes", icon: Icons.pin, acc: C.pink },
                    { title: "Patrón de Equipo", ins: "3 equipos recurrentes por semana", det: "12 personas frecuentes", icon: Icons.users, acc: C.purpleLight },
                  ].map((it, i) => (
                    <div key={i} style={{ padding: 24, borderRadius: 14, background: C.glass, border: `1px solid ${C.glassBorder}`, animation: animateIn ? `fadeUp 0.4s ${i * 0.1}s ease both` : "none" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${it.acc}20`, display: "flex", alignItems: "center", justifyContent: "center", color: it.acc, marginBottom: 14 }}>{it.icon}</div>
                      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{it.title}</h3>
                      <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>{it.ins}</p>
                      <p style={{ fontSize: 12, color: C.textMuted }}>{it.det}</p>
                    </div>
                  ))}
                </div>

                <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Recomendaciones Personalizadas</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {aiRecommendations.map((rec, i) => {
                    const isExp = expandedRec === rec.id;
                    const tMap = { pattern: { i: Icons.trendUp, c: C.purple1 }, optimization: { i: Icons.sparkle, c: C.success }, team: { i: Icons.users, c: C.blue }, alert: { i: Icons.alert, c: C.warning } };
                    const ti = tMap[rec.type] || tMap.pattern;
                    return (
                      <div key={rec.id} onClick={() => setExpandedRec(isExp ? null : rec.id)} style={{ padding: 20, borderRadius: 14, cursor: "pointer", background: isExp ? `linear-gradient(135deg, rgba(161,0,255,0.12), rgba(161,0,255,0.04))` : C.glass, border: `1px solid ${isExp ? C.purple1 + "40" : C.glassBorder}`, transition: "all 0.3s", animation: animateIn ? `slideIn 0.4s ${i * 0.08}s ease both` : "none" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `${ti.c}20`, display: "flex", alignItems: "center", justifyContent: "center", color: ti.c }}>{ti.i}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <h3 style={{ fontSize: 15, fontWeight: 700 }}>{rec.title}</h3>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 120 }}><ConfidenceMeter value={rec.confidence} /></div>
                                <span style={{ transform: isExp ? "rotate(90deg)" : "none", transition: "transform 0.3s", display: "inline-flex", color: C.textMuted }}>{Icons.chevron}</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, marginBottom: isExp ? 14 : 0 }}>
                              {rec.tags.map((tag, ti) => <span key={ti} style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "rgba(161,0,255,0.12)", color: C.pink }}>{tag}</span>)}
                            </div>
                            {isExp && (
                              <div style={{ animation: "fadeUp 0.3s ease" }}>
                                <p style={{ fontSize: 13, lineHeight: 1.7, color: C.textMuted, marginBottom: 16 }}>{rec.reason}</p>
                                <div style={{ display: "flex", gap: 10 }}>
                                  <BtnPrimary style={{ padding: "10px 24px" }}>Reservar ahora</BtnPrimary>
                                  <BtnSecondary style={{ padding: "10px 24px" }}>Ignorar</BtnSecondary>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══ GAMIFICACIÓN ═══ */}
            {screen === "gamification" && (
              <div>
                <div style={{ marginBottom: 28 }}>
                  <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Gamificación</h1>
                  <p style={{ fontSize: 14, color: C.textMuted }}>Gana puntos, desbloquea logros y compite con tus compañeros</p>
                </div>

                {/* Player Card */}
                <div style={{ padding: 28, borderRadius: 16, background: `linear-gradient(135deg, rgba(161,0,255,0.2), rgba(200,80,255,0.08))`, border: `1px solid ${C.glassBorder}`, marginBottom: 28, display: "flex", alignItems: "center", gap: 28 }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.purple1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, boxShadow: `0 0 30px ${C.purple1}50`, border: "3px solid rgba(255,255,255,0.2)" }}>{userProfile.nombre[0]}{userProfile.primer_apellido[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                      <h2 style={{ fontSize: 22, fontWeight: 800 }}>MariaGtz23</h2>
                      <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${C.purple1}30`, color: C.purpleLight }}>Nivel {gamificationData.level}</span>
                    </div>
                    <p style={{ fontSize: 14, color: C.purpleLight, fontWeight: 600, marginBottom: 12 }}>{gamificationData.rank}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <XPBar current={gamificationData.xp} max={gamificationData.nextLevelXp} />
                      <span style={{ fontSize: 12, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>{gamificationData.xp}/{gamificationData.nextLevelXp} XP</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 24 }}>
                    {[
                      { l: "Racha", v: `${gamificationData.streak} días`, icon: Icons.fire, c: "#FF6B35" },
                      { l: "Reservaciones", v: gamificationData.totalReservations, icon: Icons.calendar, c: C.purple1 },
                      { l: "Puntualidad", v: `${gamificationData.punctuality}%`, icon: Icons.clock, c: C.success },
                    ].map((s, i) => (
                      <div key={i} style={{ textAlign: "center" }}>
                        <div style={{ color: s.c, display: "flex", justifyContent: "center", marginBottom: 4 }}>{s.icon}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{s.v}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: 24, borderRadius: 14, background: C.glass, border: `1px solid ${C.glassBorder}`, marginBottom: 28, animation: "glow 3s ease infinite" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>🎯</span>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 700 }}>Desafío Semanal</h3>
                        <p style={{ fontSize: 13, color: C.textMuted }}>{gamificationData.weeklyChallenge.title}</p>
                      </div>
                    </div>
                    <span style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: `${C.warning}20`, color: C.warning }}>+{gamificationData.weeklyChallenge.reward} XP</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <XPBar current={gamificationData.weeklyChallenge.progress} max={gamificationData.weeklyChallenge.target} height={10} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{gamificationData.weeklyChallenge.progress}/{gamificationData.weeklyChallenge.target}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Logros</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                      {gamificationData.badges.map((b, i) => (
                        <div key={b.id} style={{
                          padding: 16, borderRadius: 14, textAlign: "center",
                          background: b.earned ? C.glass : "rgba(255,255,255,0.02)",
                          border: `1px solid ${b.earned ? C.glassBorder : "rgba(255,255,255,0.05)"}`,
                          opacity: b.earned ? 1 : 0.4,
                          animation: animateIn ? `fadeUp 0.3s ${i * 0.05}s ease both` : "none",
                          transition: "transform 0.2s",
                        }}>
                          <div style={{ fontSize: 30, marginBottom: 8, filter: b.earned ? "none" : "grayscale(1)" }}>{b.icon}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{b.name}</div>
                          <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.4 }}>{b.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Tabla de Líderes</h2>
                    <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.glassBorder}`, background: C.glass }}>
                      {gamificationData.leaderboard.map((p, i) => (
                        <div key={p.rank} style={{
                          display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
                          borderBottom: i < gamificationData.leaderboard.length - 1 ? `1px solid rgba(161,0,255,0.08)` : "none",
                          background: p.isUser ? "rgba(161,0,255,0.12)" : "transparent",
                          animation: animateIn ? `slideIn 0.3s ${i * 0.08}s ease both` : "none",
                        }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                            background: p.rank === 1 ? "linear-gradient(135deg, #FFD700, #FFA500)" : p.rank === 2 ? "linear-gradient(135deg, #C0C0C0, #A0A0A0)" : p.rank === 3 ? "linear-gradient(135deg, #CD7F32, #B87333)" : "rgba(255,255,255,0.08)",
                            color: p.rank <= 3 ? "#000" : C.textMuted,
                          }}>{p.rank}</span>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: p.isUser ? C.purple1 : "rgba(161,0,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, border: p.isUser ? "2px solid rgba(255,255,255,0.3)" : "none" }}>{p.avatar}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: p.isUser ? 800 : 600 }}>{p.name}{p.isUser && <span style={{ fontSize: 11, color: C.purpleLight, marginLeft: 8 }}>(Tú)</span>}</div>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: C.purpleLight }}>{p.xp.toLocaleString()} XP</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* 🟢 ALERTAS FLOTANTES CORRECTAS */}
      {floatAlert && (
        <div style={{
          position: "fixed",
          bottom: 40,
          right: 40,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 24px",
          borderRadius: 16,
          background: C.cardDark,
          border: `1px solid ${floatAlert.type === "error" ? C.danger : C.success}`,
          boxShadow: `0 10px 40px ${floatAlert.type === "error" ? C.danger : C.success}40`,
          color: C.white,
          fontSize: 14,
          fontWeight: 600,
          animation: "fadeUp 0.3s ease forwards",
        }}>
          <span style={{ fontSize: 20 }}>
            {floatAlert.type === "error" ? "⚠️" : "✅"}
          </span>
          <span>{floatAlert.message}</span>
        </div>
      )}
    </div>
  );
}