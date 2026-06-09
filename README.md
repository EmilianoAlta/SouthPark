# WorkHub MTY

Plataforma web para la **gestión de reservas de espacios de trabajo y estacionamiento**
de las oficinas de Accenture en Monterrey. Permite a los empleados consultar la
disponibilidad en tiempo real sobre planos arquitectónicos reales, reservar espacios y
cajones de estacionamiento, hacer check-in/check-out con QR, y a los administradores
gestionar espacios y consultar reportes de uso.

---

## Enlaces clave

| Recurso | Enlace |
|---------|--------|
| 🌐 Sistema desplegado | https://workhub-mty.vercel.app|
| 💻 Repositorio | https://github.com/EmilianoAlta/SouthPark |

> El registro está restringido a dominios `@accenture.com` (y `@tec.mx` habilitado para
> debug durante el desarrollo).

---

## Arquitectura

Aplicación **SPA (Single Page Application)** con backend **BaaS (Backend as a Service)**:

```
┌──────────────────────────────┐         ┌─────────────────────────────────────┐
│  Frontend — React 18 + Vite 5 │         │  Supabase (PostgreSQL gestionado)   │
│  ─ SPA, navegación state-based │  HTTPS  │  ─ Auth (JWT)                       │
│  ─ Estilos inline (tokens C)   │ ──────▶ │  ─ Row Level Security (RLS)         │
│  ─ @supabase/supabase-js       │         │  ─ RPCs / triggers / pg_cron        │
│  ─ Realtime (WebSocket)        │ ◀────── │  ─ Realtime (postgres_changes)      │
└──────────────────────────────┘         └─────────────────────────────────────┘
            │
            ▼
   Vercel (CDN global, build estático, HTTPS automático)
```

- **Frontend:** React 18 + Vite 5, sin TypeScript. Navegación basada en estado (sin
  `react-router`, salvo la ruta `/checkin` detectada manualmente). Estilos inline con
  tokens de color centralizados en `src/config/constants.js`.
- **Backend:** Supabase (PostgreSQL). La lógica de negocio crítica (validación de
  conflictos, creación/cancelación de reservas, check-in/out, liberación automática) vive
  en **RPCs y triggers** de la base de datos, no en el cliente.
- **Seguridad:** autenticación con JWT y **Row Level Security** por usuario/rol. Las
  escrituras sensibles pasan por RPCs validados server-side.
- **Despliegue:** build estático servido desde la CDN de Vercel. Arquitectura serverless
  (sin servidor propio). Despliegue **manual** con la CLI de Vercel; la gestión del
  trabajo se lleva en **Azure DevOps Boards**.

### Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React | 18.3.1 |
| Bundler | Vite | 5.4.x |
| Backend / DB | Supabase (PostgreSQL) | @supabase/supabase-js 2.103.x |
| Autenticación | Supabase Auth | JWT + RLS |
| Realtime | Supabase Realtime | WebSocket |
| Reportes / PDF | jsPDF + html2canvas-pro | — |
| Testing | Vitest + Testing Library | 4.1.x |
| Deployment | Vercel | CDN global |

---

## Módulos del sistema

| Módulo | Descripción | Archivos clave |
|--------|-------------|----------------|
| **Autenticación** | Registro con correo institucional, login/logout, sesión con Context API | `pages/Login.jsx`, `pages/Register.jsx`, `context/UserContext.jsx` |
| **Espacios** | Mapa SVG sobre planos reales por piso (PB, MZ, Piso 3, Piso 9), disponibilidad en vivo | `pages/Dashboard.jsx`, `components/FloorEditor.jsx` |
| **Reservas** | Creación con validación de conflictos server-side, mis reservas, cancelación | `pages/Dashboard.jsx`, `components/ReservationsView.jsx`, `lib/reserveErrors.js` |
| **Check-in / Check-out QR** | Página `/checkin` accesible por QR, ventana de gracia, libera el espacio | `pages/CheckinPage.jsx` |
| **Estacionamiento** | Reserva de cajones en hasta 7 niveles (Sótano 3 → Azotea T2) | `components/ParkingView.jsx`, `components/ParkingEditor.jsx` |
| **Gamificación** | XP, niveles, rachas, badges y leaderboard calculados desde reservas reales | `lib/gamification.js` |
| **Recomendaciones IA** | Motor sobre historial real del usuario (patrones de horario, piso, tipo) | `lib/recommendations.js` |
| **Admin Dashboard** | Reportes y métricas (ocupación, asistencias, cancelaciones, ranking de espacios) | `components/AdminDashboard.jsx` |
| **Presentación** | Slides de demo exportables a PDF | `components/PresentacionDemo.jsx` |

---

## Modelo de datos (Supabase)

Tablas principales: `Usuario`, `Espacio`, `Reserva`, `Zona`, `Plano`, `Rol`,
`Gamificacion`, `LogConflictoReserva`, y el módulo de estacionamiento
(`ZonaEstacionamiento`, `Cajon`, `ReservaEstacionamiento`).

