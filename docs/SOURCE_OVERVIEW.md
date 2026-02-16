# InsightI Precheck v2 — 소스 전체 점검 및 함수 기준 설명

## 1. 프로젝트 개요

- **목적**: 입주 전/후 하자 점검·보고서 생성 앱 (세대주 하자 등록 + 점검원 장비점검 + PDF 보고서)
- **백엔드**: Node.js + Express, PostgreSQL
- **프론트**: 웹앱 (SPA) — `index.html`(세대주), `inspector.html`(점검원), `admin.html`(관리자)
- **API 클라이언트**: `webapp/js/api.js` (APIClient)

---

## 2. 백엔드 (backend/)

### 2.1 server.js

| 역할 | 설명 |
|------|------|
| Express 앱 생성, CORS/Helmet/Morgan 설정 | 프로덕션에서 HTTPS 리다이렉트, HSTS |
| 정적 경로 | `/uploads`, `/uploads/thumbs`, `/reports` |
| API 라우트 마운트 | `/api/auth`, `/api/cases`, `/api/defects`, `/api/defect-categories`, `/api/inspections`, `/api/inspector-registration`, `/api/push`, `/api/youtube`, `/api/ai-learning`, `/api/azure-ai`, `/api/ai-detection`, `/api/upload`, `/api/reports`, `/api/sms`, `/api/admin` |
| `GET /` | 상태/버전 JSON |
| `GET /health` | 헬스체크 (Render 등) |
| `GET /api` | API 문서(엔드포인트 목록) JSON |
| 중앙 에러 핸들러 | `utils/errorHandler` 사용 |
| 404 | `*` → `Endpoint not found` |

### 2.2 database.js

| 항목 | 설명 |
|------|------|
| 풀 생성 | `process.env.DATABASE_URL` 있으면 connectionString + ssl, 없으면 config 기반 |
| `pool.connect` | 기동 시 연결 테스트 |
| `pool.on('connect'/'error')` | 로그용 |

### 2.3 middleware/auth.js

| 함수 | 설명 |
|------|------|
| `authenticateToken(req, res, next)` | `Authorization: Bearer <token>` 검증, JWT 검증 후 `req.user` 설정, 실패 시 401/403 |
| `checkUserRole(requiredRoles)` | 역할 계층(resident < company < admin) 체크하는 미들웨어 팩토리 |
| `requireEquipmentAccess` | `checkUserRole(['company','admin'])` |
| `requireAdminAccess` | `checkUserRole(['admin'])` |
| `requireInspectorAccess` | DB에서 household → complex 조회, complex 이름이 'admin'일 때만 통과 (점검원) |

### 2.4 routes/auth.js

| 라우트 | 설명 |
|--------|------|
| `POST /session` | body: complex, dong, ho, name, phone. complex 없으면 생성, household 없으면 신규 등록(이름/전화 암호화), 있으면 업데이트. JWT 발급(householdId, user_type, purpose), 3일 만료. 응답: token, user, expires_at |

### 2.5 routes/cases.js

| 라우트 | 설명 |
|--------|------|
| `GET /` | 현재 household의 **하자가 있는** 케이스만 조회, type 쿼리可选 |
| `POST /` | 케이스 생성. type: 하자접수/추가접수/장비점검/종합점검. '하자접수'면 기존 동일 타입 케이스 있으면 그대로 반환 |

### 2.6 routes/defects.js

| 라우트 | 설명 |
|--------|------|
| `GET /` | case_id 쿼리 필수, 해당 케이스 하자 목록 + photo |
| `GET /users` | 점검원용. 하자 있는 세대 목록(household_id, complex_name, dong, ho, resident_name, defect_count, has_inspected), 복호화 후 반환 |
| `GET /by-household/:householdId` | 점검원용. 해당 세대의 하자 목록 |
| `POST /` | 하자 등록 (case_id, location, trade, content, memo, photo_near_key, photo_far_key) |
| `PUT /:id` | 하자 수정 |
| `GET /:id` | 하자 단건 조회 |

### 2.7 routes/inspections.js

| 라우트 | 설명 |
|--------|------|
| `POST /thermal` | 열화상 점검 항목 생성 (caseId, defectId?, location, trade, note, result) |
| `POST /visual` | 육안점검 항목(점검의견) 생성 (caseId, defectId, location?, trade?, note, result) |
| `POST /thermal/:itemId/photos` | 열화상 사진 URL 등록 (file_url, caption) |
| `POST /air` | 공기질 측정 등록 (caseId, defectId?, location, trade, process_type?, tvoc, hcho, co2, note, result). process_type: flush_out/bake_out |
| `POST /radon` | 라돈 측정 등록 |
| `POST /level` | 레벨기 측정 등록 (참조값·좌우 포인트 mm 등) |
| `GET /defects/:defectId` | 하자별 점검 항목 조회 (air/radon/level/thermal/visual) |
| `GET /:caseId` | 케이스별 점검 항목 조회 |
| `DELETE /:itemId` | 점검 항목 삭제 |

