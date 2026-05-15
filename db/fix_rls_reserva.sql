DROP POLICY "reserva_select_own_or_admin" ON "Reserva";
CREATE POLICY "reserva_select_all" ON "Reserva"
  FOR SELECT TO authenticated USING (true);
