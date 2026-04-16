# db/ — Scripts SQL de Supabase

Fuente de verdad del esquema. Los scripts están **aplicados** en el proyecto `aybhurdvejocwfoyjkjm` (org `workhubmty`). Para nuevos entornos, correrlos **en orden numérico**.

## Orden de ejecución

| # | Archivo | Qué hace | Estado |
|---|---------|----------|--------|
| 01 | `01_seed_catalogos.sql` | Pobla Rol, Plano, Zona; normaliza Estado id=5; asigna Zona=1 a los 10 Espacios | ✅ aplicado |
| 02 | `02_alter_existing.sql` | Añade columnas faltantes a Usuario/Espacio/Reserva sin perder datos; checks e índices | ✅ aplicado |
| 03 | `03_log_conflicto.sql` | Crea tabla `LogConflictoReserva` (HU-4.8) | ✅ aplicado |
| 04 | `04_functions.sql` | RPCs, triggers, `handle_new_user` mejorado | ✅ aplicado |
| 05 | `05_policies.sql` | Row Level Security | ✅ aplicado |
| 06 | `06_cleanup_legacy.sql` | Elimina policies legacy duplicadas; backfill Gamificacion | ✅ aplicado |
| 07 | `07_cron_finalize.sql` | Programa job pg_cron `finalize-reservas` cada minuto | ✅ aplicado |

## Cómo aplicar

### Opción A — SQL Editor de Supabase (recomendado)

1. [supabase.com/dashboard](https://supabase.com/dashboard) → proyecto `aybhurdvejocwfoyjkjm`.
2. **SQL Editor → New query**, ejecuta cada archivo en orden numérico.
3. Verifica en **Authentication → Settings**:
   - `Enable email confirmations` — según prefieras (hoy el frontend asume OFF).
   - `Allowed email domains` — opcional (también se valida en el trigger).

### Opción B — Management API (lo que usamos)

Con un Personal Access Token:
```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."
python -c "import json,sys;print(json.dumps({'query': open(sys.argv[1]).read()}))" db/04_functions.sql > /tmp/p.json
curl -s -X POST "https://api.supabase.com/v1/projects/aybhurdvejocwfoyjkjm/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" -d @/tmp/p.json
```
Respuesta `[]` = ok.

### Opción C — Supabase CLI

```bash
supabase link --project-ref aybhurdvejocwfoyjkjm
# cuando migremos a migrations/ formales:
supabase db push
```

---

## Modelo

```
auth.users ──► trigger handle_new_user ──► Usuario (id_rol → Rol)
                                              │
                                              ▼
                          Gamificacion (1:1 con Usuario)
                                              │
                                              ▼
                     MovimientoPuntos, UsuarioBeneficio

Zona (piso, id_plano → Plano)
   │
   ▼
Espacio (coord_x/y/ancho/alto)
   │
   ▼
Reserva (id_estado → Estado)
   │  trigger trg_reserva_actualiza_espacio ──► recalcula Espacio.estado_espacio
   │
   └─► LogConflictoReserva (escrito por crear_reserva() en caso de conflicto)
```

## Catálogo Estado
| id | estado |
|----|--------|
| 1 | confirmada |
| 2 | activa |
| 3 | pendiente |
| 4 | cancelada |
| 5 | finalizada |

## Cubrimiento de Sprint 2

| Historia | Implementación |
|----------|----------------|
| HU-1.3 Endpoint POST crear reservas | RPC `public.crear_reserva(...)` |
| HU-3.3 Endpoint cancelar | RPC `public.cancelar_reserva(id)` |
| HU-3.4 Liberar espacio al cancelar | trigger `trg_reserva_actualiza_espacio` |
| HU-4.2 Validación de traslape backend | `public.existe_conflicto_reserva(...)` |
| HU-4.5 Manejar errores de conflicto | `raise exception 'conflicto:<motivo>:lugares_restantes=<n>'` |
| HU-4.8 Logs de intentos | tabla `LogConflictoReserva` + insert dentro de `crear_reserva` |

## pg_cron

Job `finalize-reservas` (jobid 4) corre cada minuto llamando `public.finalizar_reservas_vencidas()`.

Jobs legacy todavía activos (revisar si duplican):
- `liberar-espacios-noche` (diario 00:00)
- `liberar-espacios-automatico` (cada hora)
- `finalizar-reservas-pasadas-eficiente` (cada hora)

Para ver estado:
```sql
select jobid, jobname, schedule, active from cron.job;
```

## Integración en frontend

- ✅ `Dashboard.jsx handleConfirmReserve` → `supabase.rpc('crear_reserva', { p_id_espacio, p_fecha_reserva, p_hora_inicio, p_hora_fin, p_asistentes, p_notas })`. Parsea `conflicto:<motivo>:lugares_restantes=<n>`.
- ✅ `ReservationsView.jsx cancelarReserva` → `supabase.rpc('cancelar_reserva', { p_id_reserva })`.
- ✅ `Dashboard.jsx` ahora deriva `floorAreas` desde `Espacio` + `Zona.piso` (selector de piso funcional).

## Gotchas

- `Usuario.numero_empleado` tiene `unique`. Al registrar, si el usuario deja ese campo vacío el `nullif` del trigger lo guarda como `null` para no chocar.
- Las horas en `Reserva` se guardan como `time` local (Monterrey), **no UTC**. No usar `toISOString()` al armar el payload.
- `existe_conflicto_reserva` acepta `p_id_reserva_excluir` — útil para re-validar al editar una reserva sin contarse a sí misma.
