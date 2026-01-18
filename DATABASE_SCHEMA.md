# 데이터베이스 스키마 문서

이 문서는 InsightI Pre/Post Inspection 프로젝트의 데이터베이스 테이블 구조를 정리한 것입니다.

---

## 📋 목차

1. [핵심 테이블](#1-핵심-테이블)
2. [하자 관리 테이블](#2-하자-관리-테이블)
3. [점검 장비 테이블](#3-점검-장비-테이블)
4. [관리자 테이블](#4-관리자-테이블)
5. [점검원 관리 테이블](#5-점검원-관리-테이블)
6. [인덱스 목록](#6-인덱스-목록)

---

## 1. 핵심 테이블

### `complex` - 단지/아파트 정보
```sql
CREATE TABLE complex (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT
);
```

**컬럼 설명:**
- `id`: 단지 고유 ID (자동 증가)
- `name`: 단지명 (예: "서울 인싸이트자이")
- `address`: 단지 주소

---

### `household` - 세대 정보
```sql
CREATE TABLE household (
  id SERIAL PRIMARY KEY,
  complex_id INTEGER REFERENCES complex(id),
  dong TEXT NOT NULL,
  ho TEXT NOT NULL,
  resident_name TEXT,
  resident_name_encrypted TEXT,  -- 암호화된 이름 (추가됨)
  phone TEXT,
  phone_encrypted TEXT,           -- 암호화된 전화번호 (추가됨)
  user_type TEXT DEFAULT 'resident' CHECK (user_type IN ('resident','company','admin')),
  created_at TIMESTAMP DEFAULT now(),
  last_login TIMESTAMP
);
```

**컬럼 설명:**
- `id`: 세대 고유 ID (자동 증가)
- `complex_id`: 단지 ID (외래키 → `complex.id`)
- `dong`: 동 번호
- `ho`: 호수
- `resident_name`: 세대주 이름 (평문)
- `resident_name_encrypted`: 세대주 이름 (암호화)
- `phone`: 전화번호 (평문)
- `phone_encrypted`: 전화번호 (암호화)
- `user_type`: 사용자 유형 ('resident', 'company', 'admin')
- `created_at`: 생성 일시
- `last_login`: 최종 로그인 일시

**참고:** 암호화 필드는 개인정보 보호를 위해 추가됨. 점검원은 `user_type='admin'` 및 `complex.name='admin'`인 세대 사용.

---

### `case_header` - 케이스 헤더 (하자접수/점검)
```sql
CREATE TABLE case_header (
  id TEXT PRIMARY KEY,
  household_id INTEGER REFERENCES household(id),
  type TEXT CHECK (type IN ('하자접수','추가접수','장비점검','종합점검')),
  created_at TIMESTAMP DEFAULT now()
);
```

**컬럼 설명:**
- `id`: 케이스 ID (예: "CASE-12345678")
- `household_id`: 세대 ID (외래키 → `household.id`)
- `type`: 케이스 유형
  - `하자접수`: 일반 하자 접수
  - `추가접수`: 추가 하자 접수
  - `장비점검`: 장비 점검
  - `종합점검`: 종합 점검
- `created_at`: 생성 일시

---

## 2. 하자 관리 테이블

### `defect` - 하자 정보
```sql
CREATE TABLE defect (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES case_header(id),
  location TEXT,
  trade TEXT,
  content TEXT,
  memo TEXT,
  photo_near TEXT,     -- 레거시 필드 (사용 안 함)
  photo_far TEXT,      -- 레거시 필드 (사용 안 함)
  created_at TIMESTAMP DEFAULT now()
);
```

**컬럼 설명:**
- `id`: 하자 ID (예: "DEF-1234567890123-456")
- `case_id`: 케이스 ID (외래키 → `case_header.id`)
- `location`: 위치 (예: "거실", "침실")
- `trade`: 세부공정 (예: "마감", "바닥재")
- `content`: 하자 내용
- `memo`: 메모
- `photo_near`, `photo_far`: 레거시 필드 (현재는 `photo` 테이블 사용)
- `created_at`: 생성 일시

---

### `photo` - 하자 사진
```sql
CREATE TABLE photo (
  id TEXT PRIMARY KEY,
  defect_id TEXT REFERENCES defect(id),
  kind TEXT CHECK (kind IN ('near','far')),
  url TEXT,
  thumb_url TEXT,
  taken_at TIMESTAMP
);
```

**컬럼 설명:**
- `id`: 사진 ID (예: "PHOTO-1234567890123-456")
- `defect_id`: 하자 ID (외래키 → `defect.id`)
- `kind`: 사진 종류 ('near': 근접, 'far': 원거리)
- `url`: 사진 URL (예: "/uploads/filename.jpg")
- `thumb_url`: 썸네일 URL
- `taken_at`: 촬영 일시

---

### `defect_resolution` - 하자 해결 정보
```sql
CREATE TABLE defect_resolution (
  id SERIAL PRIMARY KEY,
  defect_id TEXT REFERENCES defect(id),
  admin_user_id INTEGER REFERENCES admin_user(id),
  memo TEXT,
  contractor TEXT,
  worker TEXT,
  cost INTEGER,
  resolution_photos TEXT[],  -- 해결 사진 배열
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**컬럼 설명:**
- `id`: 해결 정보 ID (자동 증가)
- `defect_id`: 하자 ID (외래키 → `defect.id`)
- `admin_user_id`: 관리자 ID (외래키 → `admin_user.id`)
- `memo`: 메모
- `contractor`: 시공사
- `worker`: 작업자
- `cost`: 비용
- `resolution_photos`: 해결 사진 파일명 배열
- `created_at`: 생성 일시
- `updated_at`: 수정 일시

---

## 3. 점검 장비 테이블

### `inspection_item` - 점검 항목 공통 테이블
```sql
CREATE TABLE inspection_item (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES case_header(id),
  defect_id TEXT,              -- 하자 ID (점검원용, 추가됨)
  type TEXT CHECK (type IN ('thermal','air','radon','level')),
  location TEXT NOT NULL,
  trade TEXT,
  note TEXT,
  result TEXT CHECK (result IN ('normal','check','na')),
  created_at TIMESTAMP DEFAULT now()
);
```

**컬럼 설명:**
- `id`: 점검 항목 ID (UUID)
- `case_id`: 케이스 ID (외래키 → `case_header.id`)
- `defect_id`: 하자 ID (점검원이 특정 하자에 대한 점검 입력 시 사용, NULL 가능)
- `type`: 점검 유형
  - `thermal`: 열화상
  - `air`: 공기질
  - `radon`: 라돈
  - `level`: 레벨기
- `location`: 위치
- `trade`: 공정
- `note`: 메모/점검내용
- `result`: 결과 ('normal': 정상, 'check': 확인요망, 'na': 해당없음)
- `created_at`: 생성 일시

---

### `air_measure` - 공기질 측정값
```sql
CREATE TABLE air_measure (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  tvoc DECIMAL(5,2),           -- TVOC 농도
  hcho DECIMAL(5,2),           -- HCHO 농도
  co2 DECIMAL(5,2),            -- CO2 농도
  unit_tvoc TEXT DEFAULT 'mg/m³',
  unit_hcho TEXT DEFAULT 'mg/m³',
  created_at TIMESTAMP DEFAULT now()
);
```

**컬럼 설명:**
- `id`: 측정값 ID (자동 증가)
- `item_id`: 점검 항목 ID (외래키 → `inspection_item.id`)
- `tvoc`: TVOC 농도 (0-20, 소수점 2자리)
- `hcho`: HCHO 농도 (0-20, 소수점 2자리)
- `co2`: CO2 농도 (0-10000, ppm)
- `unit_tvoc`: TVOC 단위 (기본값: 'mg/m³')
- `unit_hcho`: HCHO 단위 (기본값: 'mg/m³')
- `created_at`: 생성 일시

---

### `radon_measure` - 라돈 측정값
```sql
CREATE TABLE radon_measure (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  radon DECIMAL(8,2),          -- 라돈 농도
  unit_radon TEXT CHECK (unit_radon IN ('Bq/m³','pCi/L')),
  created_at TIMESTAMP DEFAULT now()
);
```

**컬럼 설명:**
- `id`: 측정값 ID (자동 증가)
- `item_id`: 점검 항목 ID (외래키 → `inspection_item.id`)
- `radon`: 라돈 농도 (0-5000, 소수점 2자리)
- `unit_radon`: 라돈 단위 ('Bq/m³' 또는 'pCi/L')
- `created_at`: 생성 일시

---

### `level_measure` - 레벨기 측정값
```sql
CREATE TABLE level_measure (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  left_mm DECIMAL(5,1),        -- 좌측 수치 (mm)
  right_mm DECIMAL(5,1),       -- 우측 수치 (mm)
  created_at TIMESTAMP DEFAULT now()
);
```

**컬럼 설명:**
- `id`: 측정값 ID (자동 증가)
- `item_id`: 점검 항목 ID (외래키 → `inspection_item.id`)
- `left_mm`: 좌측 수치 (-50~+50, 소수점 1자리, mm)
- `right_mm`: 우측 수치 (-50~+50, 소수점 1자리, mm)
- `created_at`: 생성 일시

---

### `thermal_photo` - 열화상 사진 (및 측정값 사진)
```sql
CREATE TABLE thermal_photo (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  file_url TEXT NOT NULL,
  caption TEXT,
  shot_at TIMESTAMP DEFAULT now()
);
```

**컬럼 설명:**
- `id`: 사진 ID (UUID)
- `item_id`: 점검 항목 ID (외래키 → `inspection_item.id`)
- `file_url`: 파일 URL (예: "/uploads/filename.jpg")
- `caption`: 캡션/설명
- `shot_at`: 촬영 일시

**참고:** 이 테이블은 열화상 사진뿐만 아니라 공기질/라돈/레벨기 측정값의 사진도 저장하는 데 사용됨.

---

## 4. 관리자 테이블

### `admin_user` - 관리자 계정
```sql
CREATE TABLE admin_user (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  last_login TIMESTAMP
);
```

**컬럼 설명:**
- `id`: 관리자 ID (자동 증가)
- `email`: 이메일 (고유)
- `password_hash`: 비밀번호 해시
- `name`: 이름
- `role`: 역할 ('super_admin', 'admin')
- `is_active`: 활성화 여부
- `created_at`: 생성 일시
- `last_login`: 최종 로그인 일시

---

## 5. 점검원 관리 테이블

### `inspector_registration` - 점검원 등록 정보
```sql
CREATE TABLE inspector_registration (
  id SERIAL PRIMARY KEY,
  complex_id INTEGER REFERENCES complex(id),
  dong TEXT NOT NULL,
  ho TEXT NOT NULL,
  inspector_name TEXT NOT NULL,
  inspector_name_encrypted TEXT,  -- 암호화된 이름
  phone TEXT NOT NULL,
  phone_encrypted TEXT,            -- 암호화된 전화번호
  email TEXT,
  email_encrypted TEXT,            -- 암호화된 이메일
  company_name TEXT,
  license_number TEXT,
  registration_reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by INTEGER REFERENCES admin_user(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**컬럼 설명:**
- `id`: 등록 ID (자동 증가)
- `complex_id`: 단지 ID (외래키 → `complex.id`)
- `dong`, `ho`: 동-호수
- `inspector_name`: 점검원 이름 (평문)
- `inspector_name_encrypted`: 점검원 이름 (암호화)
- `phone`: 전화번호 (평문)
- `phone_encrypted`: 전화번호 (암호화)
- `email`: 이메일 (평문)
- `email_encrypted`: 이메일 (암호화)
- `company_name`: 회사명
- `license_number`: 자격증 번호
- `registration_reason`: 등록 사유
- `status`: 상태 ('pending': 대기, 'approved': 승인, 'rejected': 거절)
- `approved_by`: 승인한 관리자 ID (외래키 → `admin_user.id`)
- `approved_at`: 승인 일시
- `rejection_reason`: 거절 사유
- `created_at`: 생성 일시
- `updated_at`: 수정 일시

---

## 6. 인덱스 목록

### 핵심 테이블 인덱스
- `idx_household_complex`: `household(complex_id)`
- `idx_case_household`: `case_header(household_id)`
- `idx_defect_case`: `defect(case_id)`
- `idx_resolution_defect`: `defect_resolution(defect_id)`
- `idx_admin_email`: `admin_user(email)`

### 점검 장비 테이블 인덱스
- `idx_inspection_case`: `inspection_item(case_id)`
- `idx_inspection_type`: `inspection_item(type)`
- `idx_air_measure_item`: `air_measure(item_id)`
- `idx_radon_measure_item`: `radon_measure(item_id)`
- `idx_level_measure_item`: `level_measure(item_id)`
- `idx_thermal_photo_item`: `thermal_photo(item_id)`

### 점검원 관리 인덱스
- `idx_inspector_registration_status`: `inspector_registration(status)`
- `idx_inspector_registration_complex`: `inspector_registration(complex_id)`
- `idx_inspector_registration_created`: `inspector_registration(created_at)`

---

## 📊 테이블 관계도 (ERD 요약)

```
complex
  └── household (complex_id)
        ├── case_header (household_id)
        │     ├── defect (case_id)
        │     │     └── photo (defect_id)
        │     │     └── defect_resolution (defect_id)
        │     │
        │     └── inspection_item (case_id)
        │           ├── air_measure (item_id)
        │           ├── radon_measure (item_id)
        │           ├── level_measure (item_id)
        │           └── thermal_photo (item_id)
        │
        └── inspector_registration (complex_id)
              └── admin_user (approved_by)
```

---

## 🔑 주요 특징

1. **개인정보 암호화**: `household` 및 `inspector_registration` 테이블에 암호화 필드 추가
2. **점검원 지원**: `inspection_item` 테이블에 `defect_id` 추가로 하자별 점검 입력 가능
3. **다양한 측정값**: 공기질, 라돈, 레벨기, 열화상 측정값 별도 테이블로 관리
4. **사진 관리**: 하자 사진(`photo`)과 측정값 사진(`thermal_photo`) 분리
5. **인덱스 최적화**: 자주 조회하는 컬럼에 인덱스 추가

---

## 📝 참고사항

- 모든 테이블은 PostgreSQL 데이터베이스를 사용
- `id` 필드는 대부분 TEXT 타입으로 UUID 또는 타임스탬프 기반 ID 사용
- 타임스탬프 필드는 `TIMESTAMP DEFAULT now()` 사용
- 외래키 관계는 `ON DELETE CASCADE` 또는 제약조건으로 관리
- 암호화 필드는 선택적으로 사용 (평문 필드와 병행)
