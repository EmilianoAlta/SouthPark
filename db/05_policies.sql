-- ============================================================================
-- 05 — Row Level Security policies
-- Cubre: HU-1.3, HU-2.1, HU-3.3, HU-4.8
-- Idempotente: drop + create
-- ============================================================================

-- Activar RLS en tablas de negocio (si no lo estaban ya)
alter table public."Usuario"             enable row level security;
alter table public."Reserva"             enable row level security;
alter table public."Espacio"             enable row level security;
alter table public."Zona"                enable row level security;
alter table public."Plano"               enable row level security;
alter table public."Estado"              enable row level security;
alter table public."Rol"                 enable row level security;
alter table public."Gamificacion"        enable row level security;
alter table public."MovimientoPuntos"    enable row level security;
alter table public."Beneficio"           enable row level security;
alter table public."UsuarioBeneficio"    enable row level security;
alter table public."Actividad"           enable row level security;
alter table public."LogConflictoReserva" enable row level security;

-- ============================================================================
-- Usuario
-- ============================================================================
drop policy if exists usuario_select_own_or_admin on public."Usuario";
create policy usuario_select_own_or_admin on public."Usuario"
    for select to authenticated
    using (id_usuario = auth.uid() or public.es_admin());

drop policy if exists usuario_update_own on public."Usuario";
create policy usuario_update_own on public."Usuario"
    for update to authenticated
    using (id_usuario = auth.uid() or public.es_admin())
    with check (id_usuario = auth.uid() or public.es_admin());

-- Insert lo hace el trigger handle_new_user (SECURITY DEFINER), no necesita policy.

-- ============================================================================
-- Reserva
-- ============================================================================
drop policy if exists reserva_select_own_or_admin on public."Reserva";
create policy reserva_select_own_or_admin on public."Reserva"
    for select to authenticated
    using (id_usuario = auth.uid() or public.es_admin());

-- Insert/Update/Delete directos NO se permiten: el frontend usa RPCs (crear_reserva, cancelar_reserva).
-- Admin sí puede hacer update directo si lo necesita.
drop policy if exists reserva_update_admin on public."Reserva";
create policy reserva_update_admin on public."Reserva"
    for update to authenticated
    using (public.es_admin())
    with check (public.es_admin());

-- ============================================================================
-- Espacio — lectura abierta a todos los autenticados, escritura solo admin
-- ============================================================================
drop policy if exists espacio_select_all on public."Espacio";
create policy espacio_select_all on public."Espacio"
    for select to authenticated
    using (true);

drop policy if exists espacio_write_admin on public."Espacio";
create policy espacio_write_admin on public."Espacio"
    for all to authenticated
    using (public.es_admin())
    with check (public.es_admin());

-- ============================================================================
-- Catálogos: lectura libre, escritura solo admin
-- ============================================================================
do $$
declare
    t text;
begin
    foreach t in array array['Zona','Plano','Estado','Rol']
    loop
        execute format('drop policy if exists %I_select_all on public.%I', lower(t), t);
        execute format(
            'create policy %I_select_all on public.%I for select to authenticated using (true)',
            lower(t), t
        );
        execute format('drop policy if exists %I_write_admin on public.%I', lower(t), t);
        execute format(
            'create policy %I_write_admin on public.%I for all to authenticated using (public.es_admin()) with check (public.es_admin())',
            lower(t), t
        );
    end loop;
end$$;

-- ============================================================================
-- Gamificacion: usuario ve lo suyo, admin ve todo
-- ============================================================================
drop policy if exists gamif_select_own_or_admin on public."Gamificacion";
create policy gamif_select_own_or_admin on public."Gamificacion"
    for select to authenticated
    using (id_usuario = auth.uid() or public.es_admin());

-- Writes las hacen triggers/RPCs con security definer.

drop policy if exists movpts_select_own_or_admin on public."MovimientoPuntos";
create policy movpts_select_own_or_admin on public."MovimientoPuntos"
    for select to authenticated
    using (
        public.es_admin()
     or exists (
            select 1 from public."Gamificacion" g
             where g.id_gamificacion = "MovimientoPuntos".id_gamificacion
               and g.id_usuario = auth.uid()
        )
    );

drop policy if exists usubenef_select_own_or_admin on public."UsuarioBeneficio";
create policy usubenef_select_own_or_admin on public."UsuarioBeneficio"
    for select to authenticated
    using (id_usuario = auth.uid() or public.es_admin());

-- ============================================================================
-- Beneficio (catálogo de recompensas): lectura libre
-- ============================================================================
drop policy if exists beneficio_select_all on public."Beneficio";
create policy beneficio_select_all on public."Beneficio"
    for select to authenticated
    using (true);

drop policy if exists beneficio_write_admin on public."Beneficio";
create policy beneficio_write_admin on public."Beneficio"
    for all to authenticated
    using (public.es_admin())
    with check (public.es_admin());

-- ============================================================================
-- Actividad: no tiene FK a Usuario/Reserva actualmente → solo admin
-- (cuando se conecte con Reserva via id_reserva, refinar esta policy)
-- ============================================================================
drop policy if exists actividad_select_admin on public."Actividad";
create policy actividad_select_admin on public."Actividad"
    for select to authenticated
    using (public.es_admin());

-- ============================================================================
-- LogConflictoReserva (HU-4.8): usuario ve sus propios intentos, admin ve todo
-- ============================================================================
drop policy if exists logconf_select_own_or_admin on public."LogConflictoReserva";
create policy logconf_select_own_or_admin on public."LogConflictoReserva"
    for select to authenticated
    using (id_usuario = auth.uid() or public.es_admin());

-- Insert lo hace crear_reserva() con SECURITY DEFINER.
