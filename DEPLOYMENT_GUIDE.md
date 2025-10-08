# 🚀 무료 배포 가이드

## 📋 개요
- **프론트엔드**: Vercel (무료)
- **백엔드**: Render (무료 티어)
- **데이터베이스**: Render PostgreSQL (무료)
- **총 비용**: $0/월

## 🎯 1단계: Vercel 배포 (프론트엔드)

### 1.1 Vercel 계정 생성
1. [Vercel.com](https://vercel.com) 접속
2. GitHub 계정으로 로그인
3. "New Project" 클릭

### 1.2 프로젝트 연결
1. GitHub 저장소 선택: `suhyoungjoon/mobile_app`
2. Framework Preset: **Other**
3. Root Directory: `./` (루트 선택)
4. Build Command: `echo "Static build completed"`
5. Output Directory: `webapp`

### 1.3 환경 변수 설정 (선택사항)
```
VITE_API_URL=https://your-backend-url.onrender.com/api
```

### 1.4 배포
- "Deploy" 버튼 클릭
- 배포 완료 후 URL 확인 (예: `https://mobile-app-xxx.vercel.app`)

## 🎯 2단계: Render 배포 (백엔드)

### 2.1 Render 계정 생성
1. [Render.com](https://render.com) 접속
2. GitHub 계정으로 로그인
3. "New +" → "Web Service" 선택

### 2.2 서비스 설정
1. **Connect Repository**: `suhyoungjoon/mobile_app`
2. **Name**: `insighti-backend`
3. **Root Directory**: `backend`
4. **Environment**: `Node`
5. **Build Command**: `npm install`
6. **Start Command**: `npm start`

### 2.3 환경 변수 설정
```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=3d
```

### 2.4 배포
- "Create Web Service" 클릭
- 배포 완료 후 URL 확인 (예: `https://insighti-backend.onrender.com`)

## 🎯 3단계: 데이터베이스 설정 (Render PostgreSQL)

### 3.1 데이터베이스 생성
1. Render 대시보드에서 "New +" → "PostgreSQL"
2. **Name**: `insighti-db`
3. **Database**: `insighti_db`
4. **User**: `insighti_user`
5. **Plan**: Free

### 3.2 데이터베이스 초기화
```sql
-- Render PostgreSQL 연결 후 실행
\i backend/scripts/init-db.sql
```

### 3.3 백엔드 서비스에 데이터베이스 연결
1. 백엔드 서비스 → "Environment"
2. 다음 변수들이 자동으로 추가됨:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`

## 🎯 4단계: CORS 설정 업데이트

### 4.1 백엔드 CORS 업데이트
```javascript
// backend/server.js에서 CORS 설정 업데이트
const corsOptions = {
  origin: [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'https://your-frontend-url.vercel.app'  // 실제 Vercel URL로 변경
  ],
  credentials: true
};
```

### 4.2 프론트엔드 API URL 업데이트
```javascript
// webapp/js/api.js에서 백엔드 URL 업데이트
this.baseURL = 'https://your-backend-url.onrender.com/api';
```

## 🎯 5단계: 최종 테스트

### 5.1 프론트엔드 테스트
1. Vercel URL 접속
2. 로그인 테스트
3. 하자 등록 테스트
4. 보고서 생성 테스트

### 5.2 백엔드 API 테스트
```bash
# Health Check
curl https://your-backend-url.onrender.com/health

# API Documentation
curl https://your-backend-url.onrender.com/api
```

## 📱 PWA 설치 테스트

### 모바일에서 설치
1. 모바일 브라우저로 Vercel URL 접속
2. "홈 화면에 추가" 선택
3. 앱 아이콘이 홈 화면에 생성됨
4. 설치된 앱으로 실행 테스트

## 🔧 문제 해결

### 일반적인 문제
1. **CORS 에러**: 백엔드 CORS 설정 확인
2. **DB 연결 에러**: Render 데이터베이스 연결 정보 확인
3. **빌드 실패**: package.json 의존성 확인

### 로그 확인
- **Vercel**: 대시보드 → Functions → Logs
- **Render**: 대시보드 → Logs 탭

## 📊 모니터링

### 무료 티어 제한사항
- **Vercel**: 월 100GB 대역폭
- **Render**: 월 750시간 실행 시간
- **Render DB**: 1GB 저장공간

### 사용량 모니터링
- 각 서비스 대시보드에서 사용량 확인
- 한도 초과 시 유료 플랜으로 업그레이드

## 🚀 다음 단계

무료 티어로 테스트 후, 트래픽이 증가하면:
1. **Vercel Pro** ($20/월)
2. **Render Standard** ($7/월)
3. **Supabase Pro** ($25/월)

총 **$52/월**로 업그레이드 가능
