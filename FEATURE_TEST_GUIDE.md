# 🧪 기능별 자동 테스트 가이드

## 📋 테스트 진행 방식

각 기능별로 테스트를 진행하고, 완료 후 리뷰를 받은 다음 다음 기능으로 진행합니다.

**현재 버전**: v4.0.0  
**테스트 환경**:
- 프론트엔드: https://insighti.vercel.app
- 백엔드: https://mobile-app-new.onrender.com

---

## 🚀 기능 1: 로그인 테스트 ✅

### 실행 방법

```bash
cd backend
FRONTEND_URL="https://insighti.vercel.app" \
BACKEND_URL="https://mobile-app-new.onrender.com" \
node scripts/test-feature-1-login.js
```

### 테스트 항목
1. ✅ 로그인 화면 표시
2. ✅ 로그인 정보 입력
3. ✅ 로그인 버튼 클릭
4. ✅ 로그인 성공 확인
5. ✅ 하자 목록 화면 이동 확인

### 스크린샷
- `01-login-screen-*.png` - 로그인 화면
- `01-login-filled-*.png` - 로그인 정보 입력 완료
- `01-login-success-*.png` - 로그인 성공 (하자 목록 화면)

### 저장 위치
`test-screenshots/feature-1-login/`

### 테스트 결과
- **상태**: ✅ 성공
- **결과 문서**: [FEATURE_1_LOGIN_RESULTS.md](FEATURE_1_LOGIN_RESULTS.md)

---

## ⚠️ Puppeteer 설정 문제 해결

### macOS에서 Chrome 경로 확인

Puppeteer가 Chromium을 찾지 못하는 경우:

```bash
# Chrome 설치 확인
ls -la /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome

# 또는 수동으로 Chrome 경로 설정
export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

### 대안: Docker 사용

```bash
docker run -it --rm \
  -v $(pwd):/app \
  -w /app/backend \
  mcr.microsoft.com/playwright:v1.40.0-focal \
  node scripts/test-feature-1-login.js
