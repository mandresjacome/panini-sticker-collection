-- =============================================================================
-- SEED: Datos iniciales — App Láminas FIFA World Cup 2026
-- =============================================================================
-- Inserta los 994 stickers en estado F (Falta) con cantidad 0.
-- Estructura extraída de la Planilla de Control oficial:
--   • FWC00 + FWC1–FWC19  = 20  stickers  (tipo: Especial)
--   • 48 selecciones × 20 = 960 stickers  (tipo: Selección)
--   • CC1–CC14             = 14  stickers  (tipo: Patrocinador)
--   TOTAL                  = 994 stickers
--
-- Ejecutar DESPUÉS de la migración 001_create_tables.sql
-- =============================================================================


-- -----------------------------------------------------------------------------
-- CATÁLOGO DE EQUIPOS (50 registros: 48 selecciones + FWC + CC)
-- -----------------------------------------------------------------------------
INSERT INTO public.teams (code, name) VALUES
  ('FWC', 'FIFA World Cup'),
  ('MEX', 'México'),
  ('RSA', 'Sudáfrica'),
  ('KOR', 'Corea del Sur'),
  ('CZE', 'República Checa'),
  ('CAN', 'Canadá'),
  ('BIH', 'Bosnia y Herzegovina'),
  ('QAT', 'Qatar'),
  ('SUI', 'Suiza'),
  ('BRA', 'Brasil'),
  ('MAR', 'Marruecos'),
  ('HAI', 'Haití'),
  ('SCO', 'Escocia'),
  ('USA', 'Estados Unidos'),
  ('PAR', 'Paraguay'),
  ('AUS', 'Australia'),
  ('TUR', 'Turquía'),
  ('GER', 'Alemania'),
  ('CUW', 'Curazao'),
  ('CIV', 'Costa de Marfil'),
  ('ECU', 'Ecuador'),
  ('NED', 'Países Bajos'),
  ('JPN', 'Japón'),
  ('SWE', 'Suecia'),
  ('TUN', 'Túnez'),
  ('BEL', 'Bélgica'),
  ('EGY', 'Egipto'),
  ('IRN', 'Irán'),
  ('NZL', 'Nueva Zelanda'),
  ('ESP', 'España'),
  ('CPV', 'Cabo Verde'),
  ('KSA', 'Arabia Saudita'),
  ('URU', 'Uruguay'),
  ('FRA', 'Francia'),
  ('SEN', 'Senegal'),
  ('IRQ', 'Irak'),
  ('NOR', 'Noruega'),
  ('ARG', 'Argentina'),
  ('ALG', 'Argelia'),
  ('AUT', 'Austria'),
  ('JOR', 'Jordania'),
  ('POR', 'Portugal'),
  ('COD', 'Rep. Democrática del Congo'),
  ('UZB', 'Uzbekistán'),
  ('COL', 'Colombia'),
  ('ENG', 'Inglaterra'),
  ('CRO', 'Croacia'),
  ('GHA', 'Ghana'),
  ('PAN', 'Panamá'),
  ('CC',  'Coca-Cola')
ON CONFLICT (code) DO NOTHING;  -- Idempotente: no falla si ya existen


-- -----------------------------------------------------------------------------
-- LÁMINAS FWC — FIFA World Cup Especiales (20 stickers: FWC00 + FWC1–FWC19)
-- -----------------------------------------------------------------------------
INSERT INTO public.stickers (codigo, equipo, tipo, estado, cantidad) VALUES
  ('FWC00', 'FWC', 'Especial', 'F', 0),
  ('FWC1',  'FWC', 'Especial', 'F', 0),
  ('FWC2',  'FWC', 'Especial', 'F', 0),
  ('FWC3',  'FWC', 'Especial', 'F', 0),
  ('FWC4',  'FWC', 'Especial', 'F', 0),
  ('FWC5',  'FWC', 'Especial', 'F', 0),
  ('FWC6',  'FWC', 'Especial', 'F', 0),
  ('FWC7',  'FWC', 'Especial', 'F', 0),
  ('FWC8',  'FWC', 'Especial', 'F', 0),
  ('FWC9',  'FWC', 'Especial', 'F', 0),
  ('FWC10', 'FWC', 'Especial', 'F', 0),
  ('FWC11', 'FWC', 'Especial', 'F', 0),
  ('FWC12', 'FWC', 'Especial', 'F', 0),
  ('FWC13', 'FWC', 'Especial', 'F', 0),
  ('FWC14', 'FWC', 'Especial', 'F', 0),
  ('FWC15', 'FWC', 'Especial', 'F', 0),
  ('FWC16', 'FWC', 'Especial', 'F', 0),
  ('FWC17', 'FWC', 'Especial', 'F', 0),
  ('FWC18', 'FWC', 'Especial', 'F', 0),
  ('FWC19', 'FWC', 'Especial', 'F', 0)
ON CONFLICT (codigo) DO NOTHING;