입력 검증: `ValidationRules`(air/radon/level 범위·소수자리), `validateInput()`.

### 2.8 routes/reports.js

| 함수/라우트 | 설명 |
|-------------|------|
| `getReportTargetHouseholdId(req)` | 점검원(admin complex)이면 query/body의 household_id 사용, 아니면 토큰의 householdId |
| `GET /preview` | 세대 기준 보고서 미리보기 데이터. loadHouseholdReportData → HTML·defects·equipment_data 반환 |
| `POST /generate` | 세대 기준 PDF 생성. template: comprehensive-report \| final-report \| summary-report \| inspection-form. finalReportGenerator 또는 pdfmakeGenerator 호출 |
| `POST /generate-pptx` | 410 deprecated, PDF 사용 유도 |
| `POST /send` | 전화번호 지정 또는 세대 전화번호로 보고서 PDF 생성 후 SMS 등 발송 |
| `GET /preview-pdf/:filename` | PDF 파일 Blob 응답 (미리보기) |
| `GET /download/:filename` | PDF 다운로드 |
| `loadHouseholdReportData(householdId)` | 세대 정보 + 하자 목록 + 하자별 점검(air/radon/level/thermal/visual) 집계 |
| `generateComprehensiveReportHTML(...)` | 미리보기용 HTML 생성 |

### 2.9 utils/finalReportGenerator.js

| 함수 | 설명 |
|------|------|
| `generateFinalReport(reportData, pdfmakeGenerator, options)` | 템플릿 PDF(인사이트아이_보고서_전체.pdf)와 pdfmake로 만든 점검결과 오버레이 PDF를 pdf-lib로 병합. 1~10p 템플릿 → 11p 설명+육안결과 → 14p 설명+열화상 → 17p 설명+공기질 → 20p 설명+레벨기 → 21p~ 템플릿. 최종 파일명 예: 보고서_최종_동-호_타임스탬프.pdf |

### 2.10 utils/pdfmakeGenerator.js

| 클래스/메서드 | 설명 |
|---------------|------|
| `PDFMakeGenerator` | outputDir: reports, fontsDir: fonts, PdfPrinter(NotoSansKR 또는 Roboto) |
| `ensureDirectories()` | reports, fonts 폴더 생성 |
| `initFonts()` | Roboto + NotoSansKR 로드, printer 생성 |
| `formatDate(dateString)` | ko-KR 날짜 포맷 |
| `buildDocumentDefinition(data)` | 헤더/연락처/점검요약/하자 목록/회사·푸터 등 doc definition 구성 |
| `_buildInspectionContent`, `_buildCompanyAndFooter`, `_getDocumentDefinition` | 내부 빌드 |
| `generatePDF(templateName, data, options)` | comprehensive-report 등 템플릿별 PDF 생성, 파일 저장 후 filename/path/url/size 반환 |
| `generateSummaryReportPDF` | 수기보고서용 PDF |
| `generateInspectionFormPDF` | 점검결과 양식 PDF |
| `generateFinalReportInspectionOverlayPDF` | 최종보고서용 점검결과 페이지만 생성(육안/열화상/공기질/레벨기), finalReportGenerator에서 병합용 |

### 2.11 기타 라우트·유틸 (요약)

- **routes/defect-categories.js**: 카테고리 목록/상세/검색/동영상
- **routes/upload.js**: 사진 업로드, 썸네일
- **routes/push-notifications.js**: 푸시 구독/해제/테스트
- **routes/youtube-search.js**: YouTube 검색
- **routes/ai-learning.js**, **azure-ai.js**, **ai-detection.js**: AI 분석·설정
- **routes/sms.js**: SMS 발송/상태/전화번호 검증
- **routes/admin.js**: 관리자용 하자 목록 등
- **utils/encryption.js**: encrypt/decrypt (개인정보)
- **utils/errorHandler.js**: 중앙 에러 핸들러
- **utils/logger.js**: safeLog

---

## 3. 웹앱 — API 클라이언트 (webapp/js/api.js)

### 3.1 APIClient 클래스

