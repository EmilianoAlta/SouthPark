-- ============================================================================
-- 08 — Poblar pisos 2-6 con espacios + retirar jobs pg_cron legacy
-- Idempotente: ON CONFLICT DO NOTHING por código
-- ============================================================================

-- ---- Sincronizar la sequence (evita colisión con IDs ya asignados manualmente)
select setval(pg_get_serial_sequence('public."Espacio"', 'id_espacio'),
              coalesce((select max(id_espacio) from public."Espacio"), 1),
              true);

-- ---- Pisos 2-6: 5 espacios por piso (p2-area1..5, p3-area1..5, ...) ---------
-- Geometría en el sistema 100x82 del SVG del mapa
insert into public."Espacio" (codigo, tipo, capacidad, estado_espacio, disponible,
                               id_zona, coord_x, coord_y, ancho, alto) values
    -- Piso 2 (Zona 2 – Colaboración)
    ('p2-area1', 'Sala Colaboración',  8, 'disponible', true, 2, 5,  8,  22, 18),
    ('p2-area2', 'Sala Scrum',         6, 'disponible', true, 2, 30, 8,  18, 18),
    ('p2-area3', 'Sala Brainstorm',   10, 'disponible', true, 2, 52, 8,  20, 18),
    ('p2-area4', 'Open Space',        24, 'disponible', true, 2, 10, 35, 40, 25),
    ('p2-area5', 'Phone Booth',        2, 'disponible', true, 2, 76, 8,  20, 18),
    -- Piso 3 (Zona 3 – Innovación)
    ('p3-area1', 'Sala Focus',         4, 'disponible', true, 3, 5,  8,  20, 18),
    ('p3-area2', 'Sala Innovación A',  8, 'disponible', true, 3, 28, 8,  22, 18),
    ('p3-area3', 'Sala Innovación B',  8, 'disponible', true, 3, 53, 8,  22, 18),
    ('p3-area4', 'Lab Creativo',      12, 'disponible', true, 3, 77, 8,  20, 18),
    ('p3-area5', 'Open Space',        20, 'disponible', true, 3, 15, 35, 70, 30),
    -- Piso 4 (Zona 4 – Hot Desks)
    ('p4-area1', 'Hot Desk Zona A',   10, 'disponible', true, 4, 5,  8,  42, 28),
    ('p4-area2', 'Hot Desk Zona B',   10, 'disponible', true, 4, 52, 8,  43, 28),
    ('p4-area3', 'Hot Desk Zona C',    8, 'disponible', true, 4, 5,  42, 42, 28),
    ('p4-area4', 'Hot Desk Zona D',    8, 'disponible', true, 4, 52, 42, 43, 28),
    ('p4-area5', 'Cafetería',         20, 'disponible', true, 4, 40, 72, 25, 8),
    -- Piso 5 (Zona 5 – Ejecutivo)
    ('p5-area1', 'Sala Ejecutiva A',   6, 'disponible', true, 5, 8,  10, 26, 22),
    ('p5-area2', 'Sala Ejecutiva B',   6, 'disponible', true, 5, 40, 10, 26, 22),
    ('p5-area3', 'Sala Ejecutiva C',   8, 'disponible', true, 5, 70, 10, 22, 22),
    ('p5-area4', 'Sala Board Room',   14, 'disponible', true, 5, 10, 42, 55, 30),
    ('p5-area5', 'Ante-sala',          4, 'disponible', true, 5, 70, 42, 22, 20),
    -- Piso 6 (Zona 6 – Auditorio)
    ('p6-area1', 'Auditorio',         80, 'disponible', true, 6, 5,  8,  70, 40),
    ('p6-area2', 'Sala Training A',   20, 'disponible', true, 6, 78, 8,  18, 19),
    ('p6-area3', 'Sala Training B',   20, 'disponible', true, 6, 78, 29, 18, 19),
    ('p6-area4', 'Coffee & Break',    25, 'disponible', true, 6, 5,  52, 40, 25),
    ('p6-area5', 'Zona Networking',   30, 'disponible', true, 6, 48, 52, 48, 25)
on conflict (codigo) do nothing;

-- ---- Retirar jobs pg_cron legacy ------------------------------------------
-- jobid 1 'liberar-espacios-noche': RESET total diario de 'ocupado'→'disponible'
--        (peligroso, ignora reservas activas). Reemplazado por trigger + finalize-reservas.
-- jobid 2 'liberar-espacios-automatico': recalcula ocupado según reservas activas.
--        Redundante con trigger trg_reserva_actualiza_espacio.
-- jobid 3 'finalizar-reservas-pasadas-eficiente': marca reservas vencidas con
--        id_estado=4 (cancelada) — BUG: deberían ser 5 (finalizada). Reemplazado por
--        finalize-reservas (jobid 4) que usa finalizar_reservas_vencidas() correctamente.
do $$
declare
    j record;
begin
    for j in
        select jobid, jobname from cron.job
         where jobname in (
            'liberar-espacios-noche',
            'liberar-espacios-automatico',
            'finalizar-reservas-pasadas-eficiente'
         )
    loop
        perform cron.unschedule(j.jobid);
        raise notice 'Retirado job pg_cron: % (jobid=%)', j.jobname, j.jobid;
    end loop;
end$$;
