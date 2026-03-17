-- Origen en la fe: nuevo en la fe vs viene de otra iglesia

ALTER TABLE customers ADD COLUMN IF NOT EXISTS faith_origin TEXT;
COMMENT ON COLUMN customers.faith_origin IS 'Origen en la fe: nuevo_en_la_fe, viene_de_otra_iglesia, otro.';
