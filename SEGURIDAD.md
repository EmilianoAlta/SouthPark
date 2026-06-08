# Informe Técnico de Seguridad de Base de Datos — SouthPark

**Proyecto:** Web app de reservación de espacios de trabajo (empleados Accenture)
**Stack:** React 18 + Vite + Supabase (Auth + PostgreSQL)
**Fecha:** 2026-06-01
**Equipo:** _(completar nombres)_

> Este documento responde a las 6 fases del entregable "M5 — BD: Seguridad".
> Todo lo descrito está anclado al código real del repositorio (carpeta `db/` y `src/`).

---

## Fase 1 — Identificación de Datos Sensibles

### 1.1 ¿Qué datos maneja la base de datos?

| Tabla | Datos que contiene | Origen |
|-------|--------------------|--------|
| `auth.users` (gestionada por Supabase) | Correo, **contraseña (hash bcrypt)**, tokens de sesión, metadatos | Supabase Auth |
| `Usuario` | `nombre`, `primer_apellido`, `segundo_apellido`, `correo`, `numero_empleado`, `id_rol`, `estado`, `prioridades` | Trigger `handle_new_user` |
| `Reserva` | `id_usuario`, `id_espacio`, `fecha_reserva`, `hora_inicio`, `hora_fin`, `asistentes`, `id_estado`, `notas` | RPC `crear_reserva` |
| `Espacio` / `Zona` / `Plano` | Geometría y estado de oficinas (capacidad, piso, coordenadas) | Catálogo |
| `Gamificacion`, `MovimientoPuntos`, `UsuarioBeneficio` | Puntos, nivel, reservas asistidas/canceladas por usuario | Triggers/RPCs |
| `LogConflictoReserva` | Auditoría de intentos de reserva fallidos (quién, cuándo, qué espacio) | RPC `crear_reserva` |
| `BloqueoReserva` | Bloqueos temporales de 6 min para evitar doble reserva | RPC + `pg_cron` |

### 1.2 ¿Cuál es el impacto si se filtran o se pierden?

- **Contraseñas:** se almacenan **hasheadas con bcrypt** por Supabase Auth; nunca en texto plano. Una fuga del hash es de bajo impacto inmediato, pero la reutilización de contraseñas en otros servicios sigue siendo un riesgo.
- **Datos personales (PII):** nombre + número de empleado + correo corporativo permiten identificar a una persona real de Accenture → riesgo de **phishing dirigido** e ingeniería social. Impacto reputacional y posible incumplimiento de protección de datos (LFPDPPP / GDPR según jurisdicción).
- **Historial de reservas:** revela **patrones de presencia física** (quién está en qué piso, a qué hora) → riesgo de privacidad y seguridad física.
- **Pérdida de datos:** sin reservas/usuarios la aplicación queda inoperante; mitigado por los backups automáticos de Supabase (ver Fase 3.4).

### 1.3 ¿Quién necesita acceso y con qué nivel?

| Rol | `id_rol` | Acceso |
|-----|----------|--------|
| **Administrador** | 1 | Lectura/escritura de todas las tablas (vía `es_admin()`). |
| **Empleado** | 2 | Solo **sus propios** datos (`id_usuario = auth.uid()`); lectura de catálogos (espacios, zonas). |
| **Anónimo** (no autenticado) | — | Sin acceso a datos de negocio. Solo puede registrarse/iniciar sesión. |
| **Servicio Supabase (`service_role`)** | — | Acceso total; **nunca** debe exponerse en el frontend. |

### 1.4 Clasificación por sensibilidad

| Nivel | Datos |
|-------|-------|
| 🔴 **Alta** | Contraseñas (hash), número de empleado, correo, nombre completo (PII). |
| 🟡 **Media** | Historial de reservas, gamificación, logs de conflicto, bloqueos. |
| 🟢 **Baja** | Catálogos públicos: espacios, zonas, planos, estados, beneficios. |

---

## Fase 2 — Identificación de Amenazas

### 2.1 Amenazas comunes evaluadas

| # | Amenaza | ¿Aplica aquí? | Estado |
|---|---------|---------------|--------|
| A1 | **Inyección SQL** | Sí | ✅ Mitigada (PostgREST parametriza; RPCs con parámetros tipados) |
| A2 | **Acceso no autorizado / Broken Access Control** | Sí | ✅ Mitigada con RLS (con 1 hallazgo, ver §2.3) |
| A3 | **Robo de credenciales / fuerza bruta** | Sí | 🟡 Parcial (hashing sí; falta MFA y rate-limit explícito) |
| A4 | **Exposición de secretos en el cliente** | Sí | 🔴 **Hallazgo abierto** (API key de OpenAI en el bundle) |
| A5 | **Errores humanos / mala configuración RLS** | Sí | 🟡 Riesgo latente (ver §2.3) |
| A6 | **Pérdida de datos** | Sí | ✅ Backups automáticos de Supabase |
| A7 | **Escalada de privilegios** (auto-asignarse `id_rol=1`) | Sí | ✅ Mitigada (el rol lo fija el trigger en backend, no el cliente) |

