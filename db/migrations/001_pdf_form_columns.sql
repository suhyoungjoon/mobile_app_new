-- 점검결과 PDF 양식 반영: Flush-out/Bake-out, 레벨기 4 point ±10mm, 150mm 기준, 일련번호
-- 기존 DB에 적용 시 실행 (신규 설치 시 schema.sql 사용)

-- inspection_item: 일련번호
ALTER TABLE inspection_item ADD COLUMN IF NOT EXISTS serial_no TEXT;

-- air_measure: 공정 유형 (Flush-out / Bake-out)
ALTER TABLE air_measure ADD COLUMN IF NOT EXISTS process_type TEXT;
ALTER TABLE air_measure DROP CONSTRAINT IF EXISTS air_measure_process_type_check;
ALTER TABLE air_measure ADD CONSTRAINT air_measure_process_type_check
  CHECK (process_type IS NULL OR process_type IN ('flush_out','bake_out'));

-- level_measure: 4 point ±10mm, 기준 150mm
ALTER TABLE level_measure ADD COLUMN IF NOT EXISTS point1_left_mm DECIMAL(5,1);
ALTER TABLE level_measure ADD COLUMN IF NOT EXISTS point1_right_mm DECIMAL(5,1);
ALTER TABLE level_measure ADD COLUMN IF NOT EXISTS point2_left_mm DECIMAL(5,1);
ALTER TABLE level_measure ADD COLUMN IF NOT EXISTS point2_right_mm DECIMAL(5,1);
ALTER TABLE level_measure ADD COLUMN IF NOT EXISTS point3_left_mm DECIMAL(5,1);
ALTER TABLE level_measure ADD COLUMN IF NOT EXISTS point3_right_mm DECIMAL(5,1);
ALTER TABLE level_measure ADD COLUMN IF NOT EXISTS point4_left_mm DECIMAL(5,1);
ALTER TABLE level_measure ADD COLUMN IF NOT EXISTS point4_right_mm DECIMAL(5,1);
ALTER TABLE level_measure ADD COLUMN IF NOT EXISTS reference_mm DECIMAL(5,1) DEFAULT 150;
