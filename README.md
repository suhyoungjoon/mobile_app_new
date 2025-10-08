# InsightI - 공사하자보수관리 앱

Azure 클라우드 기반의 공사하자보수관리 모바일 웹앱입니다.

## 🚀 프로젝트 개요

InsightI는 건설 현장에서 발생하는 하자를 체계적으로 관리하고 보고서를 자동 생성하는 시스템입니다.

### 주요 기능
- **하자 등록**: 위치, 세부공정, 내용, 사진 등록
- **실시간 동기화**: 클라우드 기반 데이터 관리
- **보고서 생성**: PDF 형태의 종합보고서 자동 생성
- **SMS 알림**: 보고서 발송 시 자동 알림
- **모바일 최적화**: 반응형 웹 디자인

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   PostgreSQL    │
│   (Web App)     │◄──►│   (Web App)     │◄──►│   (Flexible)    │
│   nginx:alpine  │    │   node:alpine   │    │   PostgreSQL 15 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Container       │
                    │ Registry (ACR)  │
                    └─────────────────┘
```

## 📁 프로젝트 구조

```
insighti_precheck_mockup_v1/
├── backend/                 # Node.js API 서버
│   ├── routes/             # API 라우트
│   ├── utils/              # 유틸리티 함수
│   ├── templates/          # PDF 템플릿
│   ├── scripts/            # 데이터베이스 스크립트
│   ├── Dockerfile          # 백엔드 컨테이너
│   └── package.json        # 의존성
├── webapp/                 # 프론트엔드 웹앱
│   ├── css/                # 스타일시트
│   ├── js/                 # JavaScript
│   ├── Dockerfile          # 프론트엔드 컨테이너
│   └── nginx.conf          # Nginx 설정
├── azure/                  # Azure 배포 파일
│   ├── deploy.sh           # 배포 스크립트
│   ├── azure-resources.bicep # Bicep 템플릿
│   └── azure-resources.json  # ARM 템플릿
├── scripts/                # 테스트 스크립트
├── docker-compose.yml      # 로컬 개발 환경
└── README.md               # 이 파일
```

## 🛠️ 기술 스택

### Backend
- **Node.js** + Express.js
- **PostgreSQL** (Azure Flexible Server)
- **Puppeteer** (PDF 생성)
- **Sharp** (이미지 처리)
- **JWT** (인증)

### Frontend
- **Vanilla JavaScript** (ES6+)
- **CSS3** (반응형 디자인)
- **Nginx** (웹 서버)

### Infrastructure
- **Azure App Service** (웹 호스팅)
- **Azure Container Registry** (이미지 저장)
- **Azure PostgreSQL** (데이터베이스)
- **Docker** (컨테이너화)

## 🚀 빠른 시작

### 1. 로컬 개발 환경

```bash
# 저장소 클론
git clone <repository-url>
cd insighti_precheck_mockup_v1

# 환경 변수 설정
cp env.example .env
# .env 파일을 편집하여 실제 값으로 변경

# Docker Compose로 전체 시스템 실행
docker-compose up -d

# 브라우저에서 접속
# Frontend: http://localhost:8080
# Backend: http://localhost:3000
```

### 2. Azure 클라우드 배포

```bash
# Azure CLI 설치 및 로그인
az login
az account set --subscription "your-subscription-id"

# 자동 배포 실행
cd azure
./deploy.sh
```

## 📋 API 엔드포인트

### 인증
- `POST /api/auth/session` - 로그인

### 케이스 관리
- `GET /api/cases` - 케이스 목록
- `POST /api/cases` - 케이스 생성

### 하자 관리
- `POST /api/defects` - 하자 등록

### 파일 업로드
- `POST /api/upload/photo` - 사진 업로드
- `GET /api/upload/photo/:filename` - 사진 조회

### 보고서
- `GET /api/reports/preview` - 보고서 미리보기
- `POST /api/reports/generate` - PDF 생성
- `POST /api/reports/send` - 보고서 발송

### SMS
- `POST /api/sms/send` - SMS 발송
- `GET /api/sms/status` - SMS 서비스 상태

## 🧪 테스트

### 전체 시스템 테스트
```bash
cd backend
npm run test-full
```

### 개별 컴포넌트 테스트
```bash
# 데이터베이스 테스트
npm run test-db

# 파일 업로드 테스트
npm run test-upload

# PDF 생성 테스트
npm run test-pdf

# SMS 발송 테스트
npm run test-sms

# Docker 컨테이너 테스트
npm run test-docker
```

## 🔧 개발 가이드

### 백엔드 개발
```bash
cd backend
npm install
npm run dev
```

### 프론트엔드 개발
```bash
cd webapp
python -m http.server 8080
```

### 데이터베이스 설정
```bash
cd backend
npm run setup-db
```

## 📊 모니터링

### 로그 확인
```bash
# Azure App Service 로그
az webapp log tail --name insighti-backend --resource-group insighti-rg

# Docker 컨테이너 로그
docker-compose logs -f backend
```

### 성능 모니터링
- **Application Insights**: Azure 포털에서 확인
- **PostgreSQL 메트릭**: Azure Monitor에서 확인
- **App Service 메트릭**: Azure 포털에서 확인

## 🔒 보안

### 인증 및 권한
- JWT 토큰 기반 인증
- 3일 만료 시간
- 세대별 데이터 격리

### 데이터 보호
- HTTPS 통신
- 데이터베이스 암호화
- 파일 업로드 검증

### Azure 보안
- 방화벽 규칙
- SSL 인증서
- 관리형 서비스 ID

## 💰 비용 최적화

### 예상 월 비용 (한국 중부)
- **App Service Plan (B1)**: $13.14
- **PostgreSQL Flexible Server (Standard_B1ms)**: $25.55
- **Container Registry (Basic)**: $5.00
- **총 예상 비용**: 약 $43.69/월

### 비용 절감 방법
- 개발 환경에서는 F1 플랜 사용
- 자동 스케일링 설정
- 불필요한 리소스 정리

## 🚀 배포 파이프라인

### CI/CD 설정
```yaml
# GitHub Actions 예시
name: Deploy to Azure
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Azure
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'insighti-backend'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
```

## 📚 문서

- [백엔드 API 문서](backend/README.md)
- [프론트엔드 가이드](webapp/README.md)
- [Azure 배포 가이드](azure/README.md)
- [원본 기획서](공사하자보수관리%20앱_기획.pdf)

## 🤝 기여

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 지원

- **이슈 리포트**: GitHub Issues
- **문서**: 프로젝트 README 파일들
- **Azure 지원**: Azure 포털 또는 지원 티켓

## 🔄 업데이트 로그

### v1.0.0 (2024-01-XX)
- 초기 버전 릴리스
- 기본 하자 관리 기능
- PDF 보고서 생성
- SMS 알림 기능
- Azure 클라우드 배포 지원

---

**InsightI** - 공사하자보수관리를 위한 스마트 솔루션