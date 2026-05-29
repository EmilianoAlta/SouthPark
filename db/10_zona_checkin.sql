-- ============================================================================
-- 10 — Check-in / Check-out filtrado por zona
-- Extiende el sistema de 09_checkin_checkout.sql para soportar QRs por zona.
-- Zona horaria: America/Monterrey en todas las funciones temporales
-- ============================================================================

-- ============================================================================
-- 1. proxima_reserva_zona(p_id_zona)
-- Igual que proxima_reserva() pero filtra por zona de espacios de trabajo.
-- Usado cuando el usuario escanea el QR de una zona específica (/checkin?zona=N)
-- ============================================================================
create or replace function public.proxima_reserva_zona(p_id_zona integer)
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
        r.asistentes::integer, r.id_estado::integer,
        es2.estado::text   as estado_nombre,
        esp.id_espacio,
        esp.codigo::text   as espacio_codigo,
        esp.tipo::text     as espacio_tipo,
        z.nombre_zona::text,
        z.piso::integer    as zona_piso
    from public."Reserva"   r
    join public."Espacio"   esp on esp.id_espacio = r.id_espacio
    join public."Zona"      z   on z.id_zona      = esp.id_zona
    join public."Estado"    es2 on es2.id_estado  = r.id_estado
    where r.id_usuario = v_usuario
      and r.id_estado  in (2, 3)
      and z.id_zona    = p_id_zona
      and (
            r.fecha_reserva > v_hoy
         or (r.fecha_reserva = v_hoy and r.hora_fin > v_ahora)
      )
    order by r.fecha_reserva asc, r.hora_inicio asc
    limit 1;
end;
$$;

grant execute on function public.proxima_reserva_zona(integer) to authenticated;

-- ============================================================================
-- 2. proxima_reserva_parking(p_id_zona_est)
-- Reserva de estacionamiento pendiente o activa más próxima para una zona.
-- Usado cuando el usuario escanea el QR de un nivel (/checkin?parking=N)
-- ============================================================================
create or replace function public.proxima_reserva_parking(p_id_zona_est integer)
returns table (
    id_reserva_est  bigint,
    fecha_reserva   date,
    hora_inicio     time,
    hora_fin        time,
    id_estado       integer,
    cajon_codigo    text,
    zona_nombre     text,
    zona_nivel      integer
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
        r.id_reserva_est,
        r.fecha_reserva,
        r.hora_inicio,
        r.hora_fin,
        r.id_estado,
        c.codigo::text   as cajon_codigo,
        z.nombre_nivel::text as zona_nombre,
        z.nivel          as zona_nivel
    from public."ReservaEstacionamiento" r
    join public."Cajon"              c on c.id_cajon    = r.id_cajon
    join public."ZonaEstacionamiento" z on z.id_zona_est = c.id_zona_est
    where r.id_usuario   = v_usuario
      and r.id_estado    in (2, 3)
      and z.id_zona_est  = p_id_zona_est
      and (
            r.fecha_reserva > v_hoy
         or (r.fecha_reserva = v_hoy and r.hora_fin > v_ahora)
      )
    order by r.fecha_reserva asc, r.hora_inicio asc
    limit 1;
end;
$$;

grant execute on function public.proxima_reserva_parking(integer) to authenticated;

-- ============================================================================
-- 3. confirmar_checkin_parking(p_id_reserva_est)
-- Pendiente (3) → Activa (2)
-- Ventana idéntica a confirmar_checkin(): desde hora_inicio hasta +10 min
-- ============================================================================
create or replace function public.confirmar_checkin_parking(p_id_reserva_est bigint)
returns public."ReservaEstacionamiento"
language plpgsql
security definer
set search_path = public
as $$
declare
    v_usuario uuid := auth.uid();
    v_reserva public."ReservaEstacionamiento";
    v_ahora   time := (now() at time zone 'America/Monterrey')::time;
    v_hoy     date := (now() at time zone 'America/Monterrey')::date;
begin
    if v_usuario is null then raise exception 'No autenticado' using errcode = '28000'; end if;

    select * into v_reserva
      from public."ReservaEstacionamiento"
     where id_reserva_est = p_id_reserva_est
     for update;

    if not found then raise exception 'Reserva de estacionamiento no encontrada' using errcode = '22023'; end if;
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

    update public."ReservaEstacionamiento"
       set id_estado = 2
     where id_reserva_est = p_id_reserva_est
    returning * into v_reserva;

    return v_reserva;
end;
$$;

grant execute on function public.confirmar_checkin_parking(bigint) to authenticated;

-- ============================================================================
-- 4. finalizar_checkout_parking(p_id_reserva_est)
-- Activa (2) → Finalizada (5) + gamificación (+10 pts, +1 asistida)
-- ============================================================================
create or replace function public.finalizar_checkout_parking(p_id_reserva_est bigint)
returns public."ReservaEstacionamiento"
language plpgsql
security definer
set search_path = public
as $$
declare
    v_usuario uuid := auth.uid();
    v_reserva public."ReservaEstacionamiento";
begin
    if v_usuario is null then raise exception 'No autenticado' using errcode = '28000'; end if;

    select * into v_reserva
      from public."ReservaEstacionamiento"
     where id_reserva_est = p_id_reserva_est
     for update;

    if not found then raise exception 'Reserva de estacionamiento no encontrada' using errcode = '22023'; end if;

    if v_reserva.id_usuario <> v_usuario and not public.es_admin() then
        raise exception 'No autorizado' using errcode = '42501';
    end if;

    if v_reserva.id_estado <> 2 then raise exception 'La reserva no está activa' using errcode = 'P0001'; end if;

    update public."ReservaEstacionamiento"
       set id_estado = 5
     where id_reserva_est = p_id_reserva_est
    returning * into v_reserva;

    update public."Gamificacion"
       set reservas_asistidas = reservas_asistidas + 1,
           puntos_acumulados  = puntos_acumulados + 10
     where id_usuario = v_reserva.id_usuario;

    return v_reserva;
end;
$$;

grant execute on function public.finalizar_checkout_parking(bigint) to authenticated;
