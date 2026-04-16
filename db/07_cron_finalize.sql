-- ============================================================================
-- 07 — Programar finalización automática de reservas vencidas
-- Requiere extensión pg_cron habilitada (ya está en Supabase)
-- ============================================================================

-- Eliminar job anterior si existe (idempotente)
select cron.unschedule(jobid)
  from cron.job
 where jobname = 'finalize-reservas';

-- Programar cada minuto
select cron.schedule(
    'finalize-reservas',
    '* * * * *',
    $$select public.finalizar_reservas_vencidas()$$
);
