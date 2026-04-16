-- ============================================================================
-- 06 — Limpiar políticas legacy y backfill de Gamificacion
-- ============================================================================

-- Políticas viejas en Reserva permiten INSERT/UPDATE directos, contradicen
-- el modelo RPC-only (crear_reserva / cancelar_reserva). Las retiramos.
drop policy if exists "Todos pueden ver las reservas" on public."Reserva";
drop policy if exists "Solo yo puedo crear mis propias reservas" on public."Reserva";
drop policy if exists "Permitir a los usuarios cancelar sus propias reservas" on public."Reserva";

-- Duplicados redundantes (las nuevas policies cubren el mismo caso)
drop policy if exists "Todos pueden ver los espacios" on public."Espacio";
drop policy if exists "Usuarios pueden ver su propio perfil" on public."Usuario";

-- ============================================================================
-- Backfill Gamificacion para los 5 usuarios existentes que no tienen fila
-- ============================================================================
insert into public."Gamificacion" (id_usuario, puntos_acumulados, nivel,
                                    reservas_asistidas, reservas_canceladas)
select u.id_usuario, 0, 1, 0, 0
  from public."Usuario" u
 where not exists (
        select 1 from public."Gamificacion" g
         where g.id_usuario = u.id_usuario
 );
