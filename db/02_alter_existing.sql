-- ============================================================================
-- 02 — Columnas y constraints faltantes en las tablas existentes
-- Se añaden sin borrar datos: usa ADD COLUMN IF NOT EXISTS
-- ============================================================================

-- ---- Usuario ------------------------------------------------------------
alter table public."Usuario"
    add column if not exists numero_empleado text unique,
    add column if not exists fecha_registro  timestamptz not null default now();

-- Backfill: los 5 usuarios existentes sin rol → Empleado
update public."Usuario" set id_rol = 2 where id_rol is null;

alter table public."Usuario"
    alter column id_rol set default 2,
    alter column id_rol set not null;

-- ---- Espacio: geometría del mapa ---------------------------------------
alter table public."Espacio"
    add column if not exists coord_x numeric(5,2),
    add column if not exists coord_y numeric(5,2),
    add column if not exists ancho   numeric(5,2),
    add column if not exists alto    numeric(5,2);

-- Backfill coords (mock floorAreas de src/config/constants.js)
update public."Espacio" set coord_x= 5, coord_y= 8, ancho=22, alto=18 where codigo='area1'  and coord_x is null;
update public."Espacio" set coord_x=30, coord_y= 8, ancho=18, alto=18 where codigo='area2'  and coord_x is null;
update public."Espacio" set coord_x=52, coord_y= 8, ancho=20, alto=18 where codigo='area3'  and coord_x is null;
update public."Espacio" set coord_x=76, coord_y= 8, ancho=20, alto=18 where codigo='area4'  and coord_x is null;
update public."Espacio" set coord_x= 8, coord_y=30, ancho=25, alto=20 where codigo='area5'  and coord_x is null;
update public."Espacio" set coord_x=38, coord_y=30, ancho=22, alto=20 where codigo='area6'  and coord_x is null;
update public."Espacio" set coord_x=65, coord_y=30, ancho=28, alto=20 where codigo='area7'  and coord_x is null;
update public."Espacio" set coord_x=10, coord_y=55, ancho=30, alto=22 where codigo='area8'  and coord_x is null;
update public."Espacio" set coord_x=45, coord_y=55, ancho=20, alto=22 where codigo='area9'  and coord_x is null;
update public."Espacio" set coord_x=70, coord_y=55, ancho=24, alto=22 where codigo='area10' and coord_x is null;

-- id_zona ahora puede ser NOT NULL (todos los espacios ya tienen zona)
alter table public."Espacio"
    alter column id_zona set not null;

-- ---- Reserva: check de horario y campos extra --------------------------
alter table public."Reserva"
    add column if not exists fecha_cancelacion timestamptz,
    add column if not exists notas             text;

-- id_estado NOT NULL (ninguna reserva actual tiene NULL)
alter table public."Reserva"
    alter column id_estado set not null;

-- Check: hora_inicio < hora_fin (ninguna reserva actual debería violarlo)
do $$
begin
    if not exists (
        select 1 from pg_constraint
         where conname = 'chk_reserva_horario'
    ) then
        alter table public."Reserva"
            add constraint chk_reserva_horario check (hora_inicio < hora_fin);
    end if;
end$$;

-- Check: asistentes > 0
do $$
begin
    if not exists (
        select 1 from pg_constraint
         where conname = 'chk_reserva_asistentes'
    ) then
        alter table public."Reserva"
            add constraint chk_reserva_asistentes check (asistentes > 0);
    end if;
end$$;

-- ---- Índices para queries frecuentes -----------------------------------
create index if not exists idx_reserva_usuario         on public."Reserva"(id_usuario);
create index if not exists idx_reserva_espacio_fecha   on public."Reserva"(id_espacio, fecha_reserva);
create index if not exists idx_reserva_estado          on public."Reserva"(id_estado);
create index if not exists idx_reserva_fecha_solicitud on public."Reserva"(fecha_solicitud desc);
create index if not exists idx_espacio_zona            on public."Espacio"(id_zona);
create index if not exists idx_zona_piso               on public."Zona"(piso);
create index if not exists idx_usuario_rol             on public."Usuario"(id_rol);
