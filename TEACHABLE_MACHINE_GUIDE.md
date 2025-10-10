# 🤖 Teachable Machine으로 하자 AI 모델 학습하기

Google Teachable Machine을 사용하여 하자 이미지를 학습하고, 웹앱에 통합하는 전체 가이드입니다.

---

## 📋 **목차**

1. [Teachable Machine이란?](#teachable-machine이란)
2. [학습 준비](#학습-준비)
3. [모델 학습 단계](#모델-학습-단계)
4. [모델 배포 및 통합](#모델-배포-및-통합)
5. [지속적 개선](#지속적-개선)

---

## 🎯 **Teachable Machine이란?**

Google이 제공하는 **누구나 쉽게 AI 모델을 만들 수 있는 웹 기반 도구**입니다.

- **코딩 불필요**: 브라우저에서 드래그앤드롭만으로 학습
- **빠른 학습**: 몇 분 안에 모델 생성
- **웹 통합 쉬움**: JavaScript로 바로 사용 가능

### **우리 프로젝트에서의 역할:**
카메라로 찍은 하자 사진을 자동으로 분석하여 하자 유형을 분류하고 추천합니다.

---

## 📸 **학습 준비**

### **1단계: 하자 이미지 수집**

각 하자 유형별로 **최소 30장 이상**의 이미지를 준비하세요:

```
하자 이미지 폴더 구조:
├── 벽지찢김/
│   ├── img_001.jpg
│   ├── img_002.jpg
│   └── ... (30장 이상)
├── 벽균열/
│   ├── img_001.jpg
│   └── ... (30장 이상)
├── 마루판들뜸/
├── 타일균열/
├── 페인트벗겨짐/
├── 천장누수/
├── 욕실곰팡이/
├── 문틀변형/
├── 콘센트불량/
└── 창문잠금불량/
```

### **이미지 수집 팁:**
- ✅ **다양한 각도**에서 촬영
- ✅ **다양한 조명** 환경 (밝음/어두움)
- ✅ **다양한 거리** (근접/원거리)
- ✅ **다양한 심각도** (경미/심각)
- ❌ 흔들리거나 흐릿한 사진은 제외

---

## 🎓 **모델 학습 단계**

### **Step 1: Teachable Machine 접속**

1. 브라우저에서 https://teachablemachine.withgoogle.com/ 접속
2. **"Get Started"** 클릭
3. **"Image Project"** 선택
4. **"Standard image model"** 선택

### **Step 2: 클래스 추가 및 이미지 업로드**

1. **Class 1을 "벽지찢김"으로 이름 변경**
2. **"Upload"** 버튼 클릭하여 벽지찢김 이미지 30장 업로드
3. **"Add a class"** 버튼으로 새 클래스 추가
4. 다음 순서대로 10개 클래스 모두 추가:
   ```
   Class 1: 벽지찢김
   Class 2: 벽균열
   Class 3: 마루판들뜸
   Class 4: 타일균열
   Class 5: 페인트벗겨짐
   Class 6: 천장누수
   Class 7: 욕실곰팡이
   Class 8: 문틀변형
   Class 9: 콘센트불량
   Class 10: 창문잠금불량
   ```

### **Step 3: 모델 학습**

1. **"Train Model"** 버튼 클릭
2. 학습 진행 (약 2-5분 소요)
3. 학습 완료 후 **Preview** 창에서 테스트
   - 웹캠 또는 이미지 파일로 테스트 가능

### **Step 4: 모델 평가**

- 각 하자 유형별로 **새로운 테스트 이미지**로 정확도 확인
- 정확도가 낮으면:
  - 더 많은 이미지 추가
  - 다양한 각도/조명의 이미지 추가
  - 비슷한 하자 유형의 이미지를 더 명확히 구분

---

## 🚀 **모델 배포 및 통합**

### **Step 1: 모델 Export**

1. **"Export Model"** 버튼 클릭
2. **"TensorFlow.js"** 탭 선택
3. **"Upload my model"** 클릭 (Google Drive에 업로드)
4. 업로드 완료 후 **모델 URL** 복사
   ```
   예시:
   https://teachablemachine.withgoogle.com/models/YOUR_MODEL_ID/
   ```

### **Step 2: 웹앱에 모델 URL 적용**

`webapp/js/ai-detector.js` 파일을 수정:

```javascript
// 기존 코드:
this.modelURL = null; // 'https://teachablemachine.withgoogle.com/models/YOUR_MODEL_ID/';

// 수정 후:
this.modelURL = 'https://teachablemachine.withgoogle.com/models/YOUR_ACTUAL_MODEL_ID/';
this.metadataURL = 'https://teachablemachine.withgoogle.com/models/YOUR_ACTUAL_MODEL_ID/metadata.json';
```

### **Step 3: 테스트**

1. 웹앱 재배포 (Vercel)
2. 하자 등록 화면에서 사진 촬영
3. AI가 자동으로 하자 유형 감지 및 추천
4. 사용자가 AI 추천 수정 가능

---

## 🔄 **지속적 개선**

### **사용자 피드백 활용**

1. **사용자가 AI 추천 수정** → 자동으로 피드백 수집
2. **피드백 데이터 분석** → 잘못 감지된 케이스 파악
3. **새로운 이미지 추가** → 잘못 감지된 케이스의 이미지 추가
4. **모델 재학습** → Teachable Machine에서 재학습
5. **재배포** → 새로운 모델 URL로 업데이트

### **피드백 데이터 확인**

데이터베이스에서 AI 피드백 조회:

```sql
-- 하자별 AI 정확도 확인
SELECT 
  dc.name as defect_name,
  COUNT(*) as total_predictions,
  COUNT(CASE WHEN ap.user_confirmed = TRUE THEN 1 END) as correct,
  COUNT(CASE WHEN ap.user_confirmed = FALSE THEN 1 END) as incorrect,
  ROUND(CAST(COUNT(CASE WHEN ap.user_confirmed = TRUE THEN 1 END) AS DECIMAL) * 100 / COUNT(*), 2) as accuracy
FROM ai_predictions ap
JOIN defect_categories dc ON ap.predicted_defect_id = dc.id
WHERE ap.is_training_data = TRUE
GROUP BY dc.name
ORDER BY accuracy DESC;
```

### **재학습 주기**

- **초기**: 매주 재학습 (데이터 빠르게 축적)
- **안정기**: 월 1회 재학습
- **정확도 목표**: 85% 이상

---

## 💡 **고급 팁**

### **Data Augmentation (데이터 증강)**

Teachable Machine은 자동으로 데이터 증강을 수행하지만, 추가로:

- 이미지 회전 (5-10도)
- 밝기 조절
- 대비 조절

### **전이 학습 (Transfer Learning)**

Teachable Machine은 기본적으로 MobileNet을 사용하여 전이 학습을 수행합니다.

### **모델 최적화**

- **임계값 조정**: `ai-detector.js`의 `confidenceThreshold` 값 조정 (기본 0.6)
- **Top-K 예측**: 상위 2-3개 예측 결과만 표시

---

## 📊 **성능 모니터링**

### **실시간 성능 확인**

브라우저 콘솔에서:

```javascript
// AI 성능 통계 조회
await api.getAIPerformance();

// 하자별 성능 분석
await api.getAIPerformanceByDefect();
```

### **개선 지표**

- **정확도**: 전체 예측 중 정확한 예측 비율
- **재현율**: 실제 하자를 얼마나 잘 찾아내는지
- **정밀도**: 예측한 하자가 얼마나 정확한지

---

## 🆘 **문제 해결**

### **Q: AI가 잘못 분류해요**
- **A**: 더 많은 학습 이미지 추가하고 재학습하세요.

### **Q: 모델 로딩이 느려요**
- **A**: Teachable Machine의 경량 모델은 빠르지만, 네트워크 속도에 영향을 받습니다. CDN 캐싱을 활용하세요.

### **Q: 여러 하자를 동시에 감지하고 싶어요**
- **A**: Teachable Machine은 단일 클래스 분류에 최적화되어 있습니다. 여러 하자 감지는 YOLO 등의 Object Detection 모델이 필요합니다.

---

## 🎉 **마무리**

Teachable Machine으로 **코딩 없이도** 강력한 AI 하자 감지 시스템을 만들 수 있습니다!

**핵심 포인트:**
1. ✅ 양질의 학습 데이터 수집
2. ✅ Teachable Machine으로 간편하게 학습
3. ✅ 웹앱에 쉽게 통합
4. ✅ 사용자 피드백으로 지속적 개선

**다음 단계:**
- [ ] 하자 이미지 30장씩 수집
- [ ] Teachable Machine에서 모델 학습
- [ ] 모델 URL을 웹앱에 적용
- [ ] 실제 현장에서 테스트
- [ ] 피드백 수집 및 재학습

**즐거운 AI 개발 되세요!** 🚀✨