-- -----------------------------------------------------------------------------
-- LÁMINAS DE SELECCIONES (48 equipos × 20 = 960 stickers, tipo: Selección)
-- -----------------------------------------------------------------------------
INSERT INTO public.stickers (codigo, equipo, tipo, estado, cantidad) VALUES
  -- MEX — México
  ('MEX1','MEX','Selección','F',0), ('MEX2','MEX','Selección','F',0), ('MEX3','MEX','Selección','F',0), ('MEX4','MEX','Selección','F',0), ('MEX5','MEX','Selección','F',0),
  ('MEX6','MEX','Selección','F',0), ('MEX7','MEX','Selección','F',0), ('MEX8','MEX','Selección','F',0), ('MEX9','MEX','Selección','F',0), ('MEX10','MEX','Selección','F',0),
  ('MEX11','MEX','Selección','F',0), ('MEX12','MEX','Selección','F',0), ('MEX13','MEX','Selección','F',0), ('MEX14','MEX','Selección','F',0), ('MEX15','MEX','Selección','F',0),
  ('MEX16','MEX','Selección','F',0), ('MEX17','MEX','Selección','F',0), ('MEX18','MEX','Selección','F',0), ('MEX19','MEX','Selección','F',0), ('MEX20','MEX','Selección','F',0),
  -- RSA — Sudáfrica
  ('RSA1','RSA','Selección','F',0), ('RSA2','RSA','Selección','F',0), ('RSA3','RSA','Selección','F',0), ('RSA4','RSA','Selección','F',0), ('RSA5','RSA','Selección','F',0),
  ('RSA6','RSA','Selección','F',0), ('RSA7','RSA','Selección','F',0), ('RSA8','RSA','Selección','F',0), ('RSA9','RSA','Selección','F',0), ('RSA10','RSA','Selección','F',0),
  ('RSA11','RSA','Selección','F',0), ('RSA12','RSA','Selección','F',0), ('RSA13','RSA','Selección','F',0), ('RSA14','RSA','Selección','F',0), ('RSA15','RSA','Selección','F',0),
  ('RSA16','RSA','Selección','F',0), ('RSA17','RSA','Selección','F',0), ('RSA18','RSA','Selección','F',0), ('RSA19','RSA','Selección','F',0), ('RSA20','RSA','Selección','F',0),
  -- KOR — Corea del Sur
  ('KOR1','KOR','Selección','F',0), ('KOR2','KOR','Selección','F',0), ('KOR3','KOR','Selección','F',0), ('KOR4','KOR','Selección','F',0), ('KOR5','KOR','Selección','F',0),
  ('KOR6','KOR','Selección','F',0), ('KOR7','KOR','Selección','F',0), ('KOR8','KOR','Selección','F',0), ('KOR9','KOR','Selección','F',0), ('KOR10','KOR','Selección','F',0),
  ('KOR11','KOR','Selección','F',0), ('KOR12','KOR','Selección','F',0), ('KOR13','KOR','Selección','F',0), ('KOR14','KOR','Selección','F',0), ('KOR15','KOR','Selección','F',0),
  ('KOR16','KOR','Selección','F',0), ('KOR17','KOR','Selección','F',0), ('KOR18','KOR','Selección','F',0), ('KOR19','KOR','Selección','F',0), ('KOR20','KOR','Selección','F',0),
  -- CZE — República Checa
  ('CZE1','CZE','Selección','F',0), ('CZE2','CZE','Selección','F',0), ('CZE3','CZE','Selección','F',0), ('CZE4','CZE','Selección','F',0), ('CZE5','CZE','Selección','F',0),
  ('CZE6','CZE','Selección','F',0), ('CZE7','CZE','Selección','F',0), ('CZE8','CZE','Selección','F',0), ('CZE9','CZE','Selección','F',0), ('CZE10','CZE','Selección','F',0),
  ('CZE11','CZE','Selección','F',0), ('CZE12','CZE','Selección','F',0), ('CZE13','CZE','Selección','F',0), ('CZE14','CZE','Selección','F',0), ('CZE15','CZE','Selección','F',0),
  ('CZE16','CZE','Selección','F',0), ('CZE17','CZE','Selección','F',0), ('CZE18','CZE','Selección','F',0), ('CZE19','CZE','Selección','F',0), ('CZE20','CZE','Selección','F',0),
  -- CAN — Canadá
  ('CAN1','CAN','Selección','F',0), ('CAN2','CAN','Selección','F',0), ('CAN3','CAN','Selección','F',0), ('CAN4','CAN','Selección','F',0), ('CAN5','CAN','Selección','F',0),
  ('CAN6','CAN','Selección','F',0), ('CAN7','CAN','Selección','F',0), ('CAN8','CAN','Selección','F',0), ('CAN9','CAN','Selección','F',0), ('CAN10','CAN','Selección','F',0),
  ('CAN11','CAN','Selección','F',0), ('CAN12','CAN','Selección','F',0), ('CAN13','CAN','Selección','F',0), ('CAN14','CAN','Selección','F',0), ('CAN15','CAN','Selección','F',0),
  ('CAN16','CAN','Selección','F',0), ('CAN17','CAN','Selección','F',0), ('CAN18','CAN','Selección','F',0), ('CAN19','CAN','Selección','F',0), ('CAN20','CAN','Selección','F',0),
  -- BIH — Bosnia y Herzegovina
  ('BIH1','BIH','Selección','F',0), ('BIH2','BIH','Selección','F',0), ('BIH3','BIH','Selección','F',0), ('BIH4','BIH','Selección','F',0), ('BIH5','BIH','Selección','F',0),
  ('BIH6','BIH','Selección','F',0), ('BIH7','BIH','Selección','F',0), ('BIH8','BIH','Selección','F',0), ('BIH9','BIH','Selección','F',0), ('BIH10','BIH','Selección','F',0),
  ('BIH11','BIH','Selección','F',0), ('BIH12','BIH','Selección','F',0), ('BIH13','BIH','Selección','F',0), ('BIH14','BIH','Selección','F',0), ('BIH15','BIH','Selección','F',0),
  ('BIH16','BIH','Selección','F',0), ('BIH17','BIH','Selección','F',0), ('BIH18','BIH','Selección','F',0), ('BIH19','BIH','Selección','F',0), ('BIH20','BIH','Selección','F',0),
  -- QAT — Qatar
  ('QAT1','QAT','Selección','F',0), ('QAT2','QAT','Selección','F',0), ('QAT3','QAT','Selección','F',0), ('QAT4','QAT','Selección','F',0), ('QAT5','QAT','Selección','F',0),
  ('QAT6','QAT','Selección','F',0), ('QAT7','QAT','Selección','F',0), ('QAT8','QAT','Selección','F',0), ('QAT9','QAT','Selección','F',0), ('QAT10','QAT','Selección','F',0),
  ('QAT11','QAT','Selección','F',0), ('QAT12','QAT','Selección','F',0), ('QAT13','QAT','Selección','F',0), ('QAT14','QAT','Selección','F',0), ('QAT15','QAT','Selección','F',0),
  ('QAT16','QAT','Selección','F',0), ('QAT17','QAT','Selección','F',0), ('QAT18','QAT','Selección','F',0), ('QAT19','QAT','Selección','F',0), ('QAT20','QAT','Selección','F',0),
  -- SUI — Suiza
  ('SUI1','SUI','Selección','F',0), ('SUI2','SUI','Selección','F',0), ('SUI3','SUI','Selección','F',0), ('SUI4','SUI','Selección','F',0), ('SUI5','SUI','Selección','F',0),
  ('SUI6','SUI','Selección','F',0), ('SUI7','SUI','Selección','F',0), ('SUI8','SUI','Selección','F',0), ('SUI9','SUI','Selección','F',0), ('SUI10','SUI','Selección','F',0),
  ('SUI11','SUI','Selección','F',0), ('SUI12','SUI','Selección','F',0), ('SUI13','SUI','Selección','F',0), ('SUI14','SUI','Selección','F',0), ('SUI15','SUI','Selección','F',0),
  ('SUI16','SUI','Selección','F',0), ('SUI17','SUI','Selección','F',0), ('SUI18','SUI','Selección','F',0), ('SUI19','SUI','Selección','F',0), ('SUI20','SUI','Selección','F',0),
  -- BRA — Brasil
  ('BRA1','BRA','Selección','F',0), ('BRA2','BRA','Selección','F',0), ('BRA3','BRA','Selección','F',0), ('BRA4','BRA','Selección','F',0), ('BRA5','BRA','Selección','F',0),
  ('BRA6','BRA','Selección','F',0), ('BRA7','BRA','Selección','F',0), ('BRA8','BRA','Selección','F',0), ('BRA9','BRA','Selección','F',0), ('BRA10','BRA','Selección','F',0),
  ('BRA11','BRA','Selección','F',0), ('BRA12','BRA','Selección','F',0), ('BRA13','BRA','Selección','F',0), ('BRA14','BRA','Selección','F',0), ('BRA15','BRA','Selección','F',0),
  ('BRA16','BRA','Selección','F',0), ('BRA17','BRA','Selección','F',0), ('BRA18','BRA','Selección','F',0), ('BRA19','BRA','Selección','F',0), ('BRA20','BRA','Selección','F',0),
  -- MAR — Marruecos
  ('MAR1','MAR','Selección','F',0), ('MAR2','MAR','Selección','F',0), ('MAR3','MAR','Selección','F',0), ('MAR4','MAR','Selección','F',0), ('MAR5','MAR','Selección','F',0),
  ('MAR6','MAR','Selección','F',0), ('MAR7','MAR','Selección','F',0), ('MAR8','MAR','Selección','F',0), ('MAR9','MAR','Selección','F',0), ('MAR10','MAR','Selección','F',0),
  ('MAR11','MAR','Selección','F',0), ('MAR12','MAR','Selección','F',0), ('MAR13','MAR','Selección','F',0), ('MAR14','MAR','Selección','F',0), ('MAR15','MAR','Selección','F',0),
  ('MAR16','MAR','Selección','F',0), ('MAR17','MAR','Selección','F',0), ('MAR18','MAR','Selección','F',0), ('MAR19','MAR','Selección','F',0), ('MAR20','MAR','Selección','F',0),
  -- HAI — Haití
  ('HAI1','HAI','Selección','F',0), ('HAI2','HAI','Selección','F',0), ('HAI3','HAI','Selección','F',0), ('HAI4','HAI','Selección','F',0), ('HAI5','HAI','Selección','F',0),
  ('HAI6','HAI','Selección','F',0), ('HAI7','HAI','Selección','F',0), ('HAI8','HAI','Selección','F',0), ('HAI9','HAI','Selección','F',0), ('HAI10','HAI','Selección','F',0),
  ('HAI11','HAI','Selección','F',0), ('HAI12','HAI','Selección','F',0), ('HAI13','HAI','Selección','F',0), ('HAI14','HAI','Selección','F',0), ('HAI15','HAI','Selección','F',0),
  ('HAI16','HAI','Selección','F',0), ('HAI17','HAI','Selección','F',0), ('HAI18','HAI','Selección','F',0), ('HAI19','HAI','Selección','F',0), ('HAI20','HAI','Selección','F',0),
  -- SCO — Escocia
  ('SCO1','SCO','Selección','F',0), ('SCO2','SCO','Selección','F',0), ('SCO3','SCO','Selección','F',0), ('SCO4','SCO','Selección','F',0), ('SCO5','SCO','Selección','F',0),
  ('SCO6','SCO','Selección','F',0), ('SCO7','SCO','Selección','F',0), ('SCO8','SCO','Selección','F',0), ('SCO9','SCO','Selección','F',0), ('SCO10','SCO','Selección','F',0),
  ('SCO11','SCO','Selección','F',0), ('SCO12','SCO','Selección','F',0), ('SCO13','SCO','Selección','F',0), ('SCO14','SCO','Selección','F',0), ('SCO15','SCO','Selección','F',0),
  ('SCO16','SCO','Selección','F',0), ('SCO17','SCO','Selección','F',0), ('SCO18','SCO','Selección','F',0), ('SCO19','SCO','Selección','F',0), ('SCO20','SCO','Selección','F',0),
  -- USA — Estados Unidos
  ('USA1','USA','Selección','F',0), ('USA2','USA','Selección','F',0), ('USA3','USA','Selección','F',0), ('USA4','USA','Selección','F',0), ('USA5','USA','Selección','F',0),
  ('USA6','USA','Selección','F',0), ('USA7','USA','Selección','F',0), ('USA8','USA','Selección','F',0), ('USA9','USA','Selección','F',0), ('USA10','USA','Selección','F',0),
  ('USA11','USA','Selección','F',0), ('USA12','USA','Selección','F',0), ('USA13','USA','Selección','F',0), ('USA14','USA','Selección','F',0), ('USA15','USA','Selección','F',0),
  ('USA16','USA','Selección','F',0), ('USA17','USA','Selección','F',0), ('USA18','USA','Selección','F',0), ('USA19','USA','Selección','F',0), ('USA20','USA','Selección','F',0),
  -- PAR — Paraguay
  ('PAR1','PAR','Selección','F',0), ('PAR2','PAR','Selección','F',0), ('PAR3','PAR','Selección','F',0), ('PAR4','PAR','Selección','F',0), ('PAR5','PAR','Selección','F',0),
  ('PAR6','PAR','Selección','F',0), ('PAR7','PAR','Selección','F',0), ('PAR8','PAR','Selección','F',0), ('PAR9','PAR','Selección','F',0), ('PAR10','PAR','Selección','F',0),
  ('PAR11','PAR','Selección','F',0), ('PAR12','PAR','Selección','F',0), ('PAR13','PAR','Selección','F',0), ('PAR14','PAR','Selección','F',0), ('PAR15','PAR','Selección','F',0),
  ('PAR16','PAR','Selección','F',0), ('PAR17','PAR','Selección','F',0), ('PAR18','PAR','Selección','F',0), ('PAR19','PAR','Selección','F',0), ('PAR20','PAR','Selección','F',0),
  -- AUS — Australia
  ('AUS1','AUS','Selección','F',0), ('AUS2','AUS','Selección','F',0), ('AUS3','AUS','Selección','F',0), ('AUS4','AUS','Selección','F',0), ('AUS5','AUS','Selección','F',0),
  ('AUS6','AUS','Selección','F',0), ('AUS7','AUS','Selección','F',0), ('AUS8','AUS','Selección','F',0), ('AUS9','AUS','Selección','F',0), ('AUS10','AUS','Selección','F',0),
  ('AUS11','AUS','Selección','F',0), ('AUS12','AUS','Selección','F',0), ('AUS13','AUS','Selección','F',0), ('AUS14','AUS','Selección','F',0), ('AUS15','AUS','Selección','F',0),
  ('AUS16','AUS','Selección','F',0), ('AUS17','AUS','Selección','F',0), ('AUS18','AUS','Selección','F',0), ('AUS19','AUS','Selección','F',0), ('AUS20','AUS','Selección','F',0),
  -- TUR — Turquía
  ('TUR1','TUR','Selección','F',0), ('TUR2','TUR','Selección','F',0), ('TUR3','TUR','Selección','F',0), ('TUR4','TUR','Selección','F',0), ('TUR5','TUR','Selección','F',0),
  ('TUR6','TUR','Selección','F',0), ('TUR7','TUR','Selección','F',0), ('TUR8','TUR','Selección','F',0), ('TUR9','TUR','Selección','F',0), ('TUR10','TUR','Selección','F',0),
  ('TUR11','TUR','Selección','F',0), ('TUR12','TUR','Selección','F',0), ('TUR13','TUR','Selección','F',0), ('TUR14','TUR','Selección','F',0), ('TUR15','TUR','Selección','F',0),
  ('TUR16','TUR','Selección','F',0), ('TUR17','TUR','Selección','F',0), ('TUR18','TUR','Selección','F',0), ('TUR19','TUR','Selección','F',0), ('TUR20','TUR','Selección','F',0),
  -- GER — Alemania
  ('GER1','GER','Selección','F',0), ('GER2','GER','Selección','F',0), ('GER3','GER','Selección','F',0), ('GER4','GER','Selección','F',0), ('GER5','GER','Selección','F',0),
  ('GER6','GER','Selección','F',0), ('GER7','GER','Selección','F',0), ('GER8','GER','Selección','F',0), ('GER9','GER','Selección','F',0), ('GER10','GER','Selección','F',0),
  ('GER11','GER','Selección','F',0), ('GER12','GER','Selección','F',0), ('GER13','GER','Selección','F',0), ('GER14','GER','Selección','F',0), ('GER15','GER','Selección','F',0),
  ('GER16','GER','Selección','F',0), ('GER17','GER','Selección','F',0), ('GER18','GER','Selección','F',0), ('GER19','GER','Selección','F',0), ('GER20','GER','Selección','F',0),
  -- CUW — Curazao
  ('CUW1','CUW','Selección','F',0), ('CUW2','CUW','Selección','F',0), ('CUW3','CUW','Selección','F',0), ('CUW4','CUW','Selección','F',0), ('CUW5','CUW','Selección','F',0),
  ('CUW6','CUW','Selección','F',0), ('CUW7','CUW','Selección','F',0), ('CUW8','CUW','Selección','F',0), ('CUW9','CUW','Selección','F',0), ('CUW10','CUW','Selección','F',0),
  ('CUW11','CUW','Selección','F',0), ('CUW12','CUW','Selección','F',0), ('CUW13','CUW','Selección','F',0), ('CUW14','CUW','Selección','F',0), ('CUW15','CUW','Selección','F',0),
  ('CUW16','CUW','Selección','F',0), ('CUW17','CUW','Selección','F',0), ('CUW18','CUW','Selección','F',0), ('CUW19','CUW','Selección','F',0), ('CUW20','CUW','Selección','F',0),
  -- CIV — Costa de Marfil
  ('CIV1','CIV','Selección','F',0), ('CIV2','CIV','Selección','F',0), ('CIV3','CIV','Selección','F',0), ('CIV4','CIV','Selección','F',0), ('CIV5','CIV','Selección','F',0),
  ('CIV6','CIV','Selección','F',0), ('CIV7','CIV','Selección','F',0), ('CIV8','CIV','Selección','F',0), ('CIV9','CIV','Selección','F',0), ('CIV10','CIV','Selección','F',0),
  ('CIV11','CIV','Selección','F',0), ('CIV12','CIV','Selección','F',0), ('CIV13','CIV','Selección','F',0), ('CIV14','CIV','Selección','F',0), ('CIV15','CIV','Selección','F',0),
  ('CIV16','CIV','Selección','F',0), ('CIV17','CIV','Selección','F',0), ('CIV18','CIV','Selección','F',0), ('CIV19','CIV','Selección','F',0), ('CIV20','CIV','Selección','F',0),
  -- ECU — Ecuador
  ('ECU1','ECU','Selección','F',0), ('ECU2','ECU','Selección','F',0), ('ECU3','ECU','Selección','F',0), ('ECU4','ECU','Selección','F',0), ('ECU5','ECU','Selección','F',0),
  ('ECU6','ECU','Selección','F',0), ('ECU7','ECU','Selección','F',0), ('ECU8','ECU','Selección','F',0), ('ECU9','ECU','Selección','F',0), ('ECU10','ECU','Selección','F',0),
  ('ECU11','ECU','Selección','F',0), ('ECU12','ECU','Selección','F',0), ('ECU13','ECU','Selección','F',0), ('ECU14','ECU','Selección','F',0), ('ECU15','ECU','Selección','F',0),
  ('ECU16','ECU','Selección','F',0), ('ECU17','ECU','Selección','F',0), ('ECU18','ECU','Selección','F',0), ('ECU19','ECU','Selección','F',0), ('ECU20','ECU','Selección','F',0),
  -- NED — Países Bajos
  ('NED1','NED','Selección','F',0), ('NED2','NED','Selección','F',0), ('NED3','NED','Selección','F',0), ('NED4','NED','Selección','F',0), ('NED5','NED','Selección','F',0),
  ('NED6','NED','Selección','F',0), ('NED7','NED','Selección','F',0), ('NED8','NED','Selección','F',0), ('NED9','NED','Selección','F',0), ('NED10','NED','Selección','F',0),
  ('NED11','NED','Selección','F',0), ('NED12','NED','Selección','F',0), ('NED13','NED','Selección','F',0), ('NED14','NED','Selección','F',0), ('NED15','NED','Selección','F',0),
  ('NED16','NED','Selección','F',0), ('NED17','NED','Selección','F',0), ('NED18','NED','Selección','F',0), ('NED19','NED','Selección','F',0), ('NED20','NED','Selección','F',0),
  -- JPN — Japón
  ('JPN1','JPN','Selección','F',0), ('JPN2','JPN','Selección','F',0), ('JPN3','JPN','Selección','F',0), ('JPN4','JPN','Selección','F',0), ('JPN5','JPN','Selección','F',0),
  ('JPN6','JPN','Selección','F',0), ('JPN7','JPN','Selección','F',0), ('JPN8','JPN','Selección','F',0), ('JPN9','JPN','Selección','F',0), ('JPN10','JPN','Selección','F',0),
  ('JPN11','JPN','Selección','F',0), ('JPN12','JPN','Selección','F',0), ('JPN13','JPN','Selección','F',0), ('JPN14','JPN','Selección','F',0), ('JPN15','JPN','Selección','F',0),
  ('JPN16','JPN','Selección','F',0), ('JPN17','JPN','Selección','F',0), ('JPN18','JPN','Selección','F',0), ('JPN19','JPN','Selección','F',0), ('JPN20','JPN','Selección','F',0),
  -- SWE — Suecia
  ('SWE1','SWE','Selección','F',0), ('SWE2','SWE','Selección','F',0), ('SWE3','SWE','Selección','F',0), ('SWE4','SWE','Selección','F',0), ('SWE5','SWE','Selección','F',0),
  ('SWE6','SWE','Selección','F',0), ('SWE7','SWE','Selección','F',0), ('SWE8','SWE','Selección','F',0), ('SWE9','SWE','Selección','F',0), ('SWE10','SWE','Selección','F',0),
  ('SWE11','SWE','Selección','F',0), ('SWE12','SWE','Selección','F',0), ('SWE13','SWE','Selección','F',0), ('SWE14','SWE','Selección','F',0), ('SWE15','SWE','Selección','F',0),
  ('SWE16','SWE','Selección','F',0), ('SWE17','SWE','Selección','F',0), ('SWE18','SWE','Selección','F',0), ('SWE19','SWE','Selección','F',0), ('SWE20','SWE','Selección','F',0),
  -- TUN — Túnez
  ('TUN1','TUN','Selección','F',0), ('TUN2','TUN','Selección','F',0), ('TUN3','TUN','Selección','F',0), ('TUN4','TUN','Selección','F',0), ('TUN5','TUN','Selección','F',0),
  ('TUN6','TUN','Selección','F',0), ('TUN7','TUN','Selección','F',0), ('TUN8','TUN','Selección','F',0), ('TUN9','TUN','Selección','F',0), ('TUN10','TUN','Selección','F',0),
  ('TUN11','TUN','Selección','F',0), ('TUN12','TUN','Selección','F',0), ('TUN13','TUN','Selección','F',0), ('TUN14','TUN','Selección','F',0), ('TUN15','TUN','Selección','F',0),
  ('TUN16','TUN','Selección','F',0), ('TUN17','TUN','Selección','F',0), ('TUN18','TUN','Selección','F',0), ('TUN19','TUN','Selección','F',0), ('TUN20','TUN','Selección','F',0),
  -- BEL — Bélgica
  ('BEL1','BEL','Selección','F',0), ('BEL2','BEL','Selección','F',0), ('BEL3','BEL','Selección','F',0), ('BEL4','BEL','Selección','F',0), ('BEL5','BEL','Selección','F',0),
  ('BEL6','BEL','Selección','F',0), ('BEL7','BEL','Selección','F',0), ('BEL8','BEL','Selección','F',0), ('BEL9','BEL','Selección','F',0), ('BEL10','BEL','Selección','F',0),
  ('BEL11','BEL','Selección','F',0), ('BEL12','BEL','Selección','F',0), ('BEL13','BEL','Selección','F',0), ('BEL14','BEL','Selección','F',0), ('BEL15','BEL','Selección','F',0),
  ('BEL16','BEL','Selección','F',0), ('BEL17','BEL','Selección','F',0), ('BEL18','BEL','Selección','F',0), ('BEL19','BEL','Selección','F',0), ('BEL20','BEL','Selección','F',0),
  -- EGY — Egipto
  ('EGY1','EGY','Selección','F',0), ('EGY2','EGY','Selección','F',0), ('EGY3','EGY','Selección','F',0), ('EGY4','EGY','Selección','F',0), ('EGY5','EGY','Selección','F',0),
  ('EGY6','EGY','Selección','F',0), ('EGY7','EGY','Selección','F',0), ('EGY8','EGY','Selección','F',0), ('EGY9','EGY','Selección','F',0), ('EGY10','EGY','Selección','F',0),
  ('EGY11','EGY','Selección','F',0), ('EGY12','EGY','Selección','F',0), ('EGY13','EGY','Selección','F',0), ('EGY14','EGY','Selección','F',0), ('EGY15','EGY','Selección','F',0),
  ('EGY16','EGY','Selección','F',0), ('EGY17','EGY','Selección','F',0), ('EGY18','EGY','Selección','F',0), ('EGY19','EGY','Selección','F',0), ('EGY20','EGY','Selección','F',0),
  -- IRN — Irán
  ('IRN1','IRN','Selección','F',0), ('IRN2','IRN','Selección','F',0), ('IRN3','IRN','Selección','F',0), ('IRN4','IRN','Selección','F',0), ('IRN5','IRN','Selección','F',0),
  ('IRN6','IRN','Selección','F',0), ('IRN7','IRN','Selección','F',0), ('IRN8','IRN','Selección','F',0), ('IRN9','IRN','Selección','F',0), ('IRN10','IRN','Selección','F',0),
  ('IRN11','IRN','Selección','F',0), ('IRN12','IRN','Selección','F',0), ('IRN13','IRN','Selección','F',0), ('IRN14','IRN','Selección','F',0), ('IRN15','IRN','Selección','F',0),
  ('IRN16','IRN','Selección','F',0), ('IRN17','IRN','Selección','F',0), ('IRN18','IRN','Selección','F',0), ('IRN19','IRN','Selección','F',0), ('IRN20','IRN','Selección','F',0),
  -- NZL — Nueva Zelanda
  ('NZL1','NZL','Selección','F',0), ('NZL2','NZL','Selección','F',0), ('NZL3','NZL','Selección','F',0), ('NZL4','NZL','Selección','F',0), ('NZL5','NZL','Selección','F',0),
  ('NZL6','NZL','Selección','F',0), ('NZL7','NZL','Selección','F',0), ('NZL8','NZL','Selección','F',0), ('NZL9','NZL','Selección','F',0), ('NZL10','NZL','Selección','F',0),
  ('NZL11','NZL','Selección','F',0), ('NZL12','NZL','Selección','F',0), ('NZL13','NZL','Selección','F',0), ('NZL14','NZL','Selección','F',0), ('NZL15','NZL','Selección','F',0),
  ('NZL16','NZL','Selección','F',0), ('NZL17','NZL','Selección','F',0), ('NZL18','NZL','Selección','F',0), ('NZL19','NZL','Selección','F',0), ('NZL20','NZL','Selección','F',0),
  -- ESP — España
  ('ESP1','ESP','Selección','F',0), ('ESP2','ESP','Selección','F',0), ('ESP3','ESP','Selección','F',0), ('ESP4','ESP','Selección','F',0), ('ESP5','ESP','Selección','F',0),
  ('ESP6','ESP','Selección','F',0), ('ESP7','ESP','Selección','F',0), ('ESP8','ESP','Selección','F',0), ('ESP9','ESP','Selección','F',0), ('ESP10','ESP','Selección','F',0),
  ('ESP11','ESP','Selección','F',0), ('ESP12','ESP','Selección','F',0), ('ESP13','ESP','Selección','F',0), ('ESP14','ESP','Selección','F',0), ('ESP15','ESP','Selección','F',0),
  ('ESP16','ESP','Selección','F',0), ('ESP17','ESP','Selección','F',0), ('ESP18','ESP','Selección','F',0), ('ESP19','ESP','Selección','F',0), ('ESP20','ESP','Selección','F',0),
  -- CPV — Cabo Verde
  ('CPV1','CPV','Selección','F',0), ('CPV2','CPV','Selección','F',0), ('CPV3','CPV','Selección','F',0), ('CPV4','CPV','Selección','F',0), ('CPV5','CPV','Selección','F',0),
  ('CPV6','CPV','Selección','F',0), ('CPV7','CPV','Selección','F',0), ('CPV8','CPV','Selección','F',0), ('CPV9','CPV','Selección','F',0), ('CPV10','CPV','Selección','F',0),
  ('CPV11','CPV','Selección','F',0), ('CPV12','CPV','Selección','F',0), ('CPV13','CPV','Selección','F',0), ('CPV14','CPV','Selección','F',0), ('CPV15','CPV','Selección','F',0),
  ('CPV16','CPV','Selección','F',0), ('CPV17','CPV','Selección','F',0), ('CPV18','CPV','Selección','F',0), ('CPV19','CPV','Selección','F',0), ('CPV20','CPV','Selección','F',0),
  -- KSA — Arabia Saudita
  ('KSA1','KSA','Selección','F',0), ('KSA2','KSA','Selección','F',0), ('KSA3','KSA','Selección','F',0), ('KSA4','KSA','Selección','F',0), ('KSA5','KSA','Selección','F',0),
  ('KSA6','KSA','Selección','F',0), ('KSA7','KSA','Selección','F',0), ('KSA8','KSA','Selección','F',0), ('KSA9','KSA','Selección','F',0), ('KSA10','KSA','Selección','F',0),
  ('KSA11','KSA','Selección','F',0), ('KSA12','KSA','Selección','F',0), ('KSA13','KSA','Selección','F',0), ('KSA14','KSA','Selección','F',0), ('KSA15','KSA','Selección','F',0),
  ('KSA16','KSA','Selección','F',0), ('KSA17','KSA','Selección','F',0), ('KSA18','KSA','Selección','F',0), ('KSA19','KSA','Selección','F',0), ('KSA20','KSA','Selección','F',0),
  -- URU — Uruguay
  ('URU1','URU','Selección','F',0), ('URU2','URU','Selección','F',0), ('URU3','URU','Selección','F',0), ('URU4','URU','Selección','F',0), ('URU5','URU','Selección','F',0),
  ('URU6','URU','Selección','F',0), ('URU7','URU','Selección','F',0), ('URU8','URU','Selección','F',0), ('URU9','URU','Selección','F',0), ('URU10','URU','Selección','F',0),
  ('URU11','URU','Selección','F',0), ('URU12','URU','Selección','F',0), ('URU13','URU','Selección','F',0), ('URU14','URU','Selección','F',0), ('URU15','URU','Selección','F',0),
  ('URU16','URU','Selección','F',0), ('URU17','URU','Selección','F',0), ('URU18','URU','Selección','F',0), ('URU19','URU','Selección','F',0), ('URU20','URU','Selección','F',0),
  -- FRA — Francia
  ('FRA1','FRA','Selección','F',0), ('FRA2','FRA','Selección','F',0), ('FRA3','FRA','Selección','F',0), ('FRA4','FRA','Selección','F',0), ('FRA5','FRA','Selección','F',0),
  ('FRA6','FRA','Selección','F',0), ('FRA7','FRA','Selección','F',0), ('FRA8','FRA','Selección','F',0), ('FRA9','FRA','Selección','F',0), ('FRA10','FRA','Selección','F',0),
  ('FRA11','FRA','Selección','F',0), ('FRA12','FRA','Selección','F',0), ('FRA13','FRA','Selección','F',0), ('FRA14','FRA','Selección','F',0), ('FRA15','FRA','Selección','F',0),
  ('FRA16','FRA','Selección','F',0), ('FRA17','FRA','Selección','F',0), ('FRA18','FRA','Selección','F',0), ('FRA19','FRA','Selección','F',0), ('FRA20','FRA','Selección','F',0),
  -- SEN — Senegal
  ('SEN1','SEN','Selección','F',0), ('SEN2','SEN','Selección','F',0), ('SEN3','SEN','Selección','F',0), ('SEN4','SEN','Selección','F',0), ('SEN5','SEN','Selección','F',0),
  ('SEN6','SEN','Selección','F',0), ('SEN7','SEN','Selección','F',0), ('SEN8','SEN','Selección','F',0), ('SEN9','SEN','Selección','F',0), ('SEN10','SEN','Selección','F',0),
  ('SEN11','SEN','Selección','F',0), ('SEN12','SEN','Selección','F',0), ('SEN13','SEN','Selección','F',0), ('SEN14','SEN','Selección','F',0), ('SEN15','SEN','Selección','F',0),
  ('SEN16','SEN','Selección','F',0), ('SEN17','SEN','Selección','F',0), ('SEN18','SEN','Selección','F',0), ('SEN19','SEN','Selección','F',0), ('SEN20','SEN','Selección','F',0),
  -- IRQ — Irak
  ('IRQ1','IRQ','Selección','F',0), ('IRQ2','IRQ','Selección','F',0), ('IRQ3','IRQ','Selección','F',0), ('IRQ4','IRQ','Selección','F',0), ('IRQ5','IRQ','Selección','F',0),
  ('IRQ6','IRQ','Selección','F',0), ('IRQ7','IRQ','Selección','F',0), ('IRQ8','IRQ','Selección','F',0), ('IRQ9','IRQ','Selección','F',0), ('IRQ10','IRQ','Selección','F',0),
  ('IRQ11','IRQ','Selección','F',0), ('IRQ12','IRQ','Selección','F',0), ('IRQ13','IRQ','Selección','F',0), ('IRQ14','IRQ','Selección','F',0), ('IRQ15','IRQ','Selección','F',0),
  ('IRQ16','IRQ','Selección','F',0), ('IRQ17','IRQ','Selección','F',0), ('IRQ18','IRQ','Selección','F',0), ('IRQ19','IRQ','Selección','F',0), ('IRQ20','IRQ','Selección','F',0),
  -- NOR — Noruega
  ('NOR1','NOR','Selección','F',0), ('NOR2','NOR','Selección','F',0), ('NOR3','NOR','Selección','F',0), ('NOR4','NOR','Selección','F',0), ('NOR5','NOR','Selección','F',0),
  ('NOR6','NOR','Selección','F',0), ('NOR7','NOR','Selección','F',0), ('NOR8','NOR','Selección','F',0), ('NOR9','NOR','Selección','F',0), ('NOR10','NOR','Selección','F',0),
  ('NOR11','NOR','Selección','F',0), ('NOR12','NOR','Selección','F',0), ('NOR13','NOR','Selección','F',0), ('NOR14','NOR','Selección','F',0), ('NOR15','NOR','Selección','F',0),
  ('NOR16','NOR','Selección','F',0), ('NOR17','NOR','Selección','F',0), ('NOR18','NOR','Selección','F',0), ('NOR19','NOR','Selección','F',0), ('NOR20','NOR','Selección','F',0),
  -- ARG — Argentina
  ('ARG1','ARG','Selección','F',0), ('ARG2','ARG','Selección','F',0), ('ARG3','ARG','Selección','F',0), ('ARG4','ARG','Selección','F',0), ('ARG5','ARG','Selección','F',0),
  ('ARG6','ARG','Selección','F',0), ('ARG7','ARG','Selección','F',0), ('ARG8','ARG','Selección','F',0), ('ARG9','ARG','Selección','F',0), ('ARG10','ARG','Selección','F',0),
  ('ARG11','ARG','Selección','F',0), ('ARG12','ARG','Selección','F',0), ('ARG13','ARG','Selección','F',0), ('ARG14','ARG','Selección','F',0), ('ARG15','ARG','Selección','F',0),
  ('ARG16','ARG','Selección','F',0), ('ARG17','ARG','Selección','F',0), ('ARG18','ARG','Selección','F',0), ('ARG19','ARG','Selección','F',0), ('ARG20','ARG','Selección','F',0),
  -- ALG — Argelia
  ('ALG1','ALG','Selección','F',0), ('ALG2','ALG','Selección','F',0), ('ALG3','ALG','Selección','F',0), ('ALG4','ALG','Selección','F',0), ('ALG5','ALG','Selección','F',0),
  ('ALG6','ALG','Selección','F',0), ('ALG7','ALG','Selección','F',0), ('ALG8','ALG','Selección','F',0), ('ALG9','ALG','Selección','F',0), ('ALG10','ALG','Selección','F',0),
  ('ALG11','ALG','Selección','F',0), ('ALG12','ALG','Selección','F',0), ('ALG13','ALG','Selección','F',0), ('ALG14','ALG','Selección','F',0), ('ALG15','ALG','Selección','F',0),
  ('ALG16','ALG','Selección','F',0), ('ALG17','ALG','Selección','F',0), ('ALG18','ALG','Selección','F',0), ('ALG19','ALG','Selección','F',0), ('ALG20','ALG','Selección','F',0),
  -- AUT — Austria
  ('AUT1','AUT','Selección','F',0), ('AUT2','AUT','Selección','F',0), ('AUT3','AUT','Selección','F',0), ('AUT4','AUT','Selección','F',0), ('AUT5','AUT','Selección','F',0),
  ('AUT6','AUT','Selección','F',0), ('AUT7','AUT','Selección','F',0), ('AUT8','AUT','Selección','F',0), ('AUT9','AUT','Selección','F',0), ('AUT10','AUT','Selección','F',0),
  ('AUT11','AUT','Selección','F',0), ('AUT12','AUT','Selección','F',0), ('AUT13','AUT','Selección','F',0), ('AUT14','AUT','Selección','F',0), ('AUT15','AUT','Selección','F',0),
  ('AUT16','AUT','Selección','F',0), ('AUT17','AUT','Selección','F',0), ('AUT18','AUT','Selección','F',0), ('AUT19','AUT','Selección','F',0), ('AUT20','AUT','Selección','F',0),
  -- JOR — Jordania
  ('JOR1','JOR','Selección','F',0), ('JOR2','JOR','Selección','F',0), ('JOR3','JOR','Selección','F',0), ('JOR4','JOR','Selección','F',0), ('JOR5','JOR','Selección','F',0),
  ('JOR6','JOR','Selección','F',0), ('JOR7','JOR','Selección','F',0), ('JOR8','JOR','Selección','F',0), ('JOR9','JOR','Selección','F',0), ('JOR10','JOR','Selección','F',0),
  ('JOR11','JOR','Selección','F',0), ('JOR12','JOR','Selección','F',0), ('JOR13','JOR','Selección','F',0), ('JOR14','JOR','Selección','F',0), ('JOR15','JOR','Selección','F',0),
  ('JOR16','JOR','Selección','F',0), ('JOR17','JOR','Selección','F',0), ('JOR18','JOR','Selección','F',0), ('JOR19','JOR','Selección','F',0), ('JOR20','JOR','Selección','F',0),
  -- POR — Portugal
  ('POR1','POR','Selección','F',0), ('POR2','POR','Selección','F',0), ('POR3','POR','Selección','F',0), ('POR4','POR','Selección','F',0), ('POR5','POR','Selección','F',0),
  ('POR6','POR','Selección','F',0), ('POR7','POR','Selección','F',0), ('POR8','POR','Selección','F',0), ('POR9','POR','Selección','F',0), ('POR10','POR','Selección','F',0),
  ('POR11','POR','Selección','F',0), ('POR12','POR','Selección','F',0), ('POR13','POR','Selección','F',0), ('POR14','POR','Selección','F',0), ('POR15','POR','Selección','F',0),
  ('POR16','POR','Selección','F',0), ('POR17','POR','Selección','F',0), ('POR18','POR','Selección','F',0), ('POR19','POR','Selección','F',0), ('POR20','POR','Selección','F',0),
  -- COD — Rep. Democrática del Congo
  ('COD1','COD','Selección','F',0), ('COD2','COD','Selección','F',0), ('COD3','COD','Selección','F',0), ('COD4','COD','Selección','F',0), ('COD5','COD','Selección','F',0),
  ('COD6','COD','Selección','F',0), ('COD7','COD','Selección','F',0), ('COD8','COD','Selección','F',0), ('COD9','COD','Selección','F',0), ('COD10','COD','Selección','F',0),
  ('COD11','COD','Selección','F',0), ('COD12','COD','Selección','F',0), ('COD13','COD','Selección','F',0), ('COD14','COD','Selección','F',0), ('COD15','COD','Selección','F',0),
  ('COD16','COD','Selección','F',0), ('COD17','COD','Selección','F',0), ('COD18','COD','Selección','F',0), ('COD19','COD','Selección','F',0), ('COD20','COD','Selección','F',0),
  -- UZB — Uzbekistán
  ('UZB1','UZB','Selección','F',0), ('UZB2','UZB','Selección','F',0), ('UZB3','UZB','Selección','F',0), ('UZB4','UZB','Selección','F',0), ('UZB5','UZB','Selección','F',0),
  ('UZB6','UZB','Selección','F',0), ('UZB7','UZB','Selección','F',0), ('UZB8','UZB','Selección','F',0), ('UZB9','UZB','Selección','F',0), ('UZB10','UZB','Selección','F',0),
  ('UZB11','UZB','Selección','F',0), ('UZB12','UZB','Selección','F',0), ('UZB13','UZB','Selección','F',0), ('UZB14','UZB','Selección','F',0), ('UZB15','UZB','Selección','F',0),
  ('UZB16','UZB','Selección','F',0), ('UZB17','UZB','Selección','F',0), ('UZB18','UZB','Selección','F',0), ('UZB19','UZB','Selección','F',0), ('UZB20','UZB','Selección','F',0),
  -- COL — Colombia
  ('COL1','COL','Selección','F',0), ('COL2','COL','Selección','F',0), ('COL3','COL','Selección','F',0), ('COL4','COL','Selección','F',0), ('COL5','COL','Selección','F',0),
  ('COL6','COL','Selección','F',0), ('COL7','COL','Selección','F',0), ('COL8','COL','Selección','F',0), ('COL9','COL','Selección','F',0), ('COL10','COL','Selección','F',0),
  ('COL11','COL','Selección','F',0), ('COL12','COL','Selección','F',0), ('COL13','COL','Selección','F',0), ('COL14','COL','Selección','F',0), ('COL15','COL','Selección','F',0),
  ('COL16','COL','Selección','F',0), ('COL17','COL','Selección','F',0), ('COL18','COL','Selección','F',0), ('COL19','COL','Selección','F',0), ('COL20','COL','Selección','F',0),
  -- ENG — Inglaterra
  ('ENG1','ENG','Selección','F',0), ('ENG2','ENG','Selección','F',0), ('ENG3','ENG','Selección','F',0), ('ENG4','ENG','Selección','F',0), ('ENG5','ENG','Selección','F',0),
  ('ENG6','ENG','Selección','F',0), ('ENG7','ENG','Selección','F',0), ('ENG8','ENG','Selección','F',0), ('ENG9','ENG','Selección','F',0), ('ENG10','ENG','Selección','F',0),
  ('ENG11','ENG','Selección','F',0), ('ENG12','ENG','Selección','F',0), ('ENG13','ENG','Selección','F',0), ('ENG14','ENG','Selección','F',0), ('ENG15','ENG','Selección','F',0),
  ('ENG16','ENG','Selección','F',0), ('ENG17','ENG','Selección','F',0), ('ENG18','ENG','Selección','F',0), ('ENG19','ENG','Selección','F',0), ('ENG20','ENG','Selección','F',0),
  -- CRO — Croacia
  ('CRO1','CRO','Selección','F',0), ('CRO2','CRO','Selección','F',0), ('CRO3','CRO','Selección','F',0), ('CRO4','CRO','Selección','F',0), ('CRO5','CRO','Selección','F',0),
  ('CRO6','CRO','Selección','F',0), ('CRO7','CRO','Selección','F',0), ('CRO8','CRO','Selección','F',0), ('CRO9','CRO','Selección','F',0), ('CRO10','CRO','Selección','F',0),
  ('CRO11','CRO','Selección','F',0), ('CRO12','CRO','Selección','F',0), ('CRO13','CRO','Selección','F',0), ('CRO14','CRO','Selección','F',0), ('CRO15','CRO','Selección','F',0),
  ('CRO16','CRO','Selección','F',0), ('CRO17','CRO','Selección','F',0), ('CRO18','CRO','Selección','F',0), ('CRO19','CRO','Selección','F',0), ('CRO20','CRO','Selección','F',0),
  -- GHA — Ghana
  ('GHA1','GHA','Selección','F',0), ('GHA2','GHA','Selección','F',0), ('GHA3','GHA','Selección','F',0), ('GHA4','GHA','Selección','F',0), ('GHA5','GHA','Selección','F',0),
  ('GHA6','GHA','Selección','F',0), ('GHA7','GHA','Selección','F',0), ('GHA8','GHA','Selección','F',0), ('GHA9','GHA','Selección','F',0), ('GHA10','GHA','Selección','F',0),
  ('GHA11','GHA','Selección','F',0), ('GHA12','GHA','Selección','F',0), ('GHA13','GHA','Selección','F',0), ('GHA14','GHA','Selección','F',0), ('GHA15','GHA','Selección','F',0),
  ('GHA16','GHA','Selección','F',0), ('GHA17','GHA','Selección','F',0), ('GHA18','GHA','Selección','F',0), ('GHA19','GHA','Selección','F',0), ('GHA20','GHA','Selección','F',0),
  -- PAN — Panamá
  ('PAN1','PAN','Selección','F',0), ('PAN2','PAN','Selección','F',0), ('PAN3','PAN','Selección','F',0), ('PAN4','PAN','Selección','F',0), ('PAN5','PAN','Selección','F',0),
  ('PAN6','PAN','Selección','F',0), ('PAN7','PAN','Selección','F',0), ('PAN8','PAN','Selección','F',0), ('PAN9','PAN','Selección','F',0), ('PAN10','PAN','Selección','F',0),
  ('PAN11','PAN','Selección','F',0), ('PAN12','PAN','Selección','F',0), ('PAN13','PAN','Selección','F',0), ('PAN14','PAN','Selección','F',0), ('PAN15','PAN','Selección','F',0),
  ('PAN16','PAN','Selección','F',0), ('PAN17','PAN','Selección','F',0), ('PAN18','PAN','Selección','F',0), ('PAN19','PAN','Selección','F',0), ('PAN20','PAN','Selección','F',0)
