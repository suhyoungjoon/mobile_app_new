# 🚀 Render 백엔드 배포 가이드

## 📋 Render 웹 인터페이스를 통한 배포

### 1. Render 계정 생성
1. [Render.com](https://render.com) 접속
2. "Get Started for Free" 클릭
3. GitHub 계정으로 로그인

### 2. 백엔드 서비스 생성
1. "New +" → "Web Service" 선택
2. **Connect Repository**: `suhyoungjoon/mobile_app` 선택
3. **Name**: `insighti-backend`
4. **Root Directory**: `backend`
5. **Environment**: `Node`
6. **Build Command**: `npm install`
7. **Start Command**: `npm start`

### 3. 환경 변수 설정
다음 환경 변수들을 추가하세요:

```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here-change-this
JWT_EXPIRES_IN=3d
```

### 4. 데이터베이스 생성
1. "New +" → "PostgreSQL" 선택
2. **Name**: `insighti-db`
3. **Database**: `insighti_db`
4. **User**: `insighti_user`
5. **Plan**: Free

### 5. 백엔드 서비스에 데이터베이스 연결
1. 백엔드 서비스 → "Environment" 탭
2. "Add Environment Variable" 클릭
3. 다음 변수들이 자동으로 추가됨:
   - `DB_HOST` (자동)
   - `DB_PORT` (자동)
   - `DB_NAME` (자동)
   - `DB_USER` (자동)
   - `DB_PASSWORD` (자동)

### 6. 배포
1. "Create Web Service" 클릭
2. 배포 완료 후 URL 확인 (예: `https://insighti-backend.onrender.com`)

## 🔗 연결 정보
- **프론트엔드**: https://insightiprecheckmockupv1-qeaedv2yv-suh-young-joons-projects.vercel.app
- **백엔드**: https://insighti-backend.onrender.com (배포 후 확인)
- **데이터베이스**: Render PostgreSQL (자동 연결)

## 📱 테스트 방법
1. 프론트엔드 URL 접속
2. 로그인 테스트
3. 하자 등록 테스트
4. 보고서 생성 테스트
