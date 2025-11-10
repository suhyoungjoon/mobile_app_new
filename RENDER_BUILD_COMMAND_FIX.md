# 🔧 Render 빌드 명령어 수정 가이드

## ❌ 현재 문제

로그에서 확인:
```
==> Running build command 'npm install'...
```

**문제**: `render.yaml`에 설정한 `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install ...` 명령어가 적용되지 않음

---

## 🔍 원인 분석

### 1. Render Dashboard 수동 설정 우선순위
- Render Dashboard에서 수동으로 설정한 빌드 명령어가 `render.yaml`보다 우선순위가 높을 수 있음
- 서비스를 Dashboard에서 먼저 생성한 경우, `render.yaml`이 무시될 수 있음

### 2. `render.yaml` 위치 문제
- `rootDir: backend`로 설정되어 있어서, `render.yaml`이 루트에 있어도 인식되지 않을 수 있음

---

## ✅ 해결 방법

### 방법 1: Render Dashboard에서 직접 수정 (즉시 적용) ⭐ **추천**

1. **Render Dashboard 접속**
   - https://dashboard.render.com
   - `insighti-backend-v2` 서비스 선택

2. **Settings 탭 클릭**

3. **Build Command 수정**
   ```
   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install --prefer-offline --no-audit --loglevel=verbose
   ```

4. **Save Changes 클릭**

5. **Manual Deploy 클릭** (또는 자동 재배포 대기)

---

### 방법 2: 환경 변수로 설정

1. **Render Dashboard → Environment 탭**

2. **환경 변수 추가**
   ```
   Key: PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
   Value: true
   ```

3. **Build Command 수정**
   ```
   npm install --prefer-offline --no-audit --loglevel=verbose
   ```
   (환경 변수가 자동으로 적용됨)

---

### 방법 3: `render.yaml` 위치 확인 및 수정

현재 `render.yaml`이 루트에 있지만, `rootDir: backend`로 설정되어 있어서 인식되지 않을 수 있음.

**옵션 A**: `render.yaml`을 `backend/` 디렉토리로 이동
```bash
mv render.yaml backend/render.yaml
```

**옵션 B**: `render.yaml`에서 `rootDir` 제거하고 경로 조정
```yaml
services:
  - type: web
    name: insighti-backend-v2
    runtime: node
    region: singapore
    plan: free
    buildCommand: cd backend && PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install --prefer-offline --no-audit --loglevel=verbose
    startCommand: cd backend && npm start
```

---

## 🎯 권장 조치 (즉시 적용)

### ⭐ **방법 1 추천**: Dashboard에서 직접 수정

**이유**:
- 즉시 적용 가능
- 가장 확실한 방법
- `render.yaml`과 무관하게 작동

**단계**:
1. Render Dashboard → `insighti-backend-v2` → Settings
2. Build Command 수정:
   ```
   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install --prefer-offline --no-audit --loglevel=verbose
   ```
3. Save Changes
4. Manual Deploy 또는 자동 재배포 대기

---

## 📊 예상 결과

### 수정 전
```
==> Running build command 'npm install'...
npm error signal SIGTERM (Chromium 다운로드 중 타임아웃)
```

### 수정 후
```
==> Running build command 'PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install ...'
✅ npm install 성공 (2-3분)
✅ 빌드 완료
```

---

## ✅ 확인 방법

배포 후 빌드 로그에서 확인:
```
✅ "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD" 메시지 확인
✅ 빌드 시간 2-3분으로 단축 확인
✅ "npm install" 성공 확인
✅ SIGTERM 오류 없음 확인
```

---

## 🔄 다음 단계

1. **Render Dashboard에서 빌드 명령어 수정** (방법 1)
2. **재배포 대기**
3. **빌드 로그 확인**
4. **성공 시 관리자 기능 테스트 진행**

