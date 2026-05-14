-- ============================================================================
-- 09 — Check-in / Check-out (Sprint 3)
-- Zona horaria: America/Monterrey en todas las funciones temporales
-- ============================================================================

-- ============================================================================
-- 1. crear_reserva → estado inicial = pendiente (3)
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
        p_asistentes, 3, p_notas)
    returning * into v_reserva;

    return v_reserva;
end;
$$;

grant execute on function public.crear_reserva(bigint, date, time, time, smallint, text) to authenticated;

-- ============================================================================
-- 2. finalizar_reservas_vencidas → maneja pendientes sin check-in (no-show)
-- ============================================================================
create or replace function public.finalizar_reservas_vencidas()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_hoy  date := (now() at time zone 'America/Monterrey')::date;
    v_ahora time := (now() at time zone 'America/Monterrey')::time;
begin
    -- Pendientes (3) que superaron la ventana de 10 min → Finalizadas (5) [no-show]
    update public."Reserva"
       set id_estado = 5
     where id_estado = 3
       and fecha_reserva = v_hoy
       and v_ahora > hora_inicio + interval '10 minutes';

    -- Pendientes (3) de días anteriores → Finalizadas (5)
    update public."Reserva"
       set id_estado = 5
     where id_estado = 3
       and fecha_reserva < v_hoy;

    -- Confirmadas legacy (1) que empezaron → Activas (2)
    update public."Reserva"
       set id_estado = 2
     where id_estado = 1
       and fecha_reserva = v_hoy
       and v_ahora >= hora_inicio
       and v_ahora <  hora_fin;

    -- Activas/Confirmadas cuyo hora_fin pasó → Finalizadas (5)
    update public."Reserva"
       set id_estado = 5
     where id_estado in (1, 2)
       and (
            fecha_reserva < v_hoy
         or (fecha_reserva = v_hoy and v_ahora >= hora_fin)
       );
end;
$$;

-- ============================================================================
-- 3. confirmar_checkin()
-- Ventana: hora_inicio <= now(Monterrey) <= hora_inicio + 10 min (mismo día)
-- Pendiente (3) → Activa (2)
-- ============================================================================
create or replace function public.confirmar_checkin(p_id_reserva bigint)
returns public."Reserva"
language plpgsql
security definer
set search_path = public
as $$
declare
    v_usuario uuid := auth.uid();
    v_reserva public."Reserva";
    v_ahora   time := (now() at time zone 'America/Monterrey')::time;
    v_hoy     date := (now() at time zone 'America/Monterrey')::date;
begin
    if v_usuario is null then raise exception 'No autenticado' using errcode = '28000'; end if;

    select * into v_reserva from public."Reserva" where id_reserva = p_id_reserva for update;
    if not found then raise exception 'Reserva no encontrada' using errcode = '22023'; end if;
    if v_reserva.id_usuario <> v_usuario then raise exception 'No autorizado' using errcode = '42501'; end if;
    if v_reserva.id_estado <> 3 then raise exception 'La reserva no está en estado pendiente' using errcode = 'P0001'; end if;

    if v_reserva.fecha_reserva <> v_hoy then
        raise exception 'El check-in solo puede realizarse el día de la reserva' using errcode = 'P0001';
    end if;

    if v_ahora < v_reserva.hora_inicio then
        raise exception 'Todavía no es la hora del check-in. El acceso abre a las %',
            to_char(v_reserva.hora_inicio, 'HH24:MI') using errcode = 'P0001';
    end if;

    if v_ahora > v_reserva.hora_inicio + interval '10 minutes' then
        raise exception 'La ventana de check-in expiró (10 min desde las %)',
            to_char(v_reserva.hora_inicio, 'HH24:MI') using errcode = 'P0001';
    end if;

    update public."Reserva" set id_estado = 2 where id_reserva = p_id_reserva returning * into v_reserva;
    return v_reserva;
end;
$$;

grant execute on function public.confirmar_checkin(bigint) to authenticated;

-- ============================================================================
-- 4. finalizar_checkout()
-- Activa (2) → Finalizada (5) + gamificación (+10 pts, +1 asistida)
-- ============================================================================
create or replace function public.finalizar_checkout(p_id_reserva bigint)
returns public."Reserva"
language plpgsql
security definer
set search_path = public
as $$
declare
    v_usuario uuid := auth.uid();
    v_reserva public."Reserva";
begin
    if v_usuario is null then raise exception 'No autenticado' using errcode = '28000'; end if;

    select * into v_reserva from public."Reserva" where id_reserva = p_id_reserva for update;
    if not found then raise exception 'Reserva no encontrada' using errcode = '22023'; end if;

    if v_reserva.id_usuario <> v_usuario and not public.es_admin() then
        raise exception 'No autorizado' using errcode = '42501';
    end if;

    if v_reserva.id_estado <> 2 then raise exception 'La reserva no está activa' using errcode = 'P0001'; end if;

    update public."Reserva" set id_estado = 5 where id_reserva = p_id_reserva returning * into v_reserva;

    update public."Gamificacion"
       set reservas_asistidas = reservas_asistidas + 1,
           puntos_acumulados  = puntos_acumulados + 10
     where id_usuario = v_reserva.id_usuario;

    return v_reserva;
end;
$$;

grant execute on function public.finalizar_checkout(bigint) to authenticated;

-- ============================================================================
-- 5. proxima_reserva()
-- Reserva pendiente o activa más próxima (zona horaria Monterrey)
-- ============================================================================
create or replace function public.proxima_reserva()
returns table (
    id_reserva     bigint,
    fecha_reserva  date,
    hora_inicio    time,
    hora_fin       time,
    asistentes     integer,
    id_estado      integer,
    estado_nombre  text,
    id_espacio     bigint,
    espacio_codigo text,
    espacio_tipo   text,
    zona_nombre    text,
    zona_piso      integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_usuario uuid := auth.uid();
    v_hoy     date := (now() at time zone 'America/Monterrey')::date;
    v_ahora   time := (now() at time zone 'America/Monterrey')::time;
begin
    if v_usuario is null then raise exception 'No autenticado' using errcode = '28000'; end if;

    return query
    select
        r.id_reserva, r.fecha_reserva, r.hora_inicio, r.hora_fin,
        r.asistentes::integer, r.id_estado,
        es2.estado::text   as estado_nombre,
        esp.id_espacio,
        esp.codigo::text   as espacio_codigo,
        esp.tipo::text     as espacio_tipo,
        z.nombre_zona::text,
        z.piso             as zona_piso
    from public."Reserva"   r
    join public."Espacio"   esp on esp.id_espacio = r.id_espacio
    join public."Zona"      z   on z.id_zona      = esp.id_zona
    join public."Estado"    es2 on es2.id_estado  = r.id_estado
    where r.id_usuario = v_usuario
      and r.id_estado  in (2, 3)
      and (
            r.fecha_reserva > v_hoy
         or (r.fecha_reserva = v_hoy and r.hora_fin > v_ahora)
      )
    order by r.fecha_reserva asc, r.hora_inicio asc
    limit 1;
end;
$$;

grant execute on function public.proxima_reserva() to authenticated;
