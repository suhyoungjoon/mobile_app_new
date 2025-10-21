# Phase 1 완료: 데이터베이스 스키마 확장

## 📊 Phase 1 구현 내용

### ✅ 완료된 작업

#### 1. 데이터베이스 스키마 확장
- **기존 테이블 수정**:
  - `household` 테이블에 `user_type` 컬럼 추가 (resident/company/admin)
  - `case_header` 테이블의 `type` 제약조건 확장 (장비점검/종합점검 추가)

- **새로운 테이블 추가**:
  - `inspection_item`: 점검 항목 공통 테이블
  - `air_measure`: 공기질 측정값 (TVOC, HCHO, CO2)
  - `radon_measure`: 라돈 측정값 (단위 선택 가능)
  - `level_measure`: 레벨기 측정값 (좌/우 수치)
  - `thermal_photo`: 열화상 사진

#### 2. 인덱스 최적화
- 점검 항목별 인덱스 추가
- 케이스별, 타입별 조회 최적화
- 측정값 테이블별 외래키 인덱스

#### 3. 마이그레이션 스크립트
- `migrate-phase1.sql`: 기존 데이터베이스 업그레이드용
- `init-render-db.js`: Render 데이터베이스 초기화 업데이트
- 샘플 데이터 자동 삽입

### 🗄️ 새로운 데이터 모델

```sql
-- 점검 항목 공통 테이블
inspection_item (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES case_header(id),
  type TEXT CHECK (type IN ('thermal','air','radon','level')),
  location TEXT NOT NULL,
  trade TEXT,
  note TEXT,
  result TEXT CHECK (result IN ('normal','check','na')),
  created_at TIMESTAMP DEFAULT now()
)

-- 공기질 측정
air_measure (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  tvoc DECIMAL(5,2),        -- TVOC 농도
  hcho DECIMAL(5,2),        -- HCHO 농도
  co2 DECIMAL(5,2),         -- CO2 농도 (선택)
  unit_tvoc TEXT DEFAULT 'mg/m³',
  unit_hcho TEXT DEFAULT 'mg/m³',
  created_at TIMESTAMP DEFAULT now()
)

-- 라돈 측정
radon_measure (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  radon DECIMAL(8,2),       -- 라돈 농도
  unit_radon TEXT CHECK (unit_radon IN ('Bq/m³','pCi/L')),
  created_at TIMESTAMP DEFAULT now()
)

-- 레벨기 측정
level_measure (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  left_mm DECIMAL(5,1),     -- 좌측 수치
  right_mm DECIMAL(5,1),    -- 우측 수치
  created_at TIMESTAMP DEFAULT now()
)

-- 열화상 사진
thermal_photo (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  file_url TEXT NOT NULL,
  caption TEXT,
  shot_at TIMESTAMP DEFAULT now()
)
```

### 🔧 사용자 역할 확장

```sql
-- 사용자 타입 추가
household.user_type:
- 'resident': 입주자 (3일 계정)
- 'company': 회사/점검원 (장비점검 권한)
- 'admin': 관리자 (전체 권한)
```

### 📋 케이스 타입 확장

```sql
-- 케이스 타입 확장
case_header.type:
- '하자접수': 기존 하자 등록
- '추가접수': 기존 추가 하자 등록
- '장비점검': 새로운 장비점검 전용
- '종합점검': 하자 + 장비점검 통합
```

### 🎯 다음 단계 (Phase 2)

Phase 1에서 데이터베이스 기반이 완성되었으므로, 다음 Phase 2에서는:

1. **API 엔드포인트 개발**
   - `/api/inspections/thermal` - 열화상 등록
   - `/api/inspections/air` - 공기질 측정 등록
   - `/api/inspections/radon` - 라돈 측정 등록
   - `/api/inspections/level` - 레벨기 측정 등록

2. **입력 검증 로직**
   - TVOC/HCHO: 0-20 mg/m³, 소수점 2자리
   - 라돈: 0-5000, 단위 선택 가능
   - 레벨: -50~+50mm, 소수점 1자리

3. **파일 업로드 처리**
   - 열화상 이미지 업로드
   - 이미지 압축 및 썸네일 생성

### 📊 테스트 데이터

샘플 데이터가 자동으로 삽입됩니다:
- 공기질: TVOC=0.12, HCHO=0.03, CO2=450.0
- 라돈: 150.0 Bq/m³
- 위치: 거실, 침실
- 결과: 정상

### 🚀 배포 준비

- ✅ 데이터베이스 스키마 완성
- ✅ 마이그레이션 스크립트 준비
- ✅ Render 데이터베이스 초기화 업데이트
- ✅ 샘플 데이터 자동 삽입

**Phase 1 완료!** 이제 API 개발을 위한 데이터베이스 기반이 완성되었습니다.
