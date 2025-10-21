# Phase 2 완료: API 엔드포인트 확장 및 사용자 권한 관리

## 🎉 Phase 2 구현 완료

### ✅ 완료된 작업

#### 1. 새로운 API 엔드포인트 추가
- **열화상 점검**: `/api/inspections/thermal`
- **공기질 측정**: `/api/inspections/air`
- **라돈 측정**: `/api/inspections/radon`
- **레벨기 측정**: `/api/inspections/level`
- **점검 항목 조회**: `/api/inspections/:caseId`
- **점검 항목 삭제**: `/api/inspections/:itemId`

#### 2. 입력 검증 로직 구현
- **공기질**: TVOC/HCHO (0-20 mg/m³, 소수점 2자리), CO2 (0-10000)
- **라돈**: 0-5000, 단위 선택 (Bq/m³, pCi/L)
- **레벨기**: 좌/우 수치 (-50~+50mm, 소수점 1자리)

#### 3. 사용자 권한 관리 시스템
- **역할 계층**: resident(1) < company(2) < admin(3)
- **권한 제어**: 장비점검은 회사 계정 이상만 접근 가능
- **미들웨어**: `requireEquipmentAccess`, `requireAdminAccess`

#### 4. 트랜잭션 처리
- 모든 측정값 등록 시 트랜잭션 사용
- 데이터 일관성 보장

## 🔐 사용자 유형별 URL 접근 권한

### 👤 입주자 (resident) - 기본 권한
```
✅ 접근 가능:
- /api/auth/session (로그인)
- /api/cases (케이스 조회/생성)
- /api/defects (하자 등록/조회/수정)
- /api/defect-categories (하자 카테고리 조회)
- /api/upload/photo (사진 업로드)
- /api/reports/preview (보고서 미리보기)
- /api/sms/send (SMS 발송)

❌ 접근 불가:
- /api/inspections/* (모든 장비점검 API)
- /api/admin/* (관리자 기능)
```

### 🏢 회사/점검원 (company) - 장비점검 권한
```
✅ 접근 가능 (입주자 권한 + 추가):
- /api/inspections/thermal (열화상 점검)
- /api/inspections/air (공기질 측정)
- /api/inspections/radon (라돈 측정)
- /api/inspections/level (레벨기 측정)
- /api/inspections/:caseId (점검 항목 조회)
- /api/inspections/:itemId (점검 항목 삭제)

❌ 접근 불가:
- /api/admin/* (관리자 기능)
```

### 👨‍💼 관리자 (admin) - 전체 권한
```
✅ 접근 가능 (모든 권한):
- 모든 입주자 권한
- 모든 회사 권한
- /api/admin/* (관리자 기능)
- 사용자 관리
- 시스템 설정
```

## 📊 API 엔드포인트 상세

### 열화상 점검
```http
POST /api/inspections/thermal
Authorization: Bearer {token}
Content-Type: application/json

{
  "caseId": "string",
  "location": "string",
  "trade": "string",
  "note": "string",
  "result": "normal|check|na"
}
```

### 공기질 측정
```http
POST /api/inspections/air
Authorization: Bearer {token}
Content-Type: application/json

{
  "caseId": "string",
  "location": "string",
  "trade": "string",
  "tvoc": 0.15,        // 0-20, 소수점 2자리
  "hcho": 0.05,        // 0-20, 소수점 2자리
  "co2": 500,          // 0-10000
  "note": "string",
  "result": "normal|check|na"
}
```

### 라돈 측정
```http
POST /api/inspections/radon
Authorization: Bearer {token}
Content-Type: application/json

{
  "caseId": "string",
  "location": "string",
  "trade": "string",
  "radon": 200.0,      // 0-5000, 소수점 2자리
  "unit_radon": "Bq/m³|pCi/L",
  "note": "string",
  "result": "normal|check|na"
}
```

### 레벨기 측정
```http
POST /api/inspections/level
Authorization: Bearer {token}
Content-Type: application/json

{
  "caseId": "string",
  "location": "string",
  "trade": "string",
  "left_mm": 2.5,      // -50~+50, 소수점 1자리
  "right_mm": -1.2,    // -50~+50, 소수점 1자리
  "note": "string",
  "result": "normal|check|na"
}
```

## 🔧 수정된 파일들

### 백엔드
- `backend/routes/inspections.js` - 새로 생성 (장비점검 API)
- `backend/routes/cases.js` - 케이스 타입 확장
- `backend/middleware/auth.js` - 권한 관리 미들웨어 추가
- `backend/server.js` - 새 라우트 등록

### 프론트엔드
- `webapp/js/api.js` - 장비점검 API 클라이언트 메서드 추가

### 테스트
- `backend/scripts/test-phase2-api.js` - API 테스트 스크립트

## 🚨 중요 수정사항

### 1. 케이스 생성 API 수정
```javascript
// 기존: ['하자접수', '추가접수']
// 수정: ['하자접수', '추가접수', '장비점검', '종합점검']
```

### 2. 권한 제어 적용
```javascript
// 장비점검 API는 회사 계정 이상만 접근 가능
router.post('/thermal', authenticateToken, requireEquipmentAccess, ...)
router.post('/air', authenticateToken, requireEquipmentAccess, ...)
router.post('/radon', authenticateToken, requireEquipmentAccess, ...)
router.post('/level', authenticateToken, requireEquipmentAccess, ...)
```

### 3. 입력 검증 강화
- 모든 측정값에 범위 및 소수점 자리수 검증
- 필수 필드 검증
- 단위 검증 (라돈)

## 🎯 다음 단계 (Phase 3)

Phase 2가 완료되었으므로, 다음 Phase 3에서는:

1. **UI 컴포넌트 개선**
   - 메인 대시보드 개선
   - 장비점검 탭 구조 구현
   - 입력 폼 및 검증 UI

2. **사용자 역할별 UI 제어**
   - 입주자: 하자 등록만 표시
   - 회사: 장비점검 탭 추가
   - 관리자: 전체 기능 표시

3. **입력 폼 최적화**
   - 실시간 검증
   - 사용자 친화적 인터페이스
   - 모바일 최적화

**Phase 2 완료!** 이제 장비점검 API가 완성되어 Phase 3 UI 개발을 시작할 수 있습니다.
