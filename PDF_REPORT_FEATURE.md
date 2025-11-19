# 📄 PDF 보고서 기능 정리

## 📋 개요

InsightI의 PDF 보고서 기능은 하자 접수 및 장비 점검 결과를 종합하여 PDF 형태의 보고서를 자동 생성하는 기능입니다.

**현재 버전**: v4.0.0  
**상태**: ✅ 구현 완료

---

## 🎯 주요 기능

### 1. 보고서 미리보기
- **기능**: 보고서 내용을 HTML로 미리 확인
- **데이터 포함**: 하자 목록, 장비 점검 결과 (열화상, 공기질, 라돈, 레벨기)
- **용도**: PDF 생성 전 내용 확인

### 2. PDF 생성
- **기능**: HTML 템플릿을 PDF로 변환
- **라이브러리**: `html-pdf` (경량화된 PDF 생성 라이브러리)
- **형식**: A4 용지, 여백 20mm
- **저장 위치**: `backend/reports/` 디렉토리

### 3. 보고서 발송
- **기능**: PDF 생성 후 SMS 알림 발송
- **연동**: SMS 서비스와 연동하여 보고서 링크 전송
- **푸시 알림**: 보고서 생성 완료 시 푸시 알림 발송 (선택사항)

---

## 🔌 API 엔드포인트

### 1. 보고서 미리보기
```http
GET /api/reports/preview
Authorization: Bearer {token}
```

**응답 예시:**
```json
{
  "html": "<html>...</html>",
  "case_id": 123,
  "defects_count": 5,
  "equipment_count": 8,
  "defects": [...],
  "equipment_data": {
    "air": [...],
    "radon": [...],
    "level": [...],
    "thermal": [...]
  }
}
```

**기능:**
- 최신 케이스의 하자 및 장비 점검 데이터 조회
- 종합 HTML 보고서 생성
- 하자 목록, 열화상, 공기질, 라돈, 레벨기 데이터 포함

---

### 2. PDF 생성
```http
POST /api/reports/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "case_id": 123,
  "template": "simple-report"  // 선택사항
}
```

**응답 예시:**
```json
{
  "message": "PDF generated successfully",
  "filename": "report-123-1699123456789.pdf",
  "url": "/reports/report-123-1699123456789.pdf",
  "size": 245678
}
```

**기능:**
- HTML 템플릿을 PDF로 변환
- 파일 시스템에 저장
- 파일명: `report-{case_id}-{timestamp}.pdf`

---

### 3. 보고서 발송
```http
POST /api/reports/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "case_id": 123
}
```

**응답 예시:**
```json
{
  "message": "Report generated and sent successfully",
  "filename": "report-123-1699123456789.pdf",
  "pdf_url": "/reports/report-123-1699123456789.pdf",
  "sent_to": "010-1234-5678",
  "size": 245678,
  "sms_sent": true,
  "sms_mock": false
}
```

**기능:**
- PDF 생성
- SMS 알림 발송 (보고서 링크 포함)
- 푸시 알림 발송 (선택사항)

---

## 🛠️ 백엔드 구현

### 파일 구조
```
backend/
├── routes/
│   └── reports.js              # 보고서 API 라우트
├── utils/
│   └── pdfGenerator.js          # PDF 생성 유틸리티
├── templates/
│   ├── simple-report.hbs        # 간단한 보고서 템플릿
│   ├── inspection-report.hbs    # 점검 보고서 템플릿
│   └── comprehensive-report.hbs # 종합 보고서 템플릿
└── reports/                     # 생성된 PDF 저장 디렉토리
```

### PDF 생성 유틸리티 (`pdfGenerator.js`)

**주요 메서드:**

1. **`generatePDF(templateName, data, options)`**
   - 범용 PDF 생성 메서드
   - 템플릿 이름, 데이터, 옵션을 받아 PDF 생성

2. **`generateSimpleReportPDF(caseData, defects, options)`**
   - 간단한 하자 보고서 생성
   - 템플릿: `simple-report.hbs`

3. **`generateReportPDF(caseData, defects, options)`**
   - 점검 보고서 생성
   - 템플릿: `inspection-report.hbs`

4. **`generateHTML(templateName, data)`**
   - HTML만 생성 (PDF 변환 없이)

5. **`listReports()`**
   - 생성된 보고서 목록 조회

6. **`deleteReport(filename)`**
   - 보고서 파일 삭제

**PDF 옵션:**
```javascript
{
  format: 'A4',                    // 용지 크기
  margin: {                        // 여백
    top: '20mm',
    right: '20mm',
    bottom: '20mm',
    left: '20mm'
  },
  quality: '75',                  // 품질 (0-100)
  renderDelay: 1000,              // 렌더링 대기 시간 (ms)
  timeout: 30000                   // 타임아웃 (ms)
}
```