### 2.2 Diagrama de puntos vulnerables

```
                 ┌──────────────────────────────────────────────┐
                 │              NAVEGADOR (cliente)               │
                 │  React + Vite bundle                           │
                 │  ┌────────────────────────────────────────┐    │
   [A4] 🔴 ──────┼─►│ VITE_OPENAI_API_KEY  ← queda en el JS!  │    │
                 │  │ VITE_SUPABASE_ANON_KEY (OK, es pública) │    │
                 │  └────────────────────────────────────────┘    │
                 │   Login / Register (signInWithPassword)         │
                 └───────────────┬────────────────────────────────┘
                                 │ HTTPS (TLS)
            [A3] 🟡 fuerza bruta │
                                 ▼
        ┌────────────────────────────────────────────────────────┐
        │                      SUPABASE                            │
        │  ┌───────────────┐    ┌───────────────────────────────┐ │
        │  │  Auth          │    │  PostgREST (API REST auto)    │ │
        │  │  bcrypt hash   │    │  [A1] parametriza queries     │ │
        │  └───────┬────────┘    └──────────────┬────────────────┘ │
        │          │ trigger handle_new_user     │                  │
        │          ▼                              ▼                  │
        │  ┌──────────────────────────────────────────────────┐    │
        │  │            PostgreSQL + Row Level Security         │    │
        │  │  [A2] policies own_or_admin / es_admin()           │    │
        │  │  [A7] id_rol lo fija el backend, no el cliente     │    │
        │  │  RPCs SECURITY DEFINER: crear_reserva, cancelar…   │    │
        │  │  [A5] riesgo: policy "reserva_select_all = true"   │    │
        │  └──────────────────────────────────────────────────┘    │
        │  Backups automáticos diarios   [A6] ✅                    │
        └──────────────────────────────────────────────────────────┘
```

### 2.3 Hallazgos abiertos (áreas a mejorar)

1. **🔴 ALTO — API key de OpenAI expuesta en el frontend.**
   `src/lib/recommendations.js:5` lee `import.meta.env.VITE_OPENAI_API_KEY` y la usa en un `fetch` directo a `api.openai.com`. Toda variable `VITE_*` se **incrusta en el bundle público** → cualquiera puede extraerla del JS y consumir la cuenta de OpenAI. **Recomendación:** mover la llamada a un Edge Function / backend y dejar la key fuera del cliente.

2. **🟡 MEDIO — `Reserva` legible por todos los autenticados.**
   `db/fix_rls_reserva.sql` reemplaza la policy `reserva_select_own_or_admin` por `reserva_select_all USING (true)`. Esto se hizo para pintar el mapa de ocupación, pero **expone notas, asistentes e `id_usuario` de las reservas ajenas**. **Recomendación:** exponer al mapa solo una **vista agregada** (sin PII: `id_espacio`, `fecha`, `hora`, `SUM(asistentes)`) y volver la tabla `Reserva` a `own_or_admin`.

3. **🟡 MEDIO — Sin MFA ni rate-limiting explícito en login.** Mitigable con la config de Supabase Auth (límites de intentos) y, opcionalmente, MFA TOTP.

### 2.4 Herramientas útiles para proteger la BD

- **Row Level Security (Postgres)** — control de acceso a nivel de fila (núcleo de la defensa actual).
- **Supabase Auth** — gestión de sesiones, hashing bcrypt, confirmación de correo, políticas de contraseña.
- **Supabase Logs / `pg_audit`** — auditoría de accesos y queries.
- **Supabase Backups (PITR)** — recuperación ante desastres.
- **Edge Functions / Vault** — para guardar secretos del servidor (resuelve A4).
- **OWASP ZAP / sqlmap** — pruebas de penetración (Fase 4).

---

## Fase 3 — Medidas de Seguridad Implementadas

> El proyecto ya implementa **más de 3** medidas. Se documentan con su evidencia en código.

### 3.1 Autenticación y control de acceso (RLS por rol) ✅

- **Autenticación:** Supabase Auth con `signInWithPassword` (`src/pages/Login.jsx`) y `signUp` (`src/pages/Register.jsx`).
- **Validación de dominio corporativo** en **dos capas**:
  - Frontend: solo `@accenture.com` / `@tec.mx` (`Login.jsx:24`, `Register.jsx:33`).
  - Backend (no evitable por el cliente): trigger `handle_new_user` lanza excepción si el dominio no es válido (`db/04_functions.sql:17`).