El esquema completo (tablas, RPCs, triggers, políticas RLS, cron) está versionado en
[`db/`](./db) y documentado en [`db/README.md`](./db/README.md). Los scripts se aplican
**en orden numérico** (`01_…` → `09_…`) más `estacionamiento.sql`.

Catálogo de estados de reserva (`id_estado`): 1 Confirmada · 2 Activa · 3 Pendiente ·
4 Cancelada · 5 Finalizada.

---

## Uso del sistema

1. **Registro / Login** con un correo `@accenture.com`.
2. **Áreas disponibles:** elige un piso, haz clic en un área del plano para ver su detalle
   y reservar (fecha, hora, asistentes). El sistema valida conflictos y cupo en vivo.
3. **Estacionamiento:** elige un nivel, selecciona un cajón disponible y reserva.
4. **Mis reservas:** consulta, filtra por estado y cancela tus reservas.
5. **Check-in / Check-out:** escanea el QR (ruta `/checkin`) dentro de la ventana de
   tiempo para confirmar tu llegada y registrar tu salida.
6. **Gamificación e IA:** revisa tu progreso (XP, nivel, badges) y recomendaciones
   personalizadas.
7. **Administración** (rol admin): edita planos/cajones y consulta reportes de uso.

---

## Instalación y ejecución local

Requisitos: **Node.js 18+** y npm.

```bash
# 1. Clonar e instalar dependencias
git clone https://github.com/EmilianoAlta/SouthPark.git
cd SouthPark
npm install

# 2. Configurar variables de entorno
cp .env.example .env        # luego edita .env con tus valores

# 3. Levantar el servidor de desarrollo
npm run dev                 # http://localhost:5173
```

### Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL pública del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima (pública) de Supabase |
| `VITE_OPENAI_API_KEY` | (Opcional) Clave de OpenAI para recomendaciones IA con GPT-4o-mini |

> El archivo `.env` está ignorado por git. Nunca se commitea.

### Scripts disponibles

| Script | Acción |
|--------|--------|
| `npm run dev` | Servidor de desarrollo Vite (`http://localhost:5173`) |
| `npm run build` | Build de producción a `dist/` |
| `npm run preview` | Sirve el build de `dist/` localmente |
| `npm test` | Ejecuta la suite de pruebas (Vitest) |
| `npm run test:watch` | Pruebas en modo watch |

---

## Pruebas

Suite automatizada con **Vitest + @testing-library/react** (configuración en
`vite.config.js`, setup en `src/test/setup.js`). Actualmente **64 pruebas en 5 archivos**,
incluyendo una prueba **E2E** del flujo de reservas con backend simulado.

```bash
npm test
```

Los tests viven junto al código que prueban, en carpetas `__tests__/`:

| Archivo | Cubre |
|---------|-------|
| `src/lib/__tests__/gamification.test.js` | XP, niveles, rangos, rachas, badges, desafío semanal |
| `src/lib/__tests__/recommendations.test.js` | Motor de recomendaciones (horarios, franjas, moda, fallback) |
| `src/lib/__tests__/reserveErrors.test.js` | Mapeo de errores de reserva |
| `src/components/ui/__tests__/ConfirmModal.test.jsx` | Componente de confirmación |
| `src/components/__tests__/reservas.e2e.test.jsx` | **E2E**: flujo de cancelación de reserva (Supabase simulado) |

---

## Despliegue

El sistema se despliega manualmente sobre **Vercel**:

```bash
npm run build                 # verificar build local
vercel --prod                 # desplegar a producción
```

Vercel detecta Vite automáticamente, instala dependencias, ejecuta el build y distribuye
`dist/` a su CDN global con HTTPS automático. Las variables de entorno se configuran en
**Vercel → Settings → Environment Variables**.

> La gestión del proyecto (sprints, historias, tareas, capacity, burndown) se lleva en
> **Azure DevOps Boards**.

---

## Estructura del proyecto

```
SouthPark/
├── index.html
├── workspace-app.jsx          # Entry component (raíz, no en src/)
├── vite.config.js
├── README.md
├── db/                        # Scripts SQL de Supabase (fuente de verdad del esquema)
├── public/
│   ├── logo.png, logo-dark.png
│   └── floors/                # Planos PNG (pisos y niveles de estacionamiento)
└── src/
    ├── main.jsx               # Monta React (importa ../workspace-app.jsx)
    ├── supabaseClient.js
    ├── config/constants.js    # Tokens de color (C) y datos de apoyo
    ├── context/UserContext.jsx
    ├── lib/                   # gamification, recommendations, reserveErrors (+ __tests__)
    ├── pages/                 # Login, Register, Dashboard, CheckinPage
    └── components/            # ParkingView, AdminDashboard, ReservationsView, ui/ …
```

---

## Equipo

| Integrante | 
|-----------
| Emiliano Altamirano Báez | 
| Lucas Mateo Tapia Callisperis | 
| Rafael Cárdenas Meneses | 
| Emiliano Enríquez López |
| Sergio Rodríguez Pérez |