```

---

## 🚀 기능 2: 하자 등록 테스트 ✅

### 실행 방법
```bash
cd backend
FRONTEND_URL="https://insighti.vercel.app" \
BACKEND_URL="https://mobile-app-new.onrender.com" \
node scripts/test-feature-2-defect-registration.js
```

### 테스트 항목
1. ✅ 하자 등록 화면 이동
2. ✅ 하자명 선택 (드롭다운)
3. ✅ YouTube 동영상 자동 검색 ✅
4. ✅ 위치, 세부공정, 메모 입력
5. ✅ 사진 촬영/업로드 (전체/근접)
6. ✅ AI 판정 (선택사항) ✅
7. ✅ 하자 저장

### 스크린샷
- `02-defect-form-filled-*.png` - 하자 등록 폼 입력 완료
- `02-photo-upload-*.png` - 사진 업로드 화면
- `02-defect-saved-*.png` - 하자 저장 완료

### 저장 위치
`test-screenshots/feature-2-defect-registration/`

### 테스트 결과
- **상태**: ✅ 성공
- **결과 문서**: [FEATURE_2_DEFECT_RESULTS.md](FEATURE_2_DEFECT_RESULTS.md)

---

## 🚀 기능 3: 장비 점검 테스트 ✅

### 실행 방법
```bash
cd backend
FRONTEND_URL="https://insighti.vercel.app" \
BACKEND_URL="https://mobile-app-new.onrender.com" \
node scripts/test-feature-3-equipment.js
```

### 테스트 항목
1. ✅ 장비 점검 화면 이동 (점검원 권한 필요)
2. ✅ 열화상 점검 등록
3. ✅ 공기질 측정 등록
4. ✅ 라돈 측정 등록
5. ✅ 레벨기 측정 등록

### 스크린샷
- `03-equipment-screen-*.png` - 장비 점검 메인 화면
- `03-thermal-*.png` - 열화상 점검
- `03-air-*.png` - 공기질 측정
- `03-radon-*.png` - 라돈 측정
- `03-level-*.png` - 레벨기 측정

### 저장 위치
`test-screenshots/feature-3-equipment/`

### 테스트 결과
- **상태**: ✅ 성공 (4/4)
- **결과 문서**: [FEATURE_3_EQUIPMENT_RESULTS.md](FEATURE_3_EQUIPMENT_RESULTS.md)

---

## 🚀 기능 4: 점검원 등록 테스트 ✅

### 실행 방법
```bash
cd backend
FRONTEND_URL="https://insighti.vercel.app" \
BACKEND_URL="https://mobile-app-new.onrender.com" \
node scripts/test-feature-4-inspector-registration.js
```

### 테스트 항목
1. ✅ 점검원 등록 화면 이동
2. ✅ 등록 정보 입력
3. ✅ 등록 신청 버튼 클릭
4. ✅ 등록 성공 확인

### 스크린샷
- `04-inspector-form-*.png` - 점검원 등록 폼
- `04-registration-success-*.png` - 등록 성공

### 저장 위치
`test-screenshots/feature-4-inspector-registration/`

### 테스트 결과
- **상태**: ✅ 성공
- **결과 문서**: [FEATURE_4_INSPECTOR_RESULTS.md](FEATURE_4_INSPECTOR_RESULTS.md)

---

## 🚀 기능 5: 보고서 생성 테스트 ✅

### 실행 방법
```bash
cd backend
FRONTEND_URL="https://insighti.vercel.app" \
BACKEND_URL="https://mobile-app-new.onrender.com" \
node scripts/test-feature-5-report.js
```

### 테스트 항목
1. ✅ 보고서 미리보기 화면 이동
2. ✅ 보고서 내용 확인
3. ✅ PDF 생성
4. ✅ PDF 저장

### 스크린샷
- `05-report-preview-*.png` - 보고서 미리보기
- `05-pdf-generated-*.png` - PDF 생성 완료

### 저장 위치
`test-screenshots/feature-5-report/`

### 테스트 결과
- **상태**: ✅ 성공
- **결과 문서**: [FEATURE_5_REPORT_RESULTS.md](FEATURE_5_REPORT_RESULTS.md)

---

## 🚀 기능 6: 관리자 기능 테스트 ✅

### 실행 방법
```bash
cd backend
FRONTEND_URL="https://insighti.vercel.app" \
BACKEND_URL="https://mobile-app-new.onrender.com" \
ADMIN_EMAIL="admin@insighti.com" \
ADMIN_PASSWORD="admin123" \
node scripts/test-feature-6-admin.js
```

### 테스트 항목
1. ✅ 관리자 로그인
2. ✅ 대시보드 확인
3. ✅ 사용자 관리 화면
4. ✅ 하자 관리 화면
5. ✅ 점검원 관리 화면
6. ✅ AI 판정 설정 화면 ✅

### 스크린샷
- `06-admin-login-*.png` - 관리자 로그인
- `06-dashboard-*.png` - 관리자 대시보드
- `06-users-*.png` - 사용자 관리
- `06-defects-*.png` - 하자 관리
- `06-inspectors-*.png` - 점검원 관리
- `06-ai-settings-*.png` - AI 판정 설정 ✅

### 저장 위치
`test-screenshots/feature-6-admin/`

### 테스트 결과
- **상태**: ✅ 성공
- **결과 문서**: [FEATURE_6_ADMIN_RESULTS.md](FEATURE_6_ADMIN_RESULTS.md)

---

## 🚀 기능 7: 푸시 알림 테스트 ✅

### 실행 방법
```bash
cd backend
FRONTEND_URL="https://insighti.vercel.app" \
BACKEND_URL="https://mobile-app-new.onrender.com" \
node scripts/test-feature-7-push.js
```

### 테스트 항목
1. ✅ 푸시 알림 활성화
2. ✅ 테스트 알림 발송
3. ✅ 하자 등록 알림 (관리자에게)
4. ✅ 점검 완료 알림
5. ✅ 보고서 생성 알림
6. ✅ 점검원 승인 알림

### 스크린샷
- `07-push-enabled-*.png` - 푸시 알림 활성화
- `07-test-notification-*.png` - 테스트 알림
- `07-defect-registered-*.png` - 하자 등록 알림
- `07-inspection-completed-*.png` - 점검 완료 알림
- `07-report-generated-*.png` - 보고서 생성 알림
- `07-inspector-decision-*.png` - 점검원 승인 알림

### 저장 위치
`test-screenshots/feature-7-push/`

### 테스트 결과
- **상태**: ✅ 성공 (7/8 시나리오)
- **결과 문서**: [FEATURE_7_PUSH_TEST_RESULTS_FINAL.md](FEATURE_7_PUSH_TEST_RESULTS_FINAL.md)

---

## 📊 테스트 완료 현황

| 기능 | 상태 | 테스트 결과 문서 |
|------|------|-----------------|
| 기능 1: 로그인 | ✅ 완료 | [FEATURE_1_LOGIN_RESULTS.md](FEATURE_1_LOGIN_RESULTS.md) |
| 기능 2: 하자 등록 | ✅ 완료 | [FEATURE_2_DEFECT_RESULTS.md](FEATURE_2_DEFECT_RESULTS.md) |
| 기능 3: 장비 점검 | ✅ 완료 | [FEATURE_3_EQUIPMENT_RESULTS.md](FEATURE_3_EQUIPMENT_RESULTS.md) |
| 기능 4: 점검원 등록 | ✅ 완료 | [FEATURE_4_INSPECTOR_RESULTS.md](FEATURE_4_INSPECTOR_RESULTS.md) |
| 기능 5: 보고서 생성 | ✅ 완료 | [FEATURE_5_REPORT_RESULTS.md](FEATURE_5_REPORT_RESULTS.md) |
| 기능 6: 관리자 기능 | ✅ 완료 | [FEATURE_6_ADMIN_RESULTS.md](FEATURE_6_ADMIN_RESULTS.md) |
| 기능 7: 푸시 알림 | ✅ 완료 | [FEATURE_7_PUSH_TEST_RESULTS_FINAL.md](FEATURE_7_PUSH_TEST_RESULTS_FINAL.md) |

**전체 테스트 완료율**: 7/7 (100%)

---

## 📊 다음 단계

**모든 기능 테스트 완료 후:**
1. 전체 테스트 결과 리뷰
2. 발견된 문제 수정
3. 프로덕션 배포 준비

---

## 🔧 문제 해결

### "socket hang up" 오류
- Chrome/Chromium이 설치되어 있는지 확인
- `PUPPETEER_EXECUTABLE_PATH` 환경변수 설정
- 또는 Puppeteer를 재설치: `npm install puppeteer --force`

### "타임아웃" 오류
- 프론트엔드/백엔드 서버가 실행 중인지 확인
- URL이 올바른지 확인
- 네트워크 연결 확인

