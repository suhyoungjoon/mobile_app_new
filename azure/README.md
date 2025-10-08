# Azure Deployment Guide for InsightI

이 가이드는 InsightI 애플리케이션을 Azure 클라우드에 배포하는 방법을 설명합니다.

## 아키텍처 개요

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

## 사전 요구사항

### 1. Azure CLI 설치
```bash
# macOS
brew install azure-cli

# Windows
winget install Microsoft.AzureCLI

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### 2. Docker 설치
```bash
# macOS
brew install docker

# Windows
winget install Docker.DockerDesktop

# Linux
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### 3. Azure 로그인
```bash
az login
az account set --subscription "your-subscription-id"
```

## 배포 방법

### 방법 1: 자동 배포 스크립트 (권장)

```bash
# 1. 환경 변수 설정
cp env.example .env
# .env 파일을 편집하여 실제 값으로 변경

# 2. 배포 실행
cd azure
./deploy.sh
```

### 방법 2: Azure Resource Manager 템플릿

```bash
# 1. 리소스 그룹 생성
az group create --name insighti-rg --location koreacentral

# 2. 템플릿 배포
az deployment group create \
  --resource-group insighti-rg \
  --template-file azure-resources.json \
  --parameters @azure-parameters.json
```

### 방법 3: Bicep 템플릿

```bash
# 1. 리소스 그룹 생성
az group create --name insighti-rg --location koreacentral

# 2. Bicep 배포
az deployment group create \
  --resource-group insighti-rg \
  --template-file azure-resources.bicep \
  --parameters appName=insighti dbPassword=your-secure-password
```

## 환경 변수 설정

### 필수 환경 변수
```bash
# Azure 설정
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP=insighti-rg
AZURE_LOCATION=koreacentral

# 데이터베이스
DB_PASSWORD=your-secure-password

# JWT
JWT_SECRET=your-jwt-secret

# SMS (네이버 클라우드 플랫폼)
SMS_SERVICE_ID=your-service-id
SMS_ACCESS_KEY=your-access-key
SMS_SECRET_KEY=your-secret-key
SMS_FROM_NUMBER=01012345678
```

## 생성되는 Azure 리소스

### 1. Container Registry (ACR)
- **이름**: `insightiacr`
- **SKU**: Basic
- **용도**: Docker 이미지 저장

### 2. App Service Plan
- **이름**: `insighti-plan`
- **SKU**: B1 (Basic)
- **OS**: Linux

### 3. Web Apps
- **Backend**: `insighti-backend`
- **Frontend**: `insighti-frontend`
- **런타임**: Docker 컨테이너

### 4. PostgreSQL Flexible Server
- **이름**: `insighti-postgres`
- **버전**: PostgreSQL 15
- **SKU**: Standard_B1ms
- **스토리지**: 32GB

## 배포 후 설정

### 1. 프론트엔드 API URL 업데이트
```javascript
// webapp/js/api.js
const api = new APIClient();
api.baseURL = 'https://your-backend-app.azurewebsites.net/api';
```

### 2. CORS 설정 확인
```javascript
// backend/server.js
app.use(cors({
  origin: [
    'https://your-frontend-app.azurewebsites.net',
    'http://localhost:8080'
  ],
  credentials: true
}));
```

### 3. 데이터베이스 마이그레이션
```bash
# Azure PostgreSQL에 연결하여 스키마 생성
psql "host=insighti-postgres.postgres.database.azure.com port=5432 dbname=insighti_db user=postgres password=your-password sslmode=require"
```

## 모니터링 및 로깅

### 1. Application Insights 설정
```bash
# Application Insights 생성
az monitor app-insights component create \
  --app insighti-insights \
  --location koreacentral \
  --resource-group insighti-rg
```

### 2. 로그 스트리밍
```bash
# 백엔드 로그 확인
az webapp log tail --name insighti-backend --resource-group insighti-rg

# 프론트엔드 로그 확인
az webapp log tail --name insighti-frontend --resource-group insighti-rg
```

## 보안 설정

### 1. SSL 인증서
```bash
# App Service Managed Certificate 사용
az webapp config ssl bind \
  --certificate-thumbprint {thumbprint} \
  --ssl-type SNI \
  --name insighti-backend \
  --resource-group insighti-rg
```

### 2. 방화벽 규칙
```bash
# PostgreSQL 방화벽 규칙 추가
az postgres flexible-server firewall-rule create \
  --resource-group insighti-rg \
  --name insighti-postgres \
  --rule-name AllowAppService \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## 백업 및 복구

### 1. 데이터베이스 백업
```bash
# 자동 백업 설정 (이미 활성화됨)
# 백업 보존 기간: 7일
# 지역 중복 백업: 비활성화
```

### 2. 파일 스토리지 백업
```bash
# Azure Storage Account 생성
az storage account create \
  --name insightistorage \
  --resource-group insighti-rg \
  --location koreacentral \
  --sku Standard_LRS
```

## 비용 최적화

### 1. 리소스 크기 조정
- **App Service Plan**: B1 → F1 (개발용)
- **PostgreSQL**: Standard_B1ms → Burstable_B1ms
- **Container Registry**: Basic → Standard (필요시)

### 2. 자동 스케일링
```bash
# App Service Plan 자동 스케일링 설정
az monitor autoscale create \
  --resource insighti-plan \
  --resource-group insighti-rg \
  --resource-type Microsoft.Web/serverfarms \
  --name insighti-autoscale \
  --min-count 1 \
  --max-count 3 \
  --count 1
```

## 문제 해결

### 1. 일반적인 문제
- **컨테이너 시작 실패**: 로그 확인 및 환경 변수 검증
- **데이터베이스 연결 실패**: 방화벽 규칙 및 연결 문자열 확인
- **CORS 오류**: 프론트엔드 URL을 CORS 설정에 추가

### 2. 로그 확인
```bash
# 실시간 로그 스트리밍
az webapp log tail --name insighti-backend --resource-group insighti-rg

# 로그 다운로드
az webapp log download --name insighti-backend --resource-group insighti-rg
```

### 3. 성능 모니터링
```bash
# Application Insights 쿼리
az monitor app-insights query \
  --app insighti-insights \
  --resource-group insighti-rg \
  --analytics-query "requests | summarize count() by bin(timestamp, 1h)"
```

## CI/CD 파이프라인

### 1. GitHub Actions 설정
```yaml
# .github/workflows/azure-deploy.yml
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

### 2. Azure DevOps 파이프라인
```yaml
# azure-pipelines.yml
trigger:
- main
pool:
  vmImage: 'ubuntu-latest'
steps:
- task: Docker@2
  inputs:
    containerRegistry: 'insightiacr'
    repository: 'insighti-backend'
    command: 'buildAndPush'
    Dockerfile: 'backend/Dockerfile'
```

## 지원 및 문의

- **Azure 문서**: https://docs.microsoft.com/azure/
- **App Service 문서**: https://docs.microsoft.com/azure/app-service/
- **PostgreSQL 문서**: https://docs.microsoft.com/azure/postgresql/
- **Container Registry 문서**: https://docs.microsoft.com/azure/container-registry/
