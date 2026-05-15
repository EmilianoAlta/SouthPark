# Futuro — Mejoras y Features Pendientes

Documento vivo con ideas priorizadas para próximos sprints.

---

## 1. Mapa y Visualización

- [ ] **Rediseñar planos de piso** con los colores de Accenture (#A100FF, #C850FF, #38193A) en vez de los PNGs arquitectónicos actuales — hacerlo más limpio y brandado.
- [ ] **Paleta de colores de selección** — evaluar si los colores de las áreas seleccionadas (verde/rojo/amarillo) se alinean con la identidad visual o conviene usar tonos morados con indicadores de estado.
- [ ] **Animaciones en el mapa** — transiciones suaves al cambiar de piso, pulse en áreas con actividad, efecto hover más rico.
- [ ] **Mini-mapa o zoom** — para pisos con muchas áreas, permitir hacer zoom y pan en el SVG.
- [ ] **Indicador de ocupación parcial** — no solo verde/rojo, sino un gradiente o barra que muestre "3/6 lugares ocupados" visualmente dentro del área.

## 2. Sistema Social y Colaborativo

- [ ] **Invitar usuarios a reservas** — al crear una reserva, poder buscar y añadir compañeros por nombre o correo. Tabla `ReservaInvitado` (id_reserva, id_usuario, estado_invitacion).
- [ ] **Ver participantes de una reserva** — en el detalle de la reserva mostrar quiénes están incluidos con avatar/iniciales.
- [ ] **Invitaciones con aceptar/rechazar** — cuando alguien te invita a una reserva, recibir la invitación y poder aceptar o declinar. Estados: pendiente → aceptada/rechazada.
- [ ] **Feed de actividad** — sección donde veas "Juan reservó Sala A", "Te invitaron a Sala B", etc.
- [ ] **Reservas de equipo** — permitir crear grupos/equipos y reservar para todo el equipo de un click.
- [ ] **Comentarios en reservas** — notas como "Traer proyector" o "Llegar 5 min antes" visibles para todos los invitados.

## 3. Notificaciones

- [ ] **Centro de notificaciones in-app** — campana en el header con badge de conteo, dropdown con lista de notificaciones.
- [ ] **Tipos de notificación**: invitación a reserva, reserva próxima (15 min antes), cambio de estado, cancelación, recordatorio de check-in.
- [ ] **Notificaciones por email** — opcional, usando Supabase Edge Functions o un servicio externo.
- [ ] **Push notifications** — si se convierte en PWA, notificaciones del navegador.
- [ ] **Preferencias de notificación** — que cada usuario elija qué quiere recibir.

## 4. Check-in / Check-out Mejorado

- [ ] **Auto-liberación** — si no haces check-in en X minutos después de la hora de inicio, la reserva se cancela automáticamente y el espacio se libera.
- [ ] **Check-in por geolocalización** — validar que estés en la oficina para hacer check-in (opcional).
- [ ] **Dashboard de ocupación real vs reservada** — métricas de cuántas reservas realmente se usaron.

## 5. IA y Recomendaciones

- [ ] **Recomendaciones proactivas** — al abrir la app, sugerir "¿Reservar tu espacio habitual para hoy?".
- [ ] **Detección de conflictos** — alertar si reservas algo que se solapa con otra reunión tuya.
- [ ] **Análisis de uso por equipo** — insights para managers sobre qué espacios usa más su equipo.
- [ ] **Sugerencia de horarios óptimos** — "Este espacio está menos saturado los martes a las 10:00".
- [ ] **Chatbot** — asistente conversacional para reservar: "Necesito una sala para 5 personas mañana a las 3".

## 6. Gamificación

- [ ] **Sistema de puntos real** — XP por reservar, hacer check-in a tiempo, invitar compañeros.
- [ ] **Badges/Logros** — "Primera reserva", "10 reservas", "Explorador" (usó 5 espacios diferentes), "Puntual" (5 check-ins a tiempo).
- [ ] **Leaderboard** — ranking semanal/mensual de usuarios más activos.
- [ ] **Rachas** — días consecutivos reservando/usando espacios.
- [ ] **Nivel de usuario** — que suba de nivel y desbloquee beneficios (prioridad en espacios populares).

## 7. Admin y Gestión

- [ ] **Dashboard de analytics para admin** — ocupación por piso, horarios pico, espacios más/menos usados, tasa de no-show.
- [ ] **Gestión de mantenimiento** — programar mantenimiento con fechas, notificar a usuarios afectados.
- [ ] **Configuración de horarios** — definir horarios de operación por piso/edificio.
- [ ] **Reportes exportables** — CSV/PDF con datos de uso para presentar a gerencia.
- [ ] **Gestión de usuarios** — activar/desactivar, cambiar roles, ver actividad.

## 8. UX y Calidad de Vida

- [ ] **Reservas recurrentes** — "Todos los lunes de 9-11 en Sala A" con un solo click.
- [ ] **Favoritos** — marcar espacios como favoritos para acceso rápido.
- [ ] **Búsqueda de espacios** — filtrar por tipo, capacidad, piso, disponibilidad en un rango de horas.
- [ ] **Vista semanal** — ver toda tu semana de reservas de un vistazo (tipo Google Calendar).
- [ ] **Dark/Light mode** — actualmente solo dark, ofrecer tema claro.
- [ ] **PWA** — hacer la app instalable en móvil con experiencia nativa.
- [ ] **Responsive mejorado** — optimizar para tablet y móvil.
- [ ] **Accesibilidad (a11y)** — roles ARIA, navegación por teclado, contraste.

## 9. Técnico / Deuda

- [ ] **Mover a TypeScript** — tipado estático para prevenir bugs.
- [ ] **Tests** — unit tests para lógica de disponibilidad, integración para flujo de reserva.
- [ ] **CI/CD** — pipeline de build + deploy automático.
- [ ] **Migraciones de DB** — versionar el esquema en el repo en vez de SQL sueltos.
- [ ] **Quitar fallbacks hardcoded** — limpiar datos mock de constants.js.
- [ ] **Code splitting** — el bundle principal es >1MB, dividirlo con lazy imports.
- [ ] **Rate limiting** — proteger endpoints de abuso.

---

> Prioridad sugerida: **Social (invitaciones) + Notificaciones** → **Mapa brandado** → **Gamificación real** → **Admin analytics**
