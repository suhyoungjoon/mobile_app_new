# InsightI - 공사하자보수관리 앱 Enhanced v2

기획서 요구사항을 반영한 하자 표준 데이터베이스와 YouTube 동영상 기반 하자 확인 시스템을 포함한 공사하자보수관리 모바일 웹앱입니다.

**📖 사용·운영 메뉴얼**: [MANUAL.md](./MANUAL.md) — 접속 방법, 역할별 사용법, 보고서 정책, 프로젝트 구조, 로컬/배포 요약

## 🚀 프로젝트 개요

InsightI는 건설 현장에서 발생하는 하자를 체계적으로 관리하고 보고서를 자동 생성하는 시스템입니다.

### 주요 기능 (v4.0.0) ✅ 모든 기능 구현 완료

#### 핵심 기능
- **하자 표준 데이터베이스**: 10가지 하자 유형별 표준 설명 및 해결방법
- **하자명 자동 선택**: 드롭다운에서 하자명 선택 시 자동 설명 표시
- **YouTube 실시간 검색**: 하자명 기반 동영상 자동 검색 및 재생 ✅
- **하자 등록**: 위치, 세부공정, 내용, 사진 등록
- **사진 촬영**: 전체사진/근접사진 촬영 및 저장
- **실시간 동기화**: 클라우드 기반 데이터 관리

#### 장비 점검 기능 (점검원 전용) ✅
- **열화상 점검**: 열화상 이미지 업로드 및 저장
- **공기질 측정**: TVOC, HCHO, CO₂ 수치 입력
- **라돈 측정**: 라돈값 입력 (단위 선택 가능)
- **레벨기 측정**: 좌/우 수치 입력 및 판정

#### 점검원 관리 시스템 ✅
- **점검원 등록 신청**: 입주자가 점검원으로 등록 신청
- **관리자 승인/거부**: 관리자가 신청을 검토하고 승인/거부
- **자동 권한 부여**: 승인 시 자동으로 점검원 권한 부여

#### 보고서 시스템 ✅
- **종합 보고서 생성**: 하자 및 장비 점검 결과 통합 보고서
- **PDF 생성**: html-pdf를 사용한 경량 PDF 생성
- **보고서 미리보기**: 생성 전 내용 확인 가능

#### 관리자 기능 ✅
- **사용자 관리**: 사용자 목록 조회, 유형 변경, 비활성화
- **하자 관리**: 하자 목록 조회, 상세 정보, 상태 변경
- **점검원 관리**: 점검원 등록 신청 승인/거부
- **AI 판정 설정**: 다중 AI 엔진 설정 및 관리 ✅
- **대시보드**: 통계 및 요약 정보 표시
- **푸시 알림 설정**: 관리자 푸시 알림 수동 활성화 ✅

#### AI 판정 시스템 (다중 엔진 지원) ✅
- **로컬 규칙 기반**: 이미지 통계 분석 (무료, 빠름)
- **Hugging Face**: 오픈소스 AI 모델 (무료 할당량 내)
- **Azure OpenAI**: GPT-4 Vision (유료, 고정확도)
- **하이브리드 모드**: 로컬 우선, 신뢰도 낮을 때 클라우드 호출 (비용 절감)

#### 푸시 알림 시스템 ✅
- **VAPID Web Push**: 브라우저 기반 푸시 알림 (완전 무료)
- **다양한 알림 유형**: 
  - 하자 등록 알림 (관리자에게)
  - 점검 완료 알림 (입주자에게)
  - 점검원 승인/거부 알림 (신청자에게)
  - 보고서 생성 완료 알림 (사용자에게)

#### 보안 기능 ✅
- **개인정보 암호화**: AES-256-CBC 암호화 저장
- **JWT 인증**: 토큰 기반 인증 시스템
- **역할 기반 접근 제어**: 입주자/점검원/관리자 권한 분리
- **HTTPS 강제**: 프로덕션 환경 HTTPS 통신

