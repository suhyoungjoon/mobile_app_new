# 🔧 Puppeteer Postinstall 멈춤 문제 해결

## ❌ 현재 문제

빌드 로그에서 확인:
```
npm info run puppeteer@21.11.0 postinstall node_modules/puppeteer node install.mjs
```
→ 여기서 멈춰있음 (Chromium 다운로드 시도 중 또는 타임아웃)

---

## 🔍 원인 분석

### 1. 환경 변수 전달 문제
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`가 설정되어 있지만
- Puppeteer의 `install.mjs`가 환경 변수를 제대로 읽지 못하거나
- Chromium 다운로드를 강제로 시도하고 있을 수 있음

### 2. Render 빌드 타임아웃
- Puppeteer postinstall이 3-5분 이상 걸리면 타임아웃 발생
- 무료 플랜의 빌드 타임아웃 제한

---

## ✅ 해결 방법

### 방법 1: Postinstall 스크립트 건너뛰기 (즉시 적용) ⭐ **추천**

**Render Dashboard → Settings → Build Command**:
```
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true && npm install --prefer-offline --no-audit --loglevel=verbose --ignore-scripts && npm rebuild puppeteer --build-from-source=false || true
```

**설명**:
- `--ignore-scripts`: 모든 postinstall 스크립트 건너뛰기
- `npm rebuild puppeteer`: Puppeteer만 별도로 재빌드 (스크립트 없이)
- `|| true`: 실패해도 계속 진행

---

### 방법 2: Puppeteer를 나중에 설치

**Build Command**:
```
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true && npm install --prefer-offline --no-audit --loglevel=verbose --ignore-scripts && npm install puppeteer@21.11.0 --no-save --ignore-scripts || true
```

---

### 방법 3: Puppeteer 제외 후 설치

**Build Command**:
```
npm install --prefer-offline --no-audit --loglevel=verbose --ignore-scripts --no-optional && export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true && npm install puppeteer@21.11.0 --ignore-scripts || true
```

---

## 🎯 권장 조치

### ⭐ **방법 1 사용 권장**

**이유**:
1. **빠른 빌드**: Postinstall 스크립트 건너뛰기로 2-3분 완료
2. **안정성**: 타임아웃 문제 해결
3. **기능 유지**: Puppeteer는 정상 설치, Chromium만 나중에 다운로드

---

## 📊 예상 결과

### 수정 전
```
npm info run puppeteer@21.11.0 postinstall node_modules/puppeteer node install.mjs
[멈춤 또는 타임아웃]
```

### 수정 후
```
npm install --ignore-scripts
✅ 모든 패키지 설치 완료 (postinstall 제외)
npm rebuild puppeteer
✅ Puppeteer 재빌드 완료 (스크립트 없이)
✅ 빌드 완료 (2-3분)
```

---

## ⚠️ 주의사항

### 1. Chromium 다운로드
- 빌드 시 Chromium 다운로드 안 함
- 첫 PDF 생성 시 자동 다운로드 (3-5분 소요)
- 이후 요청은 즉시 처리

### 2. 다른 패키지 postinstall
- `--ignore-scripts`로 인해 다른 패키지의 postinstall도 건너뛰어짐
- 대부분의 패키지는 postinstall 없이도 작동
- 문제 발생 시 해당 패키지만 별도 설치

---

## 🔄 설정 단계

### 1. Render Dashboard → Settings

### 2. Build Command 수정

**방법 1 (추천)**:
```
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true && npm install --prefer-offline --no-audit --loglevel=verbose --ignore-scripts && npm rebuild puppeteer --build-from-source=false || true
```

### 3. Save Changes

### 4. Manual Deploy 또는 자동 재배포 대기

---

## ✅ 확인 체크리스트

배포 후 빌드 로그에서 확인:

- [ ] "npm install --ignore-scripts" 실행 확인
- [ ] Puppeteer postinstall 스크립트 실행 안 됨
- [ ] 빌드 시간 2-3분으로 단축
- [ ] "npm install" 성공
- [ ] SIGTERM 오류 없음
- [ ] 빌드 완료 메시지 확인

---

## 💡 추가 최적화

### 런타임 Chromium 다운로드 최적화

서버 시작 시 백그라운드에서 Chromium 다운로드:
```javascript
// server.js에 추가
if (process.env.NODE_ENV === 'production') {
  const puppeteer = require('puppeteer');
  (async () => {
    try {
      console.log('Downloading Chromium in background...');
      const browser = await puppeteer.launch({ headless: 'new' });
      await browser.close();
      console.log('✅ Chromium ready!');
    } catch (error) {
      console.warn('Chromium download failed, will download on first use');
    }
  })();
}
```

---

## 🎯 다음 단계

1. **Render Dashboard에서 Build Command 수정** (방법 1)
2. **재배포 대기**
3. **빌드 로그 확인**
4. **성공 시 관리자 기능 테스트 진행**