| 메서드 | 설명 |
|--------|------|
| `constructor()` | baseURL(개발: localhost:3000, 프로덕션: Render), token(localStorage insighti_token) |
| `setToken(token)` | 토큰 저장 + localStorage |
| `clearToken()` | 토큰 삭제 |
| `request(endpoint, options)` | fetch 래퍼, Bearer 헤더, 타임아웃 60초, 5xx 시 최대 5회 재시도(지수 백오프), 401/403 시 토큰 삭제 후 route('login') |
| `login(complex, dong, ho, name, phone)` | POST /auth/session, 응답 토큰 저장 |
| `getCases()`, `createCase(caseData)` | 케이스 목록/생성 |
| `getDefects(caseId)`, `getUsersWithDefects()`, `getDefectsByHousehold(householdId)` | 하자 목록(케이스/세대/점검원용) |
| `createDefect`, `updateDefect`, `getDefect` | 하자 생성/수정/단건 |
| `uploadPhoto(file, type)` | 이미지 압축(1400px, 0.8) 후 FormData로 /upload/photo, alias: uploadImage |
| `getReportPreview(householdId, caseId)`, `generateReport(caseId, householdId, options)` | 보고서 미리보기/PDF 생성 |
| `sendReport(caseId, phoneNumber, householdId)` | 보고서 발송 |
| `previewReport(filename)` | PDF Blob 받아 새 창에서 미리보기 |
| `downloadReport(filename)` | PDF Blob 받아 다운로드 |
| `sendSMS`, `getSMSStatus`, `validatePhone` | SMS |
| `sendPushNotification(type, data)`, `sendTestNotification` | 푸시 |
| `searchYouTubeVideos(query, maxResults)`, `getYouTubeVideoDetails(videoId)` | YouTube |
| `getDefectCategories`, `getDefectCategoriesByCategory`, `getDefectCategoryDetail`, `searchDefectCategories`, `getDefectVideos` | 하자 카테고리 |
| `saveAIPrediction`, `sendAIFeedback`, `getAIPerformance`, `getAIPerformanceByDefect`, `getTrainingData`, `detectDefectsWithAI` | AI 학습 |
| `analyzeDefectWithAzureAI`, `consultDefect`, `checkAzureAIStatus` | Azure AI |
| `analyzeDefectHybrid`, `getAIDetectionSettings`, `updateAIDetectionSettings` | 하이브리드 AI |
| `createThermalInspection`, `createThermalInspectionForDefect`, `createVisualInspectionForDefect` | 열화상/육안 |
| `uploadThermalPhoto` | 열화상 사진 |
| `createAirMeasurement`, `createRadonMeasurement`, `createAirMeasurementForDefect`, `createRadonMeasurementForDefect`, `createLevelMeasurementForDefect`, `createLevelMeasurement` | 공기질/라돈/레벨기 |
| `getDefectInspections(defectId)`, `getInspectionsByCase(caseId)`, `deleteInspection(itemId)` | 점검 항목 조회/삭제 |

전역 인스턴스: `const api = new APIClient();`

---

## 4. 웹앱 — 세대주 앱 (webapp/js/app.js)

### 4.1 유틸·상태

| 항목 | 설명 |
|------|------|
| `$`, `$$` | querySelector / querySelectorAll |
| `DEBUG`, `debugLog`, `debugError`, `debugWarn` | 로그 제어 |
| `escapeHTML(str)` | XSS 방지용 이스케이프 |
| `handleAPIError(error, context)` | API 에러 통합 처리(타임아웃/오프라인/401·403/404/5xx → toast, 401·403 시 logout 후 login 화면) |
| `AppState` | session, currentCaseId, photoNearKey, photoFarKey, token (session setter에서 api.setToken/clearToken, localStorage) |
| `setLoading(loading)` | 버튼 비활성화/opacity |
| `toast(msg, type)` | 토스트 메시지 |
| `route(screen)` | 화면 전환, 히스토리 push, newdefect 시 고객정보/ensureCaseExists/loadDefectCategories |
| `toggleUserMenu`, `closeUserMenu` | 사용자 메뉴 |
| `onLogout`, `showMyInfo`, `showMyStats`, `goToAdmin`, `goBack` | 로그아웃/내정보/내 하자 현황/관리자/뒤로가기 |

### 4.2 로그인·케이스·하자

