# 🔍 Render 서비스 이름 확인 가이드

## 📊 현재 설정 확인

### Git 저장소
- **저장소**: `suhyoungjoon/mobile_app_new`
- **확인**: `git remote -v` 결과 확인됨

### Render 서비스 설정
- **render.yaml 서비스 이름**: `insighti-backend-v2`
- **실제 Render Dashboard 서비스 이름**: 확인 필요

---

## ✅ 이름이 달라도 문제 없음

### Render 동작 방식
1. **Git 저장소 연결**: GitHub 저장소를 연결
2. **서비스 이름**: 별도로 설정 가능 (저장소 이름과 무관)
3. **render.yaml**: 서비스 이름을 정의 (선택사항)

### 중요한 것
- ✅ **Git 저장소 연결**: 올바른 저장소가 연결되어 있으면 됨
- ✅ **서비스 이름**: 저장소 이름과 달라도 문제 없음
- ✅ **render.yaml**: 서비스 이름이 일치하면 자동 적용

---

## 🔍 확인 방법

### 1. Render Dashboard 확인
1. **Render Dashboard 접속**
   - https://dashboard.render.com
   - `insighti-backend-v2` 서비스 선택

2. **Settings 탭 확인**
   - **Repository**: `suhyoungjoon/mobile_app_new` 확인
   - **Name**: `insighti-backend-v2` 확인

3. **일치 여부 확인**
   - Repository가 올바르게 연결되어 있으면 ✅
   - 서비스 이름은 저장소 이름과 달라도 됨

---

## ⚠️ 문제가 될 수 있는 경우

### 1. render.yaml과 Dashboard 서비스 이름 불일치
- **render.yaml**: `name: insighti-backend-v2`
- **Dashboard**: 다른 이름 (예: `mobile-app-new`)

**해결**:
- Dashboard에서 서비스 이름을 `insighti-backend-v2`로 변경
- 또는 `render.yaml`의 `name`을 Dashboard 이름과 일치

### 2. Git 저장소 연결 오류
- Dashboard에서 다른 저장소가 연결되어 있는 경우

**해결**:
- Dashboard → Settings → Repository 변경
- 올바른 저장소(`suhyoungjoon/mobile_app_new`)로 연결

---

## 🎯 확인 체크리스트

### Render Dashboard에서 확인:
- [ ] **Repository**: `suhyoungjoon/mobile_app_new` ✅
- [ ] **Name**: `insighti-backend-v2` (또는 다른 이름)
- [ ] **Root Directory**: `backend` ✅
- [ ] **Build Command**: `npm install` ✅

### render.yaml 확인:
- [ ] **name**: `insighti-backend-v2`
- [ ] **rootDir**: `backend` ✅

---

## 💡 권장사항

### 옵션 1: Dashboard 서비스 이름 확인 (현재 상태 유지)
- Dashboard에서 서비스 이름이 `insighti-backend-v2`인지 확인
- 일치하면 문제 없음

### 옵션 2: render.yaml 수정 (Dashboard 이름에 맞춤)
- Dashboard에서 실제 서비스 이름 확인
- `render.yaml`의 `name`을 Dashboard 이름과 일치

### 옵션 3: Dashboard 이름 변경 (render.yaml에 맞춤)
- Dashboard → Settings → Name 변경
- `insighti-backend-v2`로 변경

---

## 🔄 수정이 필요한 경우

### render.yaml 수정 예시
```yaml
services:
  - type: web
    name: mobile-app-new  # Dashboard 이름과 일치
    runtime: node
    ...
```

또는

### Dashboard 이름 변경
1. Render Dashboard → Settings
2. Name을 `insighti-backend-v2`로 변경
3. Save Changes

---

## ✅ 결론

### 현재 상태
- Git 저장소: `suhyoungjoon/mobile_app_new` ✅
- render.yaml 서비스 이름: `insighti-backend-v2`
- **문제 없음**: 저장소 이름과 서비스 이름이 달라도 됨

### 확인 필요
- Render Dashboard에서 실제 서비스 이름 확인
- `render.yaml`의 `name`과 일치하는지 확인

---

## 🎯 다음 단계

1. **Render Dashboard에서 서비스 이름 확인**
2. **render.yaml의 `name`과 일치하는지 확인**
3. **불일치 시 수정** (Dashboard 또는 render.yaml)
4. **재배포 테스트**

