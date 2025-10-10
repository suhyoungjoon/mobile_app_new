# 🌐 Azure OpenAI Service 설정 가이드

Azure OpenAI를 사용하여 **학습 없이** 바로 하자 이미지를 분석하는 완벽한 가이드입니다!

---

## 🎯 **왜 Azure OpenAI인가?**

| 장점 | 설명 |
|------|------|
| **즉시 사용** | 학습 데이터 불필요, GPT-4 Vision 바로 사용 |
| **높은 정확도** | GPT-4의 강력한 이미지 인식 능력 |
| **자세한 설명** | 하자 유형뿐만 아니라 설명, 보수방법까지 자동 생성 |
| **데이터 보안** | Azure 한국 리전, 엔터프라이즈급 보안 |
| **개인정보 보호** | 학습에 절대 사용 안 됨 (OpenAI와의 차이점) |

---

## 📋 **1단계: Azure 계정 및 리소스 생성**

### **1-1. Azure 계정 만들기**

1. https://azure.microsoft.com/ko-kr/ 접속
2. **"무료로 시작하기"** 클릭
3. Microsoft 계정으로 로그인 (없으면 생성)
4. 신용카드 등록 (무료 크레딧 $200 제공)

### **1-2. Azure OpenAI 액세스 신청**

⚠️ **중요**: Azure OpenAI는 별도 승인이 필요합니다!

1. https://aka.ms/oai/access 접속
2. **"Request Access"** 클릭
3. 신청 양식 작성:
   - **Use Case**: Construction defect detection and analysis
   - **Company**: (회사명 또는 개인)
   - **Expected Monthly Usage**: Small (< $100)
   - **Region**: Korea Central (한국)
4. 승인 대기 (보통 1-3일 소요)

---

## 🚀 **2단계: Azure OpenAI 리소스 생성**

### **2-1. Azure Portal에서 리소스 생성**

1. https://portal.azure.com 접속
2. **"리소스 만들기"** 클릭
3. **"Azure OpenAI"** 검색 및 선택
4. **설정**:
   ```
   구독: (기본 구독)
   리소스 그룹: insighti-rg (새로 만들기)
   지역: Korea Central
   이름: insighti-openai
   가격 책정 계층: Standard S0
   ```
5. **"검토 + 만들기"** → **"만들기"** 클릭

### **2-2. GPT-4 Vision 모델 배포**

1. 생성된 리소스로 이동
2. 좌측 메뉴에서 **"Model deployments"** 선택
3. **"Create new deployment"** 클릭
4. **설정**:
   ```
   모델: gpt-4 (vision-preview)
   배포 이름: gpt-4-vision
   모델 버전: 최신 버전
   배포 유형: Standard
   토큰 속도 제한: 10K TPM (분당 토큰)
   ```
5. **"만들기"** 클릭

---

## 🔑 **3단계: API 키 및 엔드포인트 확인**

### **3-1. 엔드포인트 확인**

1. Azure OpenAI 리소스 페이지
2. 좌측 메뉴 **"Keys and Endpoint"** 선택
3. **Endpoint** 복사:
   ```
   예시: https://insighti-openai.openai.azure.com/
   ```

### **3-2. API 키 복사**

1. **KEY 1** 또는 **KEY 2** 중 하나 복사
2. **안전하게 보관** (절대 공개하지 말 것!)

---

## ⚙️ **4단계: 백엔드 환경 변수 설정**

### **4-1. Render 환경 변수 추가**

1. **Render 대시보드** → **mobile-app-new** 서비스
2. **"Environment"** 탭 클릭
3. **"Add Environment Variable"** 클릭하여 다음 추가:

```bash
AZURE_OPENAI_ENDPOINT=https://insighti-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-actual-api-key-here
AZURE_OPENAI_DEPLOYMENT=gpt-4-vision
```

4. **"Save Changes"** 클릭 (자동 재배포됨)

### **4-2. 로컬 개발용 .env 파일**

`backend/.env` 파일 생성:

```bash
# Azure OpenAI 설정
AZURE_OPENAI_ENDPOINT=https://insighti-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-actual-api-key-here
AZURE_OPENAI_DEPLOYMENT=gpt-4-vision

# 기존 설정...
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...
```

---

## 🎨 **5단계: 프론트엔드에서 Azure AI 활성화**

### **5-1. Azure AI 모드 활성화**

`webapp/js/app.js` 파일에 다음 추가:

```javascript
// 앱 초기화 시 Azure AI 활성화
window.USE_AZURE_AI = true; // Azure OpenAI 사용
// window.USE_AZURE_AI = false; // Teachable Machine 또는 모의 모드 사용
```