ON CONFLICT (codigo) DO NOTHING;


-- -----------------------------------------------------------------------------
-- LÁMINAS CC — Coca-Cola Patrocinador (14 stickers: CC1–CC14)
-- -----------------------------------------------------------------------------
INSERT INTO public.stickers (codigo, equipo, tipo, estado, cantidad) VALUES
  ('CC1', 'CC', 'Patrocinador', 'F', 0),
  ('CC2', 'CC', 'Patrocinador', 'F', 0),
  ('CC3', 'CC', 'Patrocinador', 'F', 0),
  ('CC4', 'CC', 'Patrocinador', 'F', 0),
  ('CC5', 'CC', 'Patrocinador', 'F', 0),
  ('CC6', 'CC', 'Patrocinador', 'F', 0),
  ('CC7', 'CC', 'Patrocinador', 'F', 0),
  ('CC8', 'CC', 'Patrocinador', 'F', 0),
  ('CC9', 'CC', 'Patrocinador', 'F', 0),
  ('CC10','CC', 'Patrocinador', 'F', 0),
  ('CC11','CC', 'Patrocinador', 'F', 0),
  ('CC12','CC', 'Patrocinador', 'F', 0),
  ('CC13','CC', 'Patrocinador', 'F', 0),
  ('CC14','CC', 'Patrocinador', 'F', 0)
ON CONFLICT (codigo) DO NOTHING;


-- -----------------------------------------------------------------------------
-- VERIFICACIÓN: contar el total de stickers insertados (debe ser 994)
-- -----------------------------------------------------------------------------
-- Ejecutar esta query para validar después del seed:
-- SELECT COUNT(*) FROM public.stickers;  -- Esperado: 994
-- SELECT equipo, COUNT(*) FROM public.stickers GROUP BY equipo ORDER BY equipo;
