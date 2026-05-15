-- Tabla de bloqueos temporales (6 min) para evitar reservas duplicadas
CREATE TABLE IF NOT EXISTS "BloqueoReserva" (
  id_bloqueo    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_espacio    integer NOT NULL REFERENCES "Espacio"(id_espacio) ON DELETE CASCADE,
  id_usuario    uuid NOT NULL REFERENCES "Usuario"(id_usuario) ON DELETE CASCADE,
  fecha_reserva date NOT NULL,
  hora_inicio   time NOT NULL,
  hora_fin      time NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '6 minutes')
);

CREATE INDEX IF NOT EXISTS idx_bloqueo_espacio_fecha ON "BloqueoReserva" (id_espacio, fecha_reserva);

ALTER TABLE "BloqueoReserva" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bloqueo_select" ON "BloqueoReserva" FOR SELECT TO authenticated USING (true);
CREATE POLICY "bloqueo_insert" ON "BloqueoReserva" FOR INSERT TO authenticated WITH CHECK (id_usuario = auth.uid());
CREATE POLICY "bloqueo_delete" ON "BloqueoReserva" FOR DELETE TO authenticated USING (id_usuario = auth.uid());

CREATE OR REPLACE FUNCTION limpiar_bloqueos_expirados()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM "BloqueoReserva" WHERE expires_at < now();
$$;

SELECT cron.schedule('limpiar-bloqueos', '* * * * *', 'SELECT limpiar_bloqueos_expirados()');