### Handlebars 헬퍼 함수

**등록된 헬퍼:**
- `formatDate(date)`: 날짜 포맷팅 (한국어 형식)
- `formatNumber(num)`: 숫자 포맷팅 (천 단위 구분)
- `if_eq(a, b)`: 조건부 렌더링

---

## 📱 프론트엔드 구현

### 파일 위치
```
webapp/
├── js/
│   ├── api.js                    # API 클라이언트
│   └── app.js                    # 보고서 화면 로직
└── index.html                    # 보고서 미리보기 화면
```

### 주요 함수

#### 1. `onPreviewReport()`
```javascript
async function onPreviewReport() {
  // 보고서 미리보기 API 호출
  const reportData = await api.getReportPreview();
  
  // HTML 렌더링
  const cont = $('#report-preview');
  cont.innerHTML = reportData.html;
  
  // 보고서 화면으로 이동
  route('report');
}
```

**기능:**
- 보고서 미리보기 API 호출
- HTML 콘텐츠 렌더링
- 보고서 화면으로 전환

---

#### 2. `sendReportAsSMS()`
```javascript
async function sendReportAsSMS() {
  const caseId = AppState.currentCaseId;
  const phoneNumber = prompt('보고서를 받을 전화번호를 입력하세요');
  
  // 보고서 발송 API 호출
  await api.sendSMSReport(caseId, phoneNumber);
  
  toast('SMS로 보고서가 발송되었습니다', 'success');
}
```

**기능:**
- 전화번호 입력 받기
- 보고서 발송 API 호출
- 성공 메시지 표시

---

#### 3. `downloadReportAsPdf()` (TODO)
```javascript
function downloadReportAsPdf() {
  toast('PDF 다운로드 기능은 향후 구현 예정입니다', 'info');
  // TODO: PDF 생성 및 다운로드 기능 구현
}
```

**현재 상태:** 미구현  
**향후 계획:** PDF 생성 후 다운로드 링크 제공

---

### API 클라이언트 (`api.js`)

**메서드:**

1. **`getReportPreview()`**
   ```javascript
   async getReportPreview() {
     const response = await fetch(`${this.baseURL}/api/reports/preview`, {
       method: 'GET',
       headers: this.getHeaders()
     });
     return await response.json();
   }
   ```

2. **`generateReport(caseId, template)`**
   ```javascript
   async generateReport(caseId, template = 'simple-report') {
     const response = await fetch(`${this.baseURL}/api/reports/generate`, {
       method: 'POST',
       headers: this.getHeaders(),
       body: JSON.stringify({ case_id: caseId, template })
     });
     return await response.json();
   }
   ```

3. **`sendSMSReport(caseId, phoneNumber)`**
   ```javascript
   async sendSMSReport(caseId, phoneNumber) {
     const response = await fetch(`${this.baseURL}/api/reports/send`, {
       method: 'POST',
       headers: this.getHeaders(),
       body: JSON.stringify({ case_id: caseId })
     });
     return await response.json();
   }
   ```

---

## 📊 보고서 데이터 구조

### 하자 데이터
```javascript
{
  id: "DEF-1",
  location: "거실",
  trade: "바닥재",
  content: "마루판 들뜸",
  memo: "현장 특이사항",
  created_at: "2025-11-10T12:00:00Z",
  photos: [
    { kind: "near", url: "/uploads/photo1.jpg" },
    { kind: "far", url: "/uploads/photo2.jpg" }
  ]
}
```

### 장비 점검 데이터

#### 공기질 측정
```javascript
{
  type: "air",
  location: "거실",
  trade: "공기질",
  tvoc: 0.5,
  hcho: 0.08,
  co2: 450,
  unit_tvoc: "mg/m³",
  unit_hcho: "mg/m³",
  result: "normal",
  result_text: "정상",
  created_at: "2025-11-10T12:00:00Z"
}
```

#### 라돈 측정
```javascript
{
  type: "radon",
  location: "거실",
  trade: "라돈",
  radon: 50,
  unit: "Bq/m³",
  result: "normal",
  result_text: "정상",
  created_at: "2025-11-10T12:00:00Z"
}
```

#### 레벨기 측정
```javascript
{
  type: "level",
  location: "거실",
  trade: "레벨기",
  left_mm: 2.5,
  right_mm: 2.8,
  result: "check",
  result_text: "확인요망",
  created_at: "2025-11-10T12:00:00Z"
}
```

#### 열화상 점검
```javascript
{
  type: "thermal",
  location: "거실",
  trade: "열화상",
  photos: [
    { file_url: "/uploads/thermal1.jpg", caption: "벽면", shot_at: "2025-11-10T12:00:00Z" }
  ],
  result: "normal",
  result_text: "정상",
  created_at: "2025-11-10T12:00:00Z"
}
```

