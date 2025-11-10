# 🧪 기능별 자동 테스트 가이드

## 📋 테스트 진행 방식

각 기능별로 테스트를 진행하고, 완료 후 리뷰를 받은 다음 다음 기능으로 진행합니다.

---

## 🚀 기능 1: 로그인 테스트

### 실행 방법

```bash
cd backend
FRONTEND_URL="https://insighti.vercel.app" \
BACKEND_URL="https://insighti-backend-v2.onrender.com" \
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

## 📊 다음 단계

**기능 1 완료 후:**
1. 스크린샷 확인
2. 리뷰 진행
3. 리뷰 완료 후 기능 2 진행

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

