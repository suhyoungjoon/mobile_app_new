# Render PostgreSQL 데이터베이스 업데이트 가이드

## 🚨 중요: Render DB는 아직 업데이트되지 않음

현재 상황:
- ✅ 로컬 코드: Phase 1 완료 (v2.3.0)
- ❌ Render DB: 기존 스키마 그대로
- ❌ 새 테이블: 아직 생성되지 않음

## 🔧 Render DB 업데이트 방법

### 방법 1: Render 웹 인터페이스 사용 (권장)

1. **Render 대시보드 접속**
   - https://dashboard.render.com
   - PostgreSQL 서비스 선택

2. **SQL 쿼리 실행**
   - "Query" 탭 클릭
   - 아래 SQL 스크립트 복사하여 실행

```sql
-- Phase 1 Migration: Equipment Inspection Tables
-- 실행일: 2025-10-21

-- 1. 기존 테이블 수정
-- household 테이블에 user_type 컬럼 추가
ALTER TABLE household 
ADD COLUMN user_type TEXT DEFAULT 'resident' 
CHECK (user_type IN ('resident','company','admin'));

-- case_header 테이블의 type 제약조건 확장
ALTER TABLE case_header DROP CONSTRAINT case_header_type_check;
ALTER TABLE case_header 
ADD CONSTRAINT case_header_type_check 
CHECK (type IN ('하자접수','추가접수','장비점검','종합점검'));

-- 2. 새로운 테이블 생성
-- 점검 항목 공통 테이블
CREATE TABLE inspection_item (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES case_header(id),
  type TEXT CHECK (type IN ('thermal','air','radon','level')),
  location TEXT NOT NULL,
  trade TEXT,
  note TEXT,
  result TEXT CHECK (result IN ('normal','check','na')),
  created_at TIMESTAMP DEFAULT now()
);

-- 공기질 측정 테이블
CREATE TABLE air_measure (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  tvoc DECIMAL(5,2),
  hcho DECIMAL(5,2),
  co2 DECIMAL(5,2),
  unit_tvoc TEXT DEFAULT 'mg/m³',
  unit_hcho TEXT DEFAULT 'mg/m³',
  created_at TIMESTAMP DEFAULT now()
);

-- 라돈 측정 테이블
CREATE TABLE radon_measure (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  radon DECIMAL(8,2),
  unit_radon TEXT CHECK (unit_radon IN ('Bq/m³','pCi/L')),
  created_at TIMESTAMP DEFAULT now()
);

-- 레벨기 측정 테이블
CREATE TABLE level_measure (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  left_mm DECIMAL(5,1),
  right_mm DECIMAL(5,1),
  created_at TIMESTAMP DEFAULT now()
);

-- 열화상 사진 테이블
CREATE TABLE thermal_photo (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  file_url TEXT NOT NULL,
  caption TEXT,
  shot_at TIMESTAMP DEFAULT now()
);

-- 3. 인덱스 생성
CREATE INDEX idx_inspection_case ON inspection_item(case_id);
CREATE INDEX idx_inspection_type ON inspection_item(type);
CREATE INDEX idx_air_measure_item ON air_measure(item_id);
CREATE INDEX idx_radon_measure_item ON radon_measure(item_id);
CREATE INDEX idx_level_measure_item ON level_measure(item_id);
CREATE INDEX idx_thermal_photo_item ON thermal_photo(item_id);

-- 4. 샘플 데이터 삽입
-- 샘플 케이스 생성 (장비점검 타입)
INSERT INTO case_header (id, household_id, type) 
VALUES ('equipment-sample-001', (SELECT id FROM household LIMIT 1), '장비점검')
ON CONFLICT DO NOTHING;

-- 샘플 공기질 측정 데이터
INSERT INTO inspection_item (id, case_id, type, location, trade, note, result)
VALUES ('air-sample-001', 'equipment-sample-001', 'air', '거실', '마감', '공기질 측정 완료', 'normal')
ON CONFLICT DO NOTHING;

INSERT INTO air_measure (item_id, tvoc, hcho, co2)
VALUES ('air-sample-001', 0.12, 0.03, 450.0)
ON CONFLICT DO NOTHING;

-- 샘플 라돈 측정 데이터
INSERT INTO inspection_item (id, case_id, type, location, trade, note, result)
VALUES ('radon-sample-001', 'equipment-sample-001', 'radon', '침실', '마감', '라돈 측정 완료', 'normal')
ON CONFLICT DO NOTHING;

INSERT INTO radon_measure (item_id, radon, unit_radon)
VALUES ('radon-sample-001', 150.0, 'Bq/m³')
ON CONFLICT DO NOTHING;
```

### 방법 2: 로컬에서 연결 시도

환경 변수 설정 후 다시 시도:

```bash
# Render DB 연결 정보 확인
# Render 대시보드 → PostgreSQL → Connect → External Connection
# DATABASE_URL 복사 후 실행

export DATABASE_URL="postgresql://insighti_db_user:비밀번호@dpg-d3jle0ndiees73ckef60-a.singapore-postgres.render.com:5432/insighti_db"

cd backend
node scripts/init-render-db.js
```

## ✅ 업데이트 완료 확인

업데이트 후 다음 쿼리로 확인:

```sql
-- 새 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('inspection_item', 'air_measure', 'radon_measure', 'level_measure', 'thermal_photo')
ORDER BY table_name;

-- 샘플 데이터 확인
SELECT * FROM inspection_item WHERE id LIKE '%-sample-%';
SELECT * FROM air_measure;
SELECT * FROM radon_measure;
```

## 🎯 다음 단계

Render DB 업데이트 완료 후:
1. ✅ Phase 2: API 엔드포인트 개발 시작 가능
2. ✅ 장비점검 기능 테스트 가능
3. ✅ 종합 보고서 생성 가능

**권장사항**: 방법 1 (Render 웹 인터페이스)을 사용하여 안전하게 업데이트하세요.