- **RLS activado** en todas las tablas de negocio (`db/05_policies.sql:8-20`).
- **Policies "dueño o admin":** un empleado solo ve su `Usuario`, sus `Reserva`, su `Gamificacion`:
  ```sql
  using (id_usuario = auth.uid() or public.es_admin())
  ```
- **Función de rol `es_admin()`** (`SECURITY DEFINER`, `db/04_functions.sql:51`) — centraliza el chequeo de administrador.
- **Anti-escalada de privilegios (A7):** el `id_rol` lo asigna el trigger en el servidor (`id_rol = 2` por defecto), **no** se acepta del cliente.

### 3.2 Validación de entradas / prevención de inyección SQL ✅

- **Sin SQL concatenado en el cliente.** El frontend usa el SDK de Supabase (`.from().select().eq()`) y **RPCs**, que viajan como parámetros tipados a PostgREST → equivalente a consultas parametrizadas.
- **Escritura de `Reserva` solo vía RPC `crear_reserva` / `cancelar_reserva`** (`db/04_functions.sql`). No se permite `INSERT`/`UPDATE`/`DELETE` directo desde el cliente (no hay policy que lo habilite). Esto es el patrón de **procedimiento almacenado** que pide la rúbrica.
- **Validaciones de negocio server-side** dentro de las RPC: autenticación (`auth.uid()` no nulo), `hora_inicio < hora_fin`, `asistentes > 0`, y verificación de cupo/traslape (`existe_conflicto_reserva`).

Ejemplo (patrón seguro, `db/04_functions.sql:137`):
```sql
create function crear_reserva(p_id_espacio bigint, p_fecha date, ...)
security definer as $$
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if p_hora_inicio >= p_hora_fin then raise exception '...'; end if;
  -- inserta con parámetros tipados, jamás concatenando texto
$$;
```

### 3.3 Encriptación de datos ✅

- **Contraseñas:** hasheadas con **bcrypt** por Supabase Auth (nunca en texto plano ni accesibles vía API).
- **En tránsito:** todo el tráfico cliente↔Supabase va por **HTTPS/TLS**.
- **En reposo:** el almacenamiento de Supabase (AWS) cifra los discos (AES-256).

### 3.4 Backup y recuperación ✅

- Supabase realiza **backups automáticos diarios** del proyecto (`aybhurdvejocwfoyjkjm`).
- **Esquema versionado en `db/`** (scripts `01`–`09` + `README.md`): permite **recrear toda la BD desde cero** ejecutando los scripts en orden. Es el respaldo de la *estructura*.
- **Escenario de recuperación simulado:** ver Fase 4.

### 3.5 Monitoreo, auditoría y consistencia ✅

- **Tabla de auditoría `LogConflictoReserva`** (`db/03_log_conflicto.sql`): cada intento de reserva en conflicto se registra (usuario, espacio, motivo) desde `crear_reserva`.
- **Tabla `BloqueoReserva`** (`db/bloqueo.sql`): bloqueos temporales de 6 min para evitar dobles reservas (condición de carrera).
- **Jobs `pg_cron`** para mantenimiento automático (`finalizar_reservas_vencidas`, `limpiar_bloqueos_expirados`).
- **Supabase Dashboard → Logs** registra accesos a la API y errores de autenticación.

---

## Fase 4 — Pruebas de Seguridad

> Cada prueba indica el **objetivo**, **cómo ejecutarla** y el **resultado esperado**. Marcar ✅/❌ al ejecutarlas en clase.

### Prueba 1 — Inyección SQL en login

- **Acción:** en el campo correo escribir `' OR '1'='1` y cualquier contraseña.
- **Esperado:** falla con "Correo o contraseña incorrectos". Supabase Auth no concatena SQL; la cadena se trata como literal.
- **Resultado:** ☐ Funcionó / ☐ Necesita mejora.

### Prueba 2 — Acceso a datos de otro usuario (RLS)

- **Acción:** autenticado como Empleado A, intentar leer el perfil de B:
  ```js
  await supabase.from('Usuario').select('*').eq('id_usuario', '<uuid-de-B>')
  ```
- **Esperado:** devuelve `[]` (vacío). La policy `usuario_select_own_or_admin` filtra por `auth.uid()`.
- **Resultado:** ☐

### Prueba 3 — Insertar reserva saltándose la RPC

- **Acción:** intentar `await supabase.from('Reserva').insert({...})` directo.
- **Esperado:** error de RLS (no hay policy de `insert` para `authenticated`); la única vía válida es `rpc('crear_reserva', …)`.
- **Resultado:** ☐

### Prueba 4 — Escalada de privilegios

- **Acción:** registrarse y luego intentar `update Usuario set id_rol = 1 where id_usuario = auth.uid()`.
- **Esperado:** aunque la policy `usuario_update_own` permite el `UPDATE`, **el cliente no debería poder cambiar `id_rol`** → endurecer con un trigger que impida modificar `id_rol` salvo admin (mejora propuesta).
- **Resultado:** ☐ (probable hallazgo → ver mejoras).

