# ✅ Render 최종 빌드 명령어 설정

## 📋 현재 설정 확인

### ✅ 완료된 설정
- **Environment 탭**: `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` 추가됨

### ⚠️ 개선 필요
- **Build Command**: 환경 변수를 명시적으로 export하는 것이 더 확실함

---

## 🔧 권장 Build Command

### 옵션 1: 환경 변수 확인 포함 (추천) ⭐

```
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true && echo "✅ PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=$PUPPETEER_SKIP_CHROMIUM_DOWNLOAD" && npm install --prefer-offline --no-audit --loglevel=verbose
```

**장점**:
- 환경 변수가 제대로 설정되었는지 빌드 로그에서 확인 가능
- 디버깅 용이

---

### 옵션 2: 간단한 버전

```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install --prefer-offline --no-audit --loglevel=verbose
```

**장점**:
- 간단하고 명확
- 환경 변수가 Render Dashboard에 설정되어 있으면 작동

---

### 옵션 3: 현재 설정 유지 (환경 변수만 사용)

```
npm install --prefer-offline --no-audit --loglevel=verbose
```

**주의**:
- Render Dashboard의 Environment 탭에 `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`가 설정되어 있어야 함
- 빌드 로그에서 환경 변수 확인이 어려울 수 있음

---

## 🎯 권장 사항

### ⭐ **옵션 1 사용 권장**

**이유**:
1. **확실성**: `export`로 명시적으로 환경 변수 설정
2. **디버깅**: 빌드 로그에서 환경 변수 값 확인 가능
3. **이중 보호**: Render Dashboard 환경 변수 + 빌드 명령어 환경 변수

---

## 📊 빌드 로그 확인 방법

### 성공 시 예상 로그:
```
✅ PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm info run puppeteer@21.11.0 postinstall node_modules/puppeteer node install.mjs
✅ Chromium download skipped (환경 변수 적용됨)
✅ npm install 성공
✅ 빌드 완료 (2-3분)
```

### 실패 시 예상 로그:
```
npm info run puppeteer@21.11.0 postinstall node_modules/puppeteer node install.mjs
Downloading Chromium r121.0.6167.85...
npm error signal SIGTERM (타임아웃)
```

---

## 🔄 설정 단계

### 1. Render Dashboard → Settings

### 2. Build Command 수정

**옵션 1 (추천)**:
```
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true && echo "✅ PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=$PUPPETEER_SKIP_CHROMIUM_DOWNLOAD" && npm install --prefer-offline --no-audit --loglevel=verbose
```

**옵션 2 (간단)**:
```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install --prefer-offline --no-audit --loglevel=verbose
```

### 3. Save Changes

### 4. Manual Deploy 또는 자동 재배포 대기

---

## ✅ 확인 체크리스트

배포 후 빌드 로그에서 확인:

- [ ] "✅ PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true" 메시지 확인
- [ ] "Chromium download skipped" 또는 유사 메시지
- [ ] 빌드 시간 2-3분으로 단축
- [ ] "npm install" 성공
- [ ] SIGTERM 오류 없음
- [ ] 빌드 완료 메시지 확인

---

## 💡 추가 팁

### 환경 변수 이중 설정의 장점

1. **Render Dashboard Environment**: 모든 빌드에서 자동 적용
2. **Build Command export**: 현재 빌드에서 명시적으로 확인 가능

두 가지를 모두 설정하면 가장 확실합니다!

