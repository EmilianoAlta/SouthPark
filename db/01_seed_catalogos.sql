-- ============================================================================
-- 01 — Poblar catálogos vacíos y asignar zonas a los espacios existentes
-- Idempotente: ON CONFLICT DO UPDATE
-- ============================================================================

-- --- Rol ----------------------------------------------------------------
insert into public."Rol"(id_rol, nombre_rol, descripcion) values
    (1, 'Administrador', 'Acceso total: métricas, mantenimiento, reservas globales'),
    (2, 'Empleado',      'Usuario estándar: reserva espacios para sí mismo'),
    (3, 'Invitado',      'Sólo lectura')
on conflict (id_rol) do update
   set nombre_rol = excluded.nombre_rol,
       descripcion = excluded.descripcion;

-- --- Normalizar Estado (inconsistencia de mayúsculas en id_estado=5) ----
update public."Estado" set estado = 'finalizada'
 where id_estado = 5 and estado <> 'finalizada';

-- --- Plano (uno por piso del 1 al 6) ------------------------------------
insert into public."Plano"(id_plano, imagen) values
    (1, '/planos/piso-1.svg'),
    (2, '/planos/piso-2.svg'),
    (3, '/planos/piso-3.svg'),
    (4, '/planos/piso-4.svg'),
    (5, '/planos/piso-5.svg'),
    (6, '/planos/piso-6.svg')
on conflict (id_plano) do update set imagen = excluded.imagen;

-- Resetear secuencia del Plano para que nuevos inserts partan de 7
select setval(pg_get_serial_sequence('public."Plano"', 'id_plano'), 6, true);

-- --- Zona (1 por piso, default) -----------------------------------------
insert into public."Zona"(id_zona, nombre_zona, piso, id_plano, descripcion) values
    (1, 'Piso 1 - Recepción',    1, 1, 'Áreas abiertas, recepción y open spaces'),
    (2, 'Piso 2 - Colaboración', 2, 2, 'Salas de colaboración'),
    (3, 'Piso 3 - Innovación',   3, 3, 'Salas de innovación y focus'),
    (4, 'Piso 4 - Hot Desks',    4, 4, 'Hot desks individuales'),
    (5, 'Piso 5 - Ejecutivo',    5, 5, 'Salas ejecutivas'),
    (6, 'Piso 6 - Auditorio',    6, 6, 'Auditorio y salas grandes')
on conflict (id_zona) do update
   set nombre_zona = excluded.nombre_zona,
       piso        = excluded.piso,
       id_plano    = excluded.id_plano,
       descripcion = excluded.descripcion;

select setval(pg_get_serial_sequence('public."Zona"', 'id_zona'), 6, true);

-- --- Asignar los 10 Espacios existentes a Zona piso 1 (compat frontend) -
update public."Espacio"
   set id_zona = 1
 where id_zona is null
   and codigo in ('area1','area2','area3','area4','area5',
                  'area6','area7','area8','area9','area10');
