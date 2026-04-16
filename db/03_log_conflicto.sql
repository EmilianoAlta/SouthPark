-- ============================================================================
-- 03 — LogConflictoReserva  (HU-4.8)
-- Registra cada intento de reserva que falló por conflicto
-- ============================================================================

create table if not exists public."LogConflictoReserva" (
    id_log                 bigserial primary key,
    id_usuario             uuid not null references public."Usuario"(id_usuario) on delete cascade,
    id_espacio             bigint not null references public."Espacio"(id_espacio) on delete cascade,
    fecha_reserva          date not null,
    hora_inicio            time not null,
    hora_fin               time not null,
    asistentes_solicitados smallint not null check (asistentes_solicitados > 0),
    asistentes_ocupados    smallint not null,
    capacidad_espacio      smallint not null,
    motivo                 text not null
                           check (motivo in ('traslape_horario','cupo_insuficiente','espacio_mantenimiento','espacio_inexistente')),
    creado_en              timestamptz not null default now()
);

create index if not exists idx_logconf_usuario on public."LogConflictoReserva"(id_usuario);
create index if not exists idx_logconf_espacio on public."LogConflictoReserva"(id_espacio, fecha_reserva);
create index if not exists idx_logconf_fecha   on public."LogConflictoReserva"(creado_en desc);

alter table public."LogConflictoReserva" enable row level security;

comment on table public."LogConflictoReserva" is
    'HU-4.8: log de intentos de reserva que fallaron por conflicto';