| 함수 | 설명 |
|------|------|
| `onLogin()` | 로그인 폼 검증 → api.login → AppState.session, loadCases, ensureCase, route('list') |
| `loadCases()` | api.getCases → AppState.cases, renderCaseList |
| `renderCaseList()` | 케이스 카드 렌더 (상세보기/하자 추가 버튼) |
| `createNewCase()` | api.createCase → 목록 갱신 |
| `ensureCaseExists()` | currentCaseId 없으면 loadCases 후 기존 케이스 사용 또는 새로 생성 |
| `viewCaseDefects(caseId)` | api.getDefects + 하자별 getDefectInspections → 케이스 상세 화면, 수정/삭제 버튼 |
| `addDefectToCase(caseId)` | currentCaseId 설정 후 newdefect 화면 |
| `editDefect(defectId)` | api.getDefect → 폼 채우고 edit-defect 화면 |
| `saveDefectEdit()` | api.updateDefect → viewCaseDefects |
| `cancelEdit()` | 케이스 상세 또는 list로 복귀 |
| `deleteDefect(defectId)` | 현재는 toast만 (미구현) |
| `onSaveDefect()` | ensureCase → api.createDefect(photo key 포함), 푸시(defect-registered), 폼/사진 초기화, loadCases |
| `ensureCase()` | currentCaseId 없거나 케이스 없으면 생성 후 반환 |

### 4.3 보고서·공통

| 함수 | 설명 |
|------|------|
| `formatDate`, `checkAuth`, `logout`, `saveSession` | 날짜 포맷, 토큰 체크 후 login 유도, 로그아웃, 세션 localStorage 저장 |
| `initializeUI()` | 위치/세부공정 select 채우기, 사용자 배지 클릭 시 로그아웃, AppState.session setter에서 saveSession 호출 |

### 4.4 하자 카테고리·YouTube

| 함수 | 설명 |
|------|------|
| `loadDefectCategories()` | api.getDefectCategories → defect-category select 옵션(그룹) |
| `loadDefectDescription()` | 카테고리 선택 시 api.getDefectCategoryDetail, 설명/해결방법 표시, def-content 자동 입력, YouTube 검색 시도 후 loadYouTubeVideo/showYouTubeSearchResults |
| `showYouTubeSearchResults(videos, defectName)` | 검색 결과 UI, 새로고침 버튼 |
| `refreshYouTubeSearch(defectName)` | 검색 재실행 |
| `markDefectInVideo()` | placeholder (향후 구현) |
| `retakePhotos()` | 사진/썸네일·AppState photo 키 초기화 |

### 4.5 이미지·모달

| 함수 | 설명 |
|------|------|
| `showImageModal(imageUrl)`, `closeImageModal()` | 이미지 모달 |
| `showPhotoOptions(type)` | 카메라/갤러리 선택 다이얼로그 |
| `selectPhotoSource(type, source)` | 해당 input click |
| `closePhotoOptions()` | 다이얼로그 제거 |
| `triggerPhotoInput(type)` | showPhotoOptions 호출 (하위 호환) |
| `handlePhotoUpload(type, inputElement)` | 파일 검증 → 미리보기 → compressImage → api.uploadImage → AppState photo key, ENABLE_AI_ANALYSIS 시 analyzePhotoWithAI |
| `compressImage(file, maxWidth, maxHeight, quality)` | Canvas 리사이즈·toBlob JPEG |

### 4.6 AI 분석

| 함수 | 설명 |
|------|------|
| `analyzePhotoWithAI(file, photoType)` | hybridDetector.analyze 또는 mock, displayAIDetectionResults, saveLearningData |
| `createImageElement(file)` | File → Image Promise |
| `generateQuickMockDefects()` | 모의 하자 목록 1~2개 |
| `displayAIDetectionResults(aiResult, photoType)` | 감지 하자 카드, 사용/거부 버튼, 모드 배지 |
| `useAIDetection(defectIndex, photoType)` | 해당 결과를 카테고리/내용에 반영, 피드백 수집 |
| `rejectAIDetection(defectIndex)` | 피드백만 수집 |
| `hideAIAnalysis()` | 결과 영역 숨김 |
| `saveDetectionForLearning(defects, file, photoType)` | currentDetectionData에 푸시 |
| `saveLearningData`, `generateSimpleHash` | 학습 데이터 로컬 저장, 해시 |
| `switchLocalModel(mode)` | hybridDetector 로컬 모드 전환 |
| `switchCloudProvider(provider)` | 클라우드 프로바이더 전환 |
| `updateThresholdDisplay`, `setConfidenceThreshold` | 신뢰도 임계값 UI/설정 |
| `refreshAIStats`, `resetAIStats` | AI 통계 표시/초기화 |
| `loadModelSettings()` | localStorage에서 로컬/클라우드/임계값 로드 |
| `showSettings()`, `loadAISettings()`, `toggleAIAnalysis(enabled)`, `updateAIStatus(enabled)` | 설정 화면, AI on/off, 상태 표시 |
| `loadPushNotificationSettings()`, `togglePushNotifications()`, `sendTestNotification()` | 푸시 설정/토글/테스트 |