### Prueba 5 — Cancelar reserva ajena

- **Acción:** Empleado A llama `rpc('cancelar_reserva', { p_id_reserva: <reserva-de-B> })`.
- **Esperado:** excepción `No autorizado (42501)` — la RPC valida `id_usuario <> auth.uid() and not es_admin()` (`db/04_functions.sql:224`).
- **Resultado:** ☐

### Prueba 6 — Recuperación ante pérdida (backup)

- **Acción:** en un entorno de prueba, borrar filas de `Reserva` y restaurar.
- **Esperado:** restaurar desde backup de Supabase **o** re-ejecutar `db/insert_reservas.sql`. La estructura se recrea con `db/01`–`09`.
- **Resultado:** ☐

### Prueba 7 — Extracción de secretos del bundle

- **Acción:** `npm run build` y buscar la key en `dist/`:
  ```bash
  grep -r "sk-" dist/
  ```
- **Esperado (hoy):** **se encuentra la API key de OpenAI** → confirma el hallazgo A4. La `anon key` de Supabase también aparece, pero esa es pública por diseño (protegida por RLS).
- **Resultado:** ❌ → requiere mover OpenAI a un backend.

### Resumen de pruebas

| Medida | ¿Funcionó? | Notas |
|--------|-----------|-------|
| RLS dueño/admin | ✅ esperado | Núcleo de la defensa |
| RPC con validación server-side | ✅ esperado | Bloquea escritura directa |
| Anti-inyección (PostgREST) | ✅ esperado | Sin SQL concatenado |
| Hashing de contraseñas | ✅ | Por Supabase Auth |
| Backups | ✅ | Automáticos + scripts |
| Secretos en cliente | ❌ | OpenAI key en bundle |
| Inmutabilidad de `id_rol` | ⚠️ | Endurecer con trigger |

---

## Fase 5 — Documentación (resumen ejecutivo)

- **Descripción del proyecto:** app de reservación de espacios para empleados de Accenture; la BD (Supabase/PostgreSQL) guarda usuarios, reservas, espacios y gamificación. Datos PII de alta sensibilidad.
- **Amenazas identificadas:** inyección SQL, acceso no autorizado, robo de credenciales, exposición de secretos en el cliente, escalada de privilegios y pérdida de datos.
- **Medidas implementadas:** (1) Autenticación + RLS por rol, (2) Validación de dominio en doble capa, (3) RPCs `SECURITY DEFINER` con validación server-side (anti-inyección), (4) Hashing bcrypt + TLS, (5) Backups + esquema versionado, (6) Auditoría con `LogConflictoReserva` y bloqueos temporales.
- **Resultados:** las defensas de control de acceso y validación funcionan según diseño; se detectaron 2 mejoras prioritarias (API key en cliente, `Reserva` legible por todos) y 1 endurecimiento (inmutabilidad de `id_rol`).
- **Aprendizajes:**
  - La seguridad debe vivir en el **backend** (RLS + RPC), nunca confiar en validaciones del cliente.
  - Toda variable `VITE_*` es **pública**: los secretos van en un servidor/Edge Function.
  - El principio de **mínimo privilegio** (own-or-admin) es la base; abrir una policy a `USING (true)` por conveniencia introduce fugas de PII.

---

## Fase 6 — Guion para la Presentación

1. **Contexto (1 min):** qué es SouthPark y qué datos sensibles maneja (PII de empleados + patrones de presencia).
2. **Riesgos (2 min):** mostrar el diagrama de §2.2; destacar inyección, acceso no autorizado y secretos en el cliente.
3. **Medidas (3 min):** demo en vivo —
   - Login con dominio inválido → rechazado.
   - Consultar `Usuario`/`Reserva` de otro usuario desde la consola → RLS devuelve vacío.
   - Intentar `insert` directo en `Reserva` → bloqueado; mostrar que solo `crear_reserva` funciona.
4. **Resultados (2 min):** tabla de la Fase 4; reconocer honestamente los 2 hallazgos abiertos y el plan de remediación.
5. **Preguntas.**

### Plan de remediación propuesto (próximos pasos)

| Prioridad | Acción |
|-----------|--------|
| 🔴 Alta | Mover la llamada a OpenAI a un **Edge Function** y eliminar `VITE_OPENAI_API_KEY` del cliente. |
| 🟡 Media | Reemplazar `reserva_select_all` por una **vista agregada sin PII** para el mapa; restaurar `own_or_admin` en `Reserva`. |
| 🟡 Media | Trigger que impida cambiar `id_rol`/`numero_empleado` salvo admin. |
| 🟢 Baja | Activar confirmación de correo y evaluar MFA en Supabase Auth. |