### **5-2. 테스트**

1. 하자 등록 화면에서 사진 촬영
2. Azure OpenAI가 자동으로 분석:
   - 하자 유형 자동 분류
   - 상세한 설명 생성
   - 보수 방법 추천
   - 심각도 평가
3. 사용자가 결과 확인 및 수정

---

## 💰 **6단계: 비용 관리**

### **6-1. 예상 비용**

GPT-4 Vision 가격 (2025년 기준):

```
입력: $0.01 / 1K tokens
출력: $0.03 / 1K tokens

예시 계산:
- 이미지 1장 분석: 약 1,000 입력 + 500 출력 tokens
- 비용: $0.01 + $0.015 = $0.025 (약 35원)
- 월 1,000건 분석: $25 (약 35,000원)
```

### **6-2. 비용 절감 팁**

1. **이미지 압축**: 해상도를 적절히 조절 (512x512 권장)
2. **캐싱**: 동일 이미지 재분석 방지
3. **사용량 모니터링**: Azure Portal에서 실시간 확인
4. **예산 알림**: 월 $30 초과 시 알림 설정

### **6-3. 예산 알림 설정**

1. **Azure Portal** → **Cost Management + Billing**
2. **"Budgets"** → **"Add"** 클릭
3. **설정**:
   ```
   예산 이름: OpenAI Monthly Budget
   금액: $30
   기간: Monthly
   알림: 80% 도달 시 이메일
   ```

---

## 🧪 **7단계: 테스트 및 검증**

### **7-1. API 상태 확인**

브라우저 콘솔에서:

```javascript
// Azure AI 연결 테스트
await api.checkAzureAIStatus();
```

예상 응답:
```json
{
  "status": "ok",
  "endpoint": "https://insighti-openai.***",
  "deployment": "gpt-4-vision",
  "message": "Azure OpenAI 서비스가 정상 작동 중입니다"
}
```

### **7-2. 실제 하자 이미지 테스트**

1. 하자 등록 화면에서 사진 촬영
2. 콘솔에서 다음 확인:
   ```
   🔍 Azure OpenAI로 하자 분석 시작...
   🤖 Azure OpenAI 응답: { "detectedDefects": [...] }
   ✅ Azure AI 분석 완료: 2개 하자 감지
   ```

### **7-3. 정확도 검증**

다양한 하자 이미지로 테스트:
- ✅ 벽지찢김 정확히 감지
- ✅ 벽균열 vs 페인트벗겨짐 구분
- ✅ 심각도 판단 정확성
- ✅ 보수 방법 적절성

---

## 🔧 **문제 해결**

### **Q: "Access denied" 오류**
- **A**: Azure OpenAI 액세스 승인이 아직 안 됨. 승인 대기 중입니다.

### **Q: "Model not found" 오류**
- **A**: GPT-4 Vision 모델 배포를 확인하세요. 배포 이름이 환경 변수와 일치해야 합니다.

### **Q: "Rate limit exceeded" 오류**
- **A**: TPM(분당 토큰) 한도 초과. 잠시 대기 후 재시도하거나 TPM 한도를 늘리세요.

### **Q: 분석 속도가 느려요**
- **A**: GPT-4 Vision은 약 5-10초 소요됩니다. 사용자에게 로딩 애니메이션을 표시하세요.

### **Q: 비용이 걱정돼요**
- **A**: 
  1. 개발/테스트 시에는 모의 모드 사용
  2. 실제 운영 시에만 Azure AI 활성화
  3. 월별 예산 알림 설정

---

## 🎉 **완료!**

이제 **학습 없이** GPT-4 Vision으로 하자를 자동 분석할 수 있습니다!

### **핵심 장점 요약:**

✅ **즉시 사용** - 학습 데이터 불필요  
✅ **높은 정확도** - GPT-4의 강력한 이미지 인식  
✅ **자세한 설명** - 하자 설명 + 보수방법 자동 생성  
✅ **데이터 보안** - Azure 한국 리전, 엔터프라이즈급 보안  

### **다음 단계:**

- [ ] Azure 계정 생성 및 OpenAI 액세스 신청
- [ ] Azure OpenAI 리소스 생성
- [ ] GPT-4 Vision 모델 배포
- [ ] API 키를 환경 변수에 설정
- [ ] 프론트엔드에서 Azure AI 활성화
- [ ] 실제 하자 이미지로 테스트
- [ ] 예산 알림 설정

**즐거운 AI 개발 되세요!** 🚀✨