### 4.7 DOMContentLoaded

- 화면 hidden, login 표시
- ENABLE_AI_ANALYSIS 로드, 활성화 시 HybridDetector 초기화
- loadDefectCategories
- route('login'), initializeUI

**점검 시 수정 사항**: `showError(error)` 호출이 7곳에 남아 있었으나, 해당 함수는 제거된 상태였음. 모두 `handleAPIError(error, '')`로 교체 완료.

---

## 5. 웹앱 — 점검원 앱 (webapp/js/inspector.js)

### 5.1 상태·유틸

| 항목 | 설명 |
|------|------|
| `InspectorState` | session, currentDefectId, currentCaseId, currentDefect, allDefects, selectedHouseholdId, selectedHouseholdDisplay, userListCache, measurementPhotos |
| `setLoading`, `toast`, `escapeHTML`, `formatDate` | app.js와 유사 |
| `route(screen)`, `goBack()`, `goBackToUserList()` | 화면 전환·뒤로가기 |

### 5.2 로그인·사용자 목록

| 함수 | 설명 |
|------|------|
| `autoLogin()` | complex=admin, dong=000, ho=000, name=점검원, phone=010-0000-0000으로 api.login → loadUserList → user-list |
| `onLogout()` | 확인 후 세션/토큰 삭제 후 autoLogin() |
| `loadUserList()` | api.getUsersWithDefects → 사용자 카드(하자목록 보기/미리보기/다운로드) |
| `selectUser(householdId)` | selectedHouseholdId/Display 설정, loadDefectsForHousehold, defect-list 화면 |
| `previewReportForUser(householdId)` | getReportPreview(householdId) → report 화면에 하자 카드 |
| `downloadReportForUser(householdId)` | getReportPreview → generateReport(householdId) → downloadReport |
| `loadAllDefectsDirectly()` | /api/admin/defects로 전체 하자 조회 후 defect-list 컨테이너에 표시 (fallback) |
| `loadDefectsForHousehold(householdId)` | api.getDefectsByHousehold → 하자별 getDefectInspections → 카드 렌더 |
| `loadAllDefects()` | loadUserList 후 user-list |

### 5.3 점검결과 입력

| 함수 | 설명 |
|------|------|
| `openDefectSelectModal()` | allDefects 기준 모달 리스트, 선택 시 openDefectInspection 호출 |
| `closeDefectSelectModal()` | 모달 숨김 |
| `openDefectInspection(defectId, caseId)` | api.getDefect, getDefectInspections.visual → defect-inspection 화면, 육안 요약/의견 로드, 탭 air로 |
| `showDefectInspectionTab(tabType)` | air/radon/level/thermal/visual 탭 전환 |
| `compressImage(file, ...)` | app.js와 동일 로직 (점검원용 복사) |
| `handleMeasurementPhotoUpload(type, inputElement)` | 측정 사진 업로드·미리보기·InspectorState.measurementPhotos 저장 |

이후 inspector.js 내에서 공기질/라돈/레벨기/열화상/육안 저장 버튼 핸들러들이 api.createAirMeasurementForDefect, createRadonMeasurementForDefect, createLevelMeasurementForDefect, createThermalInspection, createVisualInspectionForDefect 등을 호출.

### 5.4 보고서(점검원)

- 미리보기/다운로드는 위 `previewReportForUser`, `downloadReportForUser`에서 처리.
- report 화면에서 PDF 미리보기/다운로드 버튼은 api.previewReport, api.downloadReport 호출.

---

## 6. 정리 및 권장 사항

1. **에러 처리**: app.js에서 제거된 `showError` 대신 `handleAPIError` 사용하도록 7곳 수정 완료.
2. **공통화**: inspector.js의 `compressImage`는 app.js와 중복; 공통 모듈(예: `js/utils.js`)로 빼면 유지보수에 유리.
3. **API baseURL**: api.js에 Render URL이 하드코딩되어 있음. 배포 환경별로 한 곳에서 설정하도록 env 또는 config 사용 권장.
4. **보고서 URL**: app.js viewCaseDefects 등에서 이미지 URL에 `https://mobile-app-new.onrender.com` 하드코딩. baseURL과 통일 권장.
5. **권한**: 점검원은 complex 이름 'admin'으로 구분; 관리자(admin user_type)와는 별도. 필요 시 역할 정리 문서화 권장.

이 문서는 함수·라우트 단위로 소스 역할을 정리한 개요이며, 세부 구현은 각 파일을 참고하면 됩니다.
