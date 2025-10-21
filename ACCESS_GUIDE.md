# 프론트엔드 접속 도메인 및 Admin 접속 방법

## 🌐 현재 배포 상태

### 백엔드 (Render)
- **URL**: https://mobile-app-new.onrender.com
- **상태**: ✅ 정상 작동 중
- **API 문서**: https://mobile-app-new.onrender.com/api
- **버전**: v2.3.0 (Phase 2 완료)

### 프론트엔드 (Vercel)
- **URL**: https://insightiprecheckmockupv1-qeaedv2yv-suh-young-joons-projects.vercel.app
- **상태**: 🔒 SSO 인증 보호 활성화됨
- **접근**: 인증된 사용자만 접근 가능

## 🔐 접속 방법

### 1. 일반 사용자 (입주자/회사)
```
메인 앱: https://insightiprecheckmockupv1-qeaedv2yv-suh-young-joons-projects.vercel.app
```

**접속 조건**:
- Vercel SSO 인증 필요
- 조직 멤버여야 함

### 2. 관리자 페이지
```
관리자 페이지: https://insightiprecheckmockupv1-qeaedv2yv-suh-young-joons-projects.vercel.app/admin.html
```

**접속 조건**:
- Vercel SSO 인증 필요
- 조직 멤버여야 함
- 관리자 권한 필요

### 3. 로컬 개발 환경
```bash
# 프론트엔드 로컬 실행
cd webapp
python3 -m http.server 8080

# 접속 URL
http://localhost:8080
http://localhost:8080/admin.html
```

## 🚨 현재 문제점

### 1. Vercel SSO 보호
- **문제**: 모든 페이지가 SSO 인증으로 보호됨
- **영향**: 외부 사용자 접근 불가
- **해결방법**: Vercel 대시보드에서 SSO 설정 비활성화 필요

### 2. 백엔드 API 버전 불일치
- **문제**: Render에 배포된 백엔드가 아직 v1.0.0
- **영향**: 새로운 장비점검 API 사용 불가
- **해결방법**: Render에 최신 코드 배포 필요

## 🔧 해결 방법

### 방법 1: Vercel SSO 비활성화 (권장)
1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - 프로젝트 선택

2. **Settings → Security**
   - SSO 설정 비활성화
   - 또는 특정 경로만 보호 설정

3. **재배포**
   - 변경사항 자동 배포됨

### 방법 2: Render 백엔드 업데이트
1. **Render 대시보드 접속**
   - https://dashboard.render.com
   - 백엔드 서비스 선택

2. **Manual Deploy**
   - 최신 커밋으로 수동 배포
   - 또는 GitHub 연동으로 자동 배포 설정

### 방법 3: 로컬 개발 환경 사용
```bash
# 백엔드 로컬 실행
cd backend
npm install
npm start

# 프론트엔드 로컬 실행
cd webapp
python3 -m http.server 8080

# 접속
http://localhost:8080
http://localhost:8080/admin.html
```

## 📊 사용자 유형별 접속 권한

| 사용자 유형 | 메인 앱 | Admin 페이지 | API 접근 |
|------------|---------|--------------|----------|
| **입주자** | ✅ (SSO 필요) | ❌ | ✅ (하자 관리만) |
| **회사/점검원** | ✅ (SSO 필요) | ❌ | ✅ (하자 + 장비점검) |
| **관리자** | ✅ (SSO 필요) | ✅ (SSO 필요) | ✅ (전체 권한) |

## 🎯 Phase 3 시작 전 준비사항

### 1. 즉시 해결 필요
- [ ] Vercel SSO 비활성화 또는 접근 권한 설정
- [ ] Render 백엔드 최신 버전 배포

### 2. Phase 3 개발 환경
- [ ] 로컬 개발 환경 설정
- [ ] 사용자 역할별 UI 테스트 환경 구축

### 3. 테스트 계정 준비
- [ ] 입주자 테스트 계정
- [ ] 회사/점검원 테스트 계정  
- [ ] 관리자 테스트 계정

## 💡 권장사항

**Phase 3 시작 전에 다음을 완료하세요:**

1. **Vercel SSO 설정 조정**
   - 개발/테스트를 위해 SSO 비활성화 고려
   - 또는 특정 경로만 보호 설정

2. **Render 백엔드 업데이트**
   - 최신 Phase 2 코드 배포
   - 새로운 API 엔드포인트 활성화

3. **로컬 개발 환경 구축**
   - 백엔드 + 프론트엔드 로컬 실행
   - Phase 3 UI 개발 및 테스트

**현재 상태**: Phase 2 완료, Phase 3 준비 중 (접속 환경 설정 필요)