#### 모바일 최적화
- **PWA 지원**: Progressive Web App 기능
- **반응형 디자인**: 모바일/태블릿/데스크톱 지원
- **오프라인 지원**: Service Worker 기반 캐싱

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
├── MANUAL.md               # 사용·운영 통합 메뉴얼 (역할별, 보고서, 접속, 구조)
└── README.md               # 이 파일
```

### 문서 정리
| 문서 | 용도 |
|------|------|
| **MANUAL.md** | 일상 사용·운영용 통합 메뉴얼 (접속, 역할별 흐름, 보고서, 로컬/배포) |
| **README.md** | 프로젝트 소개, 기능 목록, 아키텍처, 설치 개요 |
| **ACCESS_GUIDE.md** | 접속 URL, SSO 등 상세 접속 방법 |
| **DEPLOYMENT_GUIDE.md** | Vercel/Render 배포 절차 |
| **INSPECTOR_SCREEN_GUIDE.md** | 점검원 화면 상세 (일부는 MANUAL.md 4.2와 동일) |
| **ADMIN_MANUAL.md** | 관리자 기능 상세 |

## ✨ v4.0.0 주요 업데이트

### 🗄️ 하자 표준 데이터베이스
- **10가지 하자 유형**: 벽지찢김, 벽균열, 마루판들뜸, 타일균열, 페인트벗겨짐, 천장누수, 욕실곰팡이, 문틀변형, 콘센트불량, 창문잠금불량
- **표준 설명**: 각 하자 유형별 상세 설명 및 해결방법 제공
- **카테고리 분류**: 벽체, 바닥, 천장, 도장, 타일, 기타로 분류

### 🎥 YouTube 실시간 검색 ✅
- **하자명 기반 자동 검색**: 하자명 선택 시 YouTube API로 실시간 검색
- **동영상 목록 표시**: 검색된 동영상 목록을 자동으로 표시
- **임베드 플레이어**: 웹앱 내에서 직접 YouTube 동영상 재생

### 📱 개선된 UI/UX
- **고객정보 표시**: 하자 등록 화면 상단에 고객 정보 자동 표시
- **하자명 드롭다운**: 카테고리별 그룹화된 하자명 선택
- **자동 설명 표시**: 하자명 선택 시 즉시 설명 및 해결방법 표시
- **재촬영 기능**: 사진 재촬영 버튼 추가
- **역할 기반 UI**: 입주자/점검원/관리자에 따라 다른 화면 표시

### 🔧 API 확장
- **하자 관리**: `/api/defects` 하자 등록 및 조회
- **장비 점검**: `/api/inspections/*` 열화상, 공기질, 라돈, 레벨기
- **점검원 관리**: `/api/inspector-registration/*` 등록 신청 및 승인
- **관리자 기능**: `/api/admin/*` 사용자, 하자, 점검원 관리
- **AI 판정**: `/api/ai-detection/*` 다중 엔진 AI 판정
- **푸시 알림**: `/api/push/*` 푸시 알림 구독 및 발송
- **YouTube 검색**: `/api/youtube/search` 실시간 동영상 검색

## 🛠️ 기술 스택

### Backend
- **Node.js** + Express.js
- **PostgreSQL** (Render PostgreSQL)
- **html-pdf** (PDF 생성, 경량화)
- **Sharp** (이미지 처리)
- **JWT** (인증)
- **web-push** (푸시 알림)
- **crypto** (개인정보 암호화)
- **axios** (외부 API 호출)

### Frontend
- **Vanilla JavaScript** (ES6+)
- **CSS3** (반응형 디자인)
- **Service Worker** (PWA, 푸시 알림)
- **Web Push API** (브라우저 푸시 알림)

### AI/ML
- **Azure OpenAI** (GPT-4 Vision)
- **Hugging Face Inference API** (오픈소스 모델)
- **로컬 규칙 기반 분석** (이미지 통계 분석)

### Infrastructure
- **Vercel** (프론트엔드 호스팅)
- **Render** (백엔드 호스팅)
- **Render PostgreSQL** (데이터베이스)
- **YouTube Data API v3** (동영상 검색)

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
- `POST /api/auth/session` - 로그인 (JWT 토큰 발급)

### 케이스 관리
- `GET /api/cases` - 케이스 목록 조회
- `POST /api/cases` - 케이스 생성
- `GET /api/cases/:id` - 케이스 상세 조회

### 하자 관리
- `POST /api/defects` - 하자 등록
- `GET /api/defects` - 하자 목록 조회
- `GET /api/defect-categories` - 하자 카테고리 조회

### 장비 점검 (점검원 전용)
- `POST /api/inspections/thermal` - 열화상 점검 등록
- `POST /api/inspections/air` - 공기질 측정 등록
- `POST /api/inspections/radon` - 라돈 측정 등록
- `POST /api/inspections/level` - 레벨기 측정 등록
- `GET /api/inspections/items` - 점검 항목 조회
- `DELETE /api/inspections/items/:id` - 점검 항목 삭제

### 점검원 관리
- `POST /api/inspector-registration/register` - 점검원 등록 신청
- `GET /api/inspector-registration/list` - 등록 신청 목록 (관리자)
- `POST /api/inspector-registration/:id/approve` - 승인 (관리자)
- `POST /api/inspector-registration/:id/reject` - 거부 (관리자)

### 관리자 기능
- `POST /api/admin/login` - 관리자 로그인
- `GET /api/admin/users` - 사용자 목록
- `PUT /api/admin/users/:id/type` - 사용자 유형 변경
- `GET /api/admin/defects` - 하자 목록 (관리자)
- `GET /api/admin/inspectors` - 점검원 등록 신청 목록
- `GET /api/admin/stats` - 통계 정보

### AI 판정
- `GET /api/ai-detection/settings` - AI 설정 조회 (관리자)
- `PUT /api/ai-detection/settings` - AI 설정 업데이트 (관리자)
- `POST /api/ai-detection/detect` - AI 판정 실행

### 푸시 알림
- `GET /api/push/vapid-key` - VAPID 공개키 조회
- `POST /api/push/subscribe` - 푸시 구독 등록
- `POST /api/push/defect-registered` - 하자 등록 알림 발송
- `POST /api/push/inspection-completed` - 점검 완료 알림 발송
- `POST /api/push/inspector-decision` - 점검원 승인 알림 발송
- `POST /api/push/report-generated` - 보고서 생성 알림 발송

### YouTube 검색
- `GET /api/youtube/search` - 하자명 기반 동영상 검색

### 파일 업로드
- `POST /api/upload/photo` - 사진 업로드
- `GET /api/upload/photo/:filename` - 사진 조회

### 보고서
- `GET /api/reports/preview` - 보고서 미리보기
- `POST /api/reports/generate` - PDF 생성
- `POST /api/reports/send` - 보고서 발송

### SMS (선택사항)
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

## 🔒 보안 ✅ 구현 완료

### 인증 및 권한
- **JWT 토큰 기반 인증**: 토큰 기반 인증 시스템
- **3일 만료 시간**: 토큰 자동 만료
- **세대별 데이터 격리**: household_id 기반 데이터 격리
- **역할 기반 접근 제어**: 입주자/점검원/관리자 권한 분리

### 데이터 보호 ✅
- **개인정보 암호화**: AES-256-CBC 암호화 저장
  - 암호화 대상: 이름, 전화번호, 이메일, 점검원 이름
  - 자동 암호화/복호화: API 레벨에서 자동 처리
- **HTTPS 통신**: 프로덕션 환경 HTTPS 강제
- **파일 업로드 검증**: 파일 형식 및 크기 검증
- **로그 마스킹**: 개인정보 로그 자동 마스킹

### 인프라 보안
- **Vercel SSL**: 자동 SSL 인증서
- **Render 보안**: 환경변수 기반 설정 관리
- **데이터베이스 접근 제어**: 연결 수 제한 및 백업

## 💰 비용 최적화 ✅

### 현재 운영 비용 (실제)
- **프론트엔드 (Vercel)**: $0-$20/월 (플랜에 따라)
- **백엔드 (Render Starter)**: $7/월
- **데이터베이스 (Render PostgreSQL Starter)**: $7/월
- **AI 판정**: $0-$20/월 (설정에 따라)
  - 하이브리드 모드 (로컬+Hugging Face): $0/월
  - 하이브리드 모드 (로컬+Azure): $6-$10/월
  - Azure OpenAI만: $20/월
- **푸시 알림**: $0/월 (완전 무료)
- **개인정보 암호화**: $0/월 (로컬 처리)
- **YouTube 검색**: $0/월 (무료 할당량 내)
- **총 비용**: 약 $14.50-$54.50/월 (약 19,600원-73,600원)

### 비용 절감 방법 ✅
- **하이브리드 AI 모드**: 로컬+Hugging Face 조합으로 $0/월 운영 가능
- **푸시 알림 활용**: SMS 대비 $0.50/월 절감
- **로컬 암호화**: 클라우드 암호화 서비스 대비 추가 비용 없음
- **최소 구성**: 약 $34.60/월 (약 46,800원/월)로 운영 가능

> 자세한 비용 분석은 [PRODUCTION_COST_ANALYSIS.md](PRODUCTION_COST_ANALYSIS.md) 참조

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

### v4.0.0 (2025-11-10) ✅ 최신 버전
- **AI 판정 다중 엔진 지원**: 로컬/Hugging Face/Azure/하이브리드 모드
- **푸시 알림 시스템**: VAPID Web Push 완전 구현
- **개인정보 암호화**: AES-256-CBC 암호화 저장
- **YouTube 실시간 검색**: 하자명 기반 동영상 자동 검색
- **관리자 AI 판정 설정**: 관리자 페이지에서 AI 설정 관리
- **관리자 푸시 알림**: 관리자 대시보드에서 푸시 알림 수동 활성화
- **보고서 생성 개선**: html-pdf로 경량화

### v3.0.1 (2025-11-09)
- 점검원 등록 및 승인 시스템 구현
- 장비 점검 기능 완성 (열화상, 공기질, 라돈, 레벨기)
- 종합 보고서 생성 기능
- 관리자 기능 통합

### v2.3.0 (2025-10-21)
- 데이터베이스 스키마 확장 (Phase 1)
- 장비 점검 테이블 추가
- 사용자 유형 확장 (resident/company/admin)

### v1.0.0 (2024-01-XX)
- 초기 버전 릴리스
- 기본 하자 관리 기능
- PDF 보고서 생성
- SMS 알림 기능
- Azure 클라우드 배포 지원

---

## 📚 추가 문서

- [사용자 매뉴얼](USER_MANUAL.md) - 사용자를 위한 상세 가이드
- [관리자 매뉴얼](ADMIN_MANUAL.md) - 관리자를 위한 운영 가이드
- [비용 분석](PRODUCTION_COST_ANALYSIS.md) - 상용 서비스 비용 분석
- [기능 테스트 가이드](FEATURE_TEST_GUIDE.md) - 기능별 테스트 가이드
- [배포 가이드](DEPLOYMENT_GUIDE.md) - 배포 방법 안내

---

**InsightI** - 공사하자보수관리를 위한 스마트 솔루션 🏠✨