# 🔧 Render 빌드 오류 수정

## ❌ 발생한 오류

```
find: './node_modules/pg': No such file or directory
find: './node_modules/uuid': No such file or directory
find: './node_modules/express': No such file or directory
```

## 🔍 원인 분석

### 1. `npm ci` vs `npm install`
- **`npm ci`**: `package-lock.json`과 정확히 일치하는 버전만 설치
- **문제**: 일부 패키지의 postinstall 스크립트가 실패하거나, 패키지 검증 과정에서 오류 발생 가능

### 2. Render 빌드 검증
- Render는 빌드 후 일부 패키지 존재 여부를 확인하는 과정이 있을 수 있음
- `npm ci` 실패 시 `npm install`로 폴백하지만, 이 과정에서 일시적으로 패키지가 누락될 수 있음

### 3. 패키지 설치 순서
- 일부 패키지가 다른 패키지에 의존하는 경우, 설치 순서 문제로 일시적으로 누락될 수 있음

## ✅ 수정 사항

### 1. 빌드 명령어 변경
```yaml
# 변경 전
buildCommand: npm ci --prefer-offline --no-audit --loglevel=verbose || npm install --prefer-offline --no-audit --loglevel=verbose

# 변경 후
buildCommand: npm install --prefer-offline --no-audit --loglevel=verbose
```

**이유**:
- `npm install`이 더 유연하게 패키지를 설치
- `package-lock.json`이 있으면 동일한 버전을 설치하지만, 오류 발생 시 더 잘 처리
- Render 환경에서 더 안정적

### 2. .npmrc 설정 확인
- `ignore-scripts=false`: postinstall 스크립트 실행 (필요한 경우)
- 네트워크 재시도 설정 유지

## 📊 예상 빌드 시간

- **npm install**: 5-8분 (Puppeteer 포함)
- **패키지 검증**: 추가 시간 없음 (npm install이 자동으로 처리)

## 🎯 다음 배포

다음 배포부터:
1. `npm install`로 직접 설치
2. 더 안정적인 패키지 설치
3. 오류 발생 시 더 명확한 에러 메시지

---

## ⚠️ 참고사항

- `npm ci`는 프로덕션 환경에서 더 엄격하지만, Render의 빌드 환경에서는 `npm install`이 더 안정적일 수 있음
- `package-lock.json`이 있으면 `npm install`도 동일한 버전을 설치함
- 빌드 시간은 동일하게 5-8분 소요

