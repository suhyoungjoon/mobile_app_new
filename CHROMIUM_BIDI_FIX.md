# 🔧 chromium-bidi 오류 해결 가이드

## ❌ 현재 문제

```
find: './node_modules/chromium-bidi/lib/cjs/bidiTab': No such file or directory
find: './node_modules/chromium-bidi/lib/cjs/bidiServer': No such file or directory
find: './node_modules/chromium-bidi/lib/cjs/utils': No such file or directory
```

**원인**: Puppeteer의 의존성 패키지 `chromium-bidi` 설치가 불완전하거나, postinstall 스크립트가 실패함

---

## 🔍 원인 분석

### 1. chromium-bidi란?
- Puppeteer의 의존성 패키지
- Chrome DevTools Protocol (CDP) 관련 기능 제공
- Puppeteer 설치 시 자동으로 설치됨

### 2. 문제 원인
- Puppeteer postinstall 스크립트 실행 중 오류
- chromium-bidi 패키지 설치 불완전
- 빌드 타임아웃으로 인한 중단 가능성

---

## ✅ 해결 방법

### 방법 1: npm install 옵션 조정 (추천) ⭐

**render.yaml Build Command 수정**:
```yaml
buildCommand: npm install --legacy-peer-deps --no-optional
```

또는

```yaml
buildCommand: npm install --legacy-peer-deps --ignore-scripts && npm rebuild puppeteer --build-from-source=false || true
```

---

### 방법 2: Puppeteer 버전 고정

**backend/package.json 수정**:
```json
"dependencies": {
  "puppeteer": "21.11.0"  // 버전 고정 (이미 고정되어 있음)
}
```

---

### 방법 3: chromium-bidi 명시적 설치

**render.yaml Build Command**:
```yaml
buildCommand: npm install && npm install chromium-bidi --no-save || true
```

---

### 방법 4: npm cache 정리 후 재설치

**render.yaml Build Command**:
```yaml
buildCommand: npm cache clean --force && npm install --legacy-peer-deps
```

---

## 🎯 권장 해결 방법

### ⭐ **방법 1: --legacy-peer-deps 사용**

**이유**:
- 의존성 충돌 해결
- chromium-bidi 설치 안정화
- 가장 간단한 해결책

**render.yaml 수정**:
```yaml
buildCommand: npm install --legacy-peer-deps
```

---

## 📋 수정 단계

### 1. render.yaml 수정

**현재**:
```yaml
buildCommand: npm install
```

**수정 후**:
```yaml
buildCommand: npm install --legacy-peer-deps
```

### 2. Git 푸시
```bash
git add render.yaml
git commit -m "Fix chromium-bidi error: use --legacy-peer-deps"
git push origin main
```

### 3. 재배포
- Render Dashboard에서 Manual Deploy
- 빌드 로그 확인

---

## 📊 예상 결과

### 수정 전
```
find: './node_modules/chromium-bidi/lib/cjs/bidiTab': No such file or directory
빌드 실패
```

### 수정 후
```
npm install --legacy-peer-deps
✅ chromium-bidi 설치 완료
✅ npm install 성공
✅ 빌드 완료
```

---

## 🔄 대안 방법

### 방법 A: Puppeteer 제외 후 별도 설치

**render.yaml Build Command**:
```yaml
buildCommand: npm install --ignore-scripts --no-optional && npm install puppeteer@21.11.0 --legacy-peer-deps || true
```

### 방법 B: npm ci 사용

**render.yaml Build Command**:
```yaml
buildCommand: npm ci --legacy-peer-deps || npm install --legacy-peer-deps
```

---

## ⚠️ 주의사항

### 1. --legacy-peer-deps 옵션
- npm 7+ 버전에서 peer dependencies 충돌 해결
- 일부 패키지의 최신 버전 요구사항 무시
- 대부분의 경우 안전하게 사용 가능

### 2. chromium-bidi
- Puppeteer의 필수 의존성
- 설치 실패 시 Puppeteer 작동 불가
- PDF 생성 기능에 필요

---

## 🎯 다음 단계

1. **render.yaml Build Command 수정** (`--legacy-peer-deps` 추가)
2. **Git 푸시**
3. **재배포**
4. **빌드 성공 확인**

---

## 💡 추가 최적화

### Starter 플랜에서도 실패하는 경우

Standard 플랜 ($25/월)으로 업그레이드 고려:
- 더 많은 리소스
- 더 긴 빌드 타임아웃
- 더 안정적인 빌드

