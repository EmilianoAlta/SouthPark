-- ============================================================================
-- 04 — Funciones, RPCs y triggers
-- Cubre: HU-1.3, HU-3.3, HU-3.4, HU-4.2, HU-4.5, HU-4.8
-- ============================================================================

-- ============================================================================
-- 1. handle_new_user()  [REEMPLAZA la existente, añade id_rol, num_empleado, validación de dominio]
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Validar dominio corporativo (tec.mx permitido para debug)
    if not (new.email ilike '%@accenture.com' or new.email ilike '%@tec.mx') then
        raise exception 'Dominio no permitido: %', new.email;
    end if;

    insert into public."Usuario" (
        id_usuario, correo, nombre, primer_apellido, segundo_apellido,
        numero_empleado, id_rol, estado
    ) values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'nombre', 'Usuario'),
        coalesce(new.raw_user_meta_data->>'primer_apellido', ''),
        nullif(new.raw_user_meta_data->>'segundo_apellido', ''),
        nullif(new.raw_user_meta_data->>'numero_empleado', ''),
        2,           -- Empleado por defecto
        'ACTIVO'
    )
    on conflict (id_usuario) do nothing;

    -- Crear registro de Gamificacion inicial
    insert into public."Gamificacion" (id_usuario, puntos_acumulados, nivel,
                                        reservas_asistidas, reservas_canceladas)
    values (new.id, 0, 1, 0, 0)
    on conflict (id_usuario) do nothing;

    return new;
end;
$$;

-- El trigger ya existe (on_auth_user_created) apuntando a esta función, no lo recreamos.

-- ============================================================================
-- 2. es_admin()
-- ============================================================================
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(
        (select id_rol = 1 from public."Usuario" where id_usuario = auth.uid()),
        false
    );
$$;

grant execute on function public.es_admin() to authenticated;

-- ============================================================================
-- 3. existe_conflicto_reserva()  (HU-4.2)
-- ============================================================================
create or replace function public.existe_conflicto_reserva(
    p_id_espacio         bigint,
    p_fecha_reserva      date,
    p_hora_inicio        time,
    p_hora_fin           time,
    p_asistentes         smallint,
    p_id_reserva_excluir bigint default null
)
returns table (
    hay_conflicto       boolean,
    motivo              text,
    capacidad           integer,
    asistentes_ocupados integer,
    lugares_restantes   integer
)
language plpgsql
stable
as $$
declare
    v_capacidad integer;
    v_estado    text;
    v_ocupados  integer;
begin
    select e.capacidad, e.estado_espacio
      into v_capacidad, v_estado
      from public."Espacio" e
     where e.id_espacio = p_id_espacio;

    if not found then
        return query select true, 'espacio_inexistente'::text, 0, 0, 0;
        return;
    end if;

    if v_estado = 'mantenimiento' then
        return query select true, 'espacio_mantenimiento'::text, v_capacidad, 0, 0;
        return;
    end if;

    select coalesce(sum(r.asistentes), 0)::int
      into v_ocupados
      from public."Reserva" r
     where r.id_espacio    = p_id_espacio
       and r.fecha_reserva = p_fecha_reserva
       and r.id_estado     in (1, 2, 3)
       and r.hora_inicio   <  p_hora_fin
       and r.hora_fin      >  p_hora_inicio
       and (p_id_reserva_excluir is null or r.id_reserva <> p_id_reserva_excluir);

    if v_ocupados + p_asistentes > v_capacidad then
        return query
            select true,
                   'cupo_insuficiente'::text,
                   v_capacidad,
                   v_ocupados,
                   greatest(0, v_capacidad - v_ocupados);
        return;
    end if;

    return query select false, null::text, v_capacidad, v_ocupados,
                       (v_capacidad - v_ocupados - p_asistentes);
end;
$$;

grant execute on function public.existe_conflicto_reserva(bigint, date, time, time, smallint, bigint) to authenticated;

-- ============================================================================
-- 4. crear_reserva()  (HU-1.3 + HU-4.5 + HU-4.8)
-- ============================================================================
create or replace function public.crear_reserva(
    p_id_espacio    bigint,
    p_fecha_reserva date,
    p_hora_inicio   time,
    p_hora_fin      time,
    p_asistentes    smallint,
    p_notas         text default null
)
returns public."Reserva"
language plpgsql
security definer
set search_path = public
as $$
declare
    v_usuario   uuid := auth.uid();
    v_conflicto record;
    v_reserva   public."Reserva";
