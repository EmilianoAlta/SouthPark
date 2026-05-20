-- Zona de estacionamiento (niveles S1, S2, S3)
CREATE TABLE IF NOT EXISTS "ZonaEstacionamiento" (
  id_zona_est   serial PRIMARY KEY,
  nivel         integer NOT NULL,
  nombre_nivel  text NOT NULL DEFAULT ''
);

INSERT INTO "ZonaEstacionamiento" (nivel, nombre_nivel) VALUES
  (1, 'S1 — Sótano 1'),
  (2, 'S2 — Sótano 2'),
  (3, 'S3 — Sótano 3');

-- Cajones de estacionamiento
CREATE TABLE IF NOT EXISTS "Cajon" (
  id_cajon      serial PRIMARY KEY,
  id_zona_est   integer NOT NULL REFERENCES "ZonaEstacionamiento"(id_zona_est) ON DELETE CASCADE,
  codigo        text NOT NULL,
  tipo          text NOT NULL DEFAULT 'Normal',
  estado        text NOT NULL DEFAULT 'disponible',
  coord_x       numeric DEFAULT 0,
  coord_y       numeric DEFAULT 0,
  ancho         numeric DEFAULT 3,
  alto          numeric DEFAULT 3
);

CREATE INDEX IF NOT EXISTS idx_cajon_zona ON "Cajon" (id_zona_est);

-- Reservas de estacionamiento
CREATE TABLE IF NOT EXISTS "ReservaEstacionamiento" (
  id_reserva_est  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario      uuid NOT NULL REFERENCES "Usuario"(id_usuario) ON DELETE CASCADE,
  id_cajon        integer NOT NULL REFERENCES "Cajon"(id_cajon) ON DELETE CASCADE,
  fecha_reserva   date NOT NULL,
  hora_inicio     time NOT NULL,
  hora_fin        time NOT NULL,
  id_estado       integer NOT NULL DEFAULT 3,
  fecha_solicitud timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reserva_est_cajon ON "ReservaEstacionamiento" (id_cajon, fecha_reserva);
CREATE INDEX IF NOT EXISTS idx_reserva_est_usuario ON "ReservaEstacionamiento" (id_usuario);

-- RLS
ALTER TABLE "ZonaEstacionamiento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cajon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReservaEstacionamiento" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zona_est_select" ON "ZonaEstacionamiento" FOR SELECT TO authenticated USING (true);

CREATE POLICY "cajon_select" ON "Cajon" FOR SELECT TO authenticated USING (true);
CREATE POLICY "cajon_insert" ON "Cajon" FOR INSERT TO authenticated WITH CHECK (es_admin());
CREATE POLICY "cajon_update" ON "Cajon" FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
CREATE POLICY "cajon_delete" ON "Cajon" FOR DELETE TO authenticated USING (es_admin());

CREATE POLICY "reserva_est_select" ON "ReservaEstacionamiento" FOR SELECT TO authenticated USING (true);
CREATE POLICY "reserva_est_insert" ON "ReservaEstacionamiento" FOR INSERT TO authenticated WITH CHECK (id_usuario = auth.uid());
CREATE POLICY "reserva_est_update" ON "ReservaEstacionamiento" FOR UPDATE TO authenticated USING (id_usuario = auth.uid() OR es_admin());
CREATE POLICY "reserva_est_delete" ON "ReservaEstacionamiento" FOR DELETE TO authenticated USING (id_usuario = auth.uid() OR es_admin());