---

## 🎨 보고서 템플릿

### 1. Simple Report (`simple-report.hbs`)
- **용도**: 간단한 하자 보고서
- **포함 내용**: 하자 목록만
- **스타일**: 깔끔한 테이블 형식

### 2. Inspection Report (`inspection-report.hbs`)
- **용도**: 점검 보고서
- **포함 내용**: 하자 목록 + 기본 점검 정보
- **스타일**: 상세한 점검 정보 표시

### 3. Comprehensive Report (`comprehensive-report.hbs`)
- **용도**: 종합 보고서 (현재 사용 중)
- **포함 내용**: 
  - 하자 목록
  - 열화상 점검
  - 공기질 측정
  - 라돈 측정
  - 레벨기 측정
- **스타일**: 섹션별 구분, 상세 정보 표시

---

## 🔄 보고서 생성 플로우

```
1. 사용자가 "보고서 미리보기" 클릭
   ↓
2. GET /api/reports/preview 호출
   ↓
3. 데이터베이스에서 최신 케이스 조회
   - 하자 목록
   - 장비 점검 데이터 (열화상, 공기질, 라돈, 레벨기)
   ↓
4. Handlebars 템플릿으로 HTML 생성
   ↓
5. HTML을 프론트엔드에 반환
   ↓
6. 사용자가 "PDF 생성" 클릭 (또는 "SMS 발송")
   ↓
7. POST /api/reports/generate (또는 /send) 호출
   ↓
8. PDF 생성 (html-pdf)
   ↓
9. 파일 시스템에 저장
   ↓
10. SMS 알림 발송 (선택사항)
   ↓
11. 푸시 알림 발송 (선택사항)
```

---

## 📦 의존성

### 백엔드
```json
{
  "html-pdf": "^3.0.1",        // PDF 생성
  "handlebars": "^4.7.8",      // 템플릿 엔진
  "uuid": "^9.0.0"             // 고유 파일명 생성
}
```

### 프론트엔드
- Vanilla JavaScript (ES6+)
- Fetch API

---

## 🚀 사용 방법

### 1. 보고서 미리보기
```javascript
// 프론트엔드
const reportData = await api.getReportPreview();
$('#report-preview').innerHTML = reportData.html;
```

### 2. PDF 생성
```javascript
// 프론트엔드
const result = await api.generateReport(caseId, 'simple-report');
console.log('PDF URL:', result.url);
```

### 3. 보고서 발송
```javascript
// 프론트엔드
const result = await api.sendSMSReport(caseId, phoneNumber);
console.log('SMS 발송:', result.sms_sent);
```

---

## ⚙️ 설정

### PDF 옵션 변경
`backend/utils/pdfGenerator.js`의 `generatePDF` 메서드에서 옵션 수정:

```javascript
const pdfOptions = {
  format: 'A4',              // 용지 크기
  border: {
    top: '20mm',
    right: '20mm',
    bottom: '20mm',
    left: '20mm'
  },
  quality: '75',             // 품질 (0-100)
  renderDelay: 1000,         // 렌더링 대기 시간
  timeout: 30000             // 타임아웃
};
```

### 템플릿 수정
`backend/templates/` 디렉토리의 `.hbs` 파일 수정

---

## 🐛 알려진 이슈

### 1. PDF 다운로드 기능 미구현
- **상태**: TODO
- **위치**: `webapp/js/app.js`의 `downloadReportAsPdf()` 함수
- **해결 방안**: PDF 생성 후 다운로드 링크 제공

### 2. Mock 데이터 사용
- **상태**: 일부 엔드포인트에서 Mock 데이터 사용
- **위치**: `backend/routes/reports.js`의 `/generate`, `/send` 엔드포인트
- **해결 방안**: 실제 데이터베이스 쿼리로 교체 필요

---

## 🔮 향후 개선 사항

### 1. PDF 다운로드 기능
- PDF 생성 후 즉시 다운로드 링크 제공
- 브라우저에서 직접 다운로드

### 2. 보고서 커스터마이징
- 사용자별 보고서 템플릿 선택
- 로고 및 헤더 커스터마이징

### 3. 보고서 이메일 발송
- PDF를 이메일로 발송
- 첨부 파일 또는 링크 형태

### 4. 보고서 히스토리
- 생성된 보고서 목록 조회
- 이전 보고서 재다운로드

### 5. 보고서 공유
- 공유 링크 생성
- 만료 시간 설정

---

## 📚 관련 문서

- [사용자 매뉴얼](USER_MANUAL.md) - 보고서 사용 방법
- [관리자 매뉴얼](ADMIN_MANUAL.md) - 보고서 관리 방법
- [API 문서](api/openapi.yaml) - OpenAPI 스펙

---

**마지막 업데이트**: 2025-11-10  
**버전**: v4.0.0