begin
    if v_usuario is null then
        raise exception 'No autenticado' using errcode = '28000';
    end if;

    if p_hora_inicio >= p_hora_fin then
        raise exception 'hora_inicio debe ser anterior a hora_fin' using errcode = '22023';
    end if;

    if p_asistentes <= 0 then
        raise exception 'asistentes debe ser > 0' using errcode = '22023';
    end if;

    select * into v_conflicto
      from public.existe_conflicto_reserva(
          p_id_espacio, p_fecha_reserva, p_hora_inicio, p_hora_fin, p_asistentes);

    if v_conflicto.hay_conflicto then
        insert into public."LogConflictoReserva"(
            id_usuario, id_espacio, fecha_reserva, hora_inicio, hora_fin,
            asistentes_solicitados, asistentes_ocupados, capacidad_espacio, motivo)
        values (
            v_usuario, p_id_espacio, p_fecha_reserva, p_hora_inicio, p_hora_fin,
            p_asistentes, v_conflicto.asistentes_ocupados, v_conflicto.capacidad, v_conflicto.motivo);

        raise exception 'conflicto:%:lugares_restantes=%',
            v_conflicto.motivo, v_conflicto.lugares_restantes
            using errcode = 'P0001';
    end if;

    insert into public."Reserva"(
        id_usuario, id_espacio, fecha_reserva, hora_inicio, hora_fin,
        asistentes, id_estado, notas)
    values (
        v_usuario, p_id_espacio, p_fecha_reserva, p_hora_inicio, p_hora_fin,
        p_asistentes, 1, p_notas)
    returning * into v_reserva;

    return v_reserva;
end;
$$;

grant execute on function public.crear_reserva(bigint, date, time, time, smallint, text) to authenticated;

-- ============================================================================
-- 5. cancelar_reserva()  (HU-3.3)
-- ============================================================================
create or replace function public.cancelar_reserva(p_id_reserva bigint)
returns public."Reserva"
language plpgsql
security definer
set search_path = public
as $$
declare
    v_usuario uuid := auth.uid();
    v_reserva public."Reserva";
begin
    if v_usuario is null then
        raise exception 'No autenticado' using errcode = '28000';
    end if;

    select * into v_reserva
      from public."Reserva"
     where id_reserva = p_id_reserva
       for update;

    if not found then
        raise exception 'Reserva no encontrada' using errcode = '22023';
    end if;

    if v_reserva.id_usuario <> v_usuario and not public.es_admin() then
        raise exception 'No autorizado' using errcode = '42501';
    end if;

    if v_reserva.id_estado in (4, 5) then
        raise exception 'La reserva ya está % y no puede cancelarse',
            (case v_reserva.id_estado when 4 then 'cancelada' else 'finalizada' end)
            using errcode = 'P0001';
    end if;

    update public."Reserva"
       set id_estado = 4,
           fecha_cancelacion = now()
     where id_reserva = p_id_reserva
     returning * into v_reserva;

    -- Gamificación: contar cancelación
    update public."Gamificacion"
       set reservas_canceladas = reservas_canceladas + 1
     where id_usuario = v_reserva.id_usuario;

    return v_reserva;
end;
$$;

grant execute on function public.cancelar_reserva(bigint) to authenticated;

-- ============================================================================
-- 6. actualizar_estado_espacio()  (HU-3.4)
-- Trigger: libera/ocupa el espacio según reservas activas
-- ============================================================================
create or replace function public.actualizar_estado_espacio()
returns trigger
language plpgsql
as $$
declare
    v_id_espacio    bigint;
    v_capacidad     integer;
    v_ocupados      integer;
    v_estado_actual text;
begin
    v_id_espacio := coalesce(new.id_espacio, old.id_espacio);

    select capacidad, estado_espacio
      into v_capacidad, v_estado_actual
      from public."Espacio"
     where id_espacio = v_id_espacio;

    -- No tocar espacios en mantenimiento
    if v_estado_actual = 'mantenimiento' then
        return coalesce(new, old);
    end if;

    select coalesce(sum(r.asistentes), 0)::int
      into v_ocupados
      from public."Reserva" r
     where r.id_espacio    = v_id_espacio
       and r.id_estado     in (1, 2)
       and r.fecha_reserva = current_date
       and current_time   >= r.hora_inicio
       and current_time   <  r.hora_fin;

    if v_ocupados >= v_capacidad then
        update public."Espacio"
           set estado_espacio = 'ocupado', disponible = false
         where id_espacio = v_id_espacio
           and estado_espacio <> 'ocupado';
    else
        update public."Espacio"
           set estado_espacio = 'disponible', disponible = true
         where id_espacio = v_id_espacio
           and estado_espacio <> 'disponible';
    end if;

    return coalesce(new, old);
end;
$$;

drop trigger if exists trg_reserva_actualiza_espacio on public."Reserva";
create trigger trg_reserva_actualiza_espacio
    after insert or update or delete on public."Reserva"
    for each row execute function public.actualizar_estado_espacio();

-- ============================================================================
-- 7. finalizar_reservas_vencidas()
-- Para programar con pg_cron cada minuto
-- ============================================================================
create or replace function public.finalizar_reservas_vencidas()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Confirmadas (1) que empezaron ahora → Activas (2)
    update public."Reserva"
       set id_estado = 2
     where id_estado = 1
       and fecha_reserva = current_date
       and current_time >= hora_inicio
       and current_time <  hora_fin;

    -- Activas/Confirmadas cuyo hora_fin pasó → Finalizadas (5)
    update public."Reserva"
       set id_estado = 5
     where id_estado in (1, 2)
       and (
            fecha_reserva <  current_date
         or (fecha_reserva = current_date and current_time >= hora_fin)
       );
end;
$$;

comment on function public.finalizar_reservas_vencidas is
    'Schedule con: select cron.schedule(''finalize-reservas'',''* * * * *'',$$select public.finalizar_reservas_vencidas()$$);';
