# 🔧 Render 환경 변수 설정 가이드

## ❌ 현재 문제

빌드 로그에서 확인:
```
npm info run puppeteer@21.11.0 postinstall node_modules/puppeteer node install.mjs
```

**문제**: `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`가 적용되지 않아 Chromium 다운로드 시도 중

---

## 🔍 원인 분석

### 1. 환경 변수 전달 문제
- 빌드 명령어에 환경 변수를 포함했지만, npm의 postinstall 스크립트에는 전달되지 않을 수 있음
- `.npmrc`의 환경 변수는 npm install 시점에만 적용됨

### 2. Render 환경 변수 설정 필요
- Render Dashboard에서 환경 변수를 별도로 설정해야 할 수 있음

---

## ✅ 해결 방법

### 방법 1: Render Dashboard에서 환경 변수 추가 ⭐ **즉시 적용**

1. **Render Dashboard 접속**
   - https://dashboard.render.com
   - `insighti-backend-v2` 서비스 선택

2. **Environment 탭 클릭**

3. **환경 변수 추가**
   ```
   Key: PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
   Value: true
   ```

4. **Save Changes 클릭**

5. **Manual Deploy 클릭** (또는 자동 재배포 대기)

---

### 방법 2: 빌드 명령어 수정 (더 명확한 방법)

**현재**:
```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install ...
```

**수정 후** (Render Dashboard):
```
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true && npm install --prefer-offline --no-audit --loglevel=verbose
```

또는

```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install --prefer-offline --no-audit --loglevel=verbose && echo "Puppeteer Chromium download skipped"
```

---

### 방법 3: `.npmrc` 수정 (더 확실한 방법)

`.npmrc` 파일에서 환경 변수를 직접 설정하는 대신, npm config로 설정:

**Render Dashboard Build Command**:
```
npm config set puppeteer_skip_chromium_download true && npm install --prefer-offline --no-audit --loglevel=verbose
```

---

## 🎯 권장 조치 (즉시 적용)

### ⭐ **방법 1 + 방법 2 조합**: 가장 확실함

**1단계: Render Dashboard → Environment**
- 환경 변수 추가:
  ```
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
  ```

**2단계: Render Dashboard → Settings → Build Command**
- 빌드 명령어 수정:
  ```
  export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true && npm install --prefer-offline --no-audit --loglevel=verbose
  ```

**3단계: Save Changes → Manual Deploy**

---

## 📊 예상 결과

### 수정 전
```
npm info run puppeteer@21.11.0 postinstall node_modules/puppeteer node install.mjs
npm error signal SIGTERM (Chromium 다운로드 중 타임아웃)
```

### 수정 후
```
npm info run puppeteer@21.11.0 postinstall node_modules/puppeteer node install.mjs
✅ Chromium download skipped (환경 변수 적용됨)
✅ npm install 성공 (2-3분)
✅ 빌드 완료
```

---

## 🔍 확인 방법

배포 후 빌드 로그에서 확인:

### 성공 시
```
✅ "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD" 환경 변수 확인
✅ "Chromium download skipped" 또는 유사 메시지
✅ 빌드 시간 2-3분으로 단축
✅ "npm install" 성공
✅ SIGTERM 오류 없음
```

### 실패 시
```
❌ "Downloading Chromium" 메시지
❌ SIGTERM 오류
```

---

## 💡 추가 팁

### 환경 변수 확인 스크립트

빌드 명령어에 확인 단계 추가:
```
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true && echo "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=$PUPPETEER_SKIP_CHROMIUM_DOWNLOAD" && npm install --prefer-offline --no-audit --loglevel=verbose
```

이렇게 하면 빌드 로그에서 환경 변수가 제대로 설정되었는지 확인 가능합니다.

---

## ✅ 다음 단계

1. **Render Dashboard에서 환경 변수 추가** (방법 1)
2. **빌드 명령어 수정** (방법 2)
3. **재배포 대기**
4. **빌드 로그 확인**
5. **성공 시 관리자 기능 테스트 진행**

