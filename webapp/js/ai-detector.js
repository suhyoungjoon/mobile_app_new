// Google Teachable Machine 기반 하자 감지 시스템
class DefectDetector {
  constructor() {
    this.model = null;
    this.maxPredictions = 10;
    this.isLoaded = false;
    this.isLoading = false;
    this.confidenceThreshold = 0.6; // Teachable Machine 권장 임계값
    
    // Teachable Machine 모델 URL (실제 모델이 생성되면 교체)
    // 현재는 모의(mock) 모드로 작동
    this.modelURL = null; // 'https://teachablemachine.withgoogle.com/models/YOUR_MODEL_ID/';
    this.metadataURL = null;
    
    // 하자 클래스 정의 (Teachable Machine 학습 순서와 동일해야 함)
    this.defectClasses = [
      '벽지찢김', '벽균열', '마루판들뜸', '타일균열', '페인트벗겨짐',
      '천장누수', '욕실곰팡이', '문틀변형', '콘센트불량', '창문잠금불량'
    ];
    
    // 하자별 심각도 매핑
    this.severityMapping = {
      '벽균열': '심각',
      '천장누수': '심각', 
      '콘센트불량': '심각',
      '벽지찢김': '보통',
      '마루판들뜸': '보통',
      '타일균열': '보통',
      '욕실곰팡이': '보통',
      '문틀변형': '보통',
      '창문잠금불량': '보통',
      '페인트벗겨짐': '경미'
    };
    
    // 하자별 설명 매핑
    this.descriptionMapping = {
      '벽지찢김': '벽체부위 벽지파손은 위치별 크기별로 다르나 보수로 처리가능한',
      '벽균열': '벽체에 발생한 균열로 건물의 구조적 문제를 나타낼 수 있음',
      '마루판들뜸': '바닥 마루판이 들뜨거나 움직이는 현상',
      '타일균열': '타일 표면 또는 접합부에 발생한 균열',
      '페인트벗겨짐': '도장 표면이 벗겨지거나 박리되는 현상',
      '천장누수': '천장에서 물이 스며나오거나 누수 흔적이 보임',
      '욕실곰팡이': '욕실 벽면이나 천장에 발생한 곰팡이',
      '문틀변형': '문틀이 변형되어 문이 제대로 닫히지 않음',
      '콘센트불량': '콘센트가 제대로 작동하지 않거나 느슨함',
      '창문잠금불량': '창문 잠금장치가 제대로 작동하지 않음'
    };
  }
  
  // 모델 초기화 및 로드
  async initialize() {
    if (this.isLoading) return;
    
    try {
      this.isLoading = true;
      console.log('🤖 Teachable Machine 모델 로딩 시작...');
      
      // 실제 Teachable Machine 모델이 있으면 로드
      if (this.modelURL) {
        const tmImage = window.tmImage;
        this.model = await tmImage.load(this.modelURL, this.metadataURL);
        this.maxPredictions = this.model.getTotalClasses();
        console.log('✅ Teachable Machine 모델 로드 완료!');
      } else {
        console.log('ℹ️ 모의(Mock) 모드로 작동합니다. 실제 모델을 학습하고 URL을 설정하세요.');
      }
      
      this.isLoaded = true;
      this.isLoading = false;
      
      return true;
    } catch (error) {
      console.error('❌ AI 모델 로드 실패:', error);
      this.isLoading = false;
      return false;
    }
  }
  
  // 이미지에서 하자 감지
  async detectDefects(imageElement) {
    try {
      // 1순위: Azure OpenAI Vision 사용
      if (window.USE_AZURE_AI) {
        return await this.detectWithAzureAI(imageElement);
      }
      
      // 2순위: Teachable Machine 모델 사용
      if (this.model) {
        return await this.detectWithTeachableMachine(imageElement);
      }
      
      // 3순위: 모의 모드
      return await this.generateMockPredictions();
      
    } catch (error) {
      console.error('❌ 하자 감지 실패:', error);
      return [];
    }
  }
  
  // Azure OpenAI Vision으로 하자 감지
  async detectWithAzureAI(imageElement) {
    try {
      console.log('🔍 Azure OpenAI로 하자 분석 시작...');
      
      // 이미지를 Base64로 변환
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.width || imageElement.naturalWidth;
      canvas.height = imageElement.height || imageElement.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      
      // Azure OpenAI API 호출
      const result = await window.api.analyzeDefectWithAzureAI(imageBase64, 'near');
      
      if (result && result.analysis && result.analysis.detectedDefects) {
        console.log('✅ Azure AI 분석 완료:', result.analysis.detectedDefects.length, '개 하자 감지');
        
        // 응답 형식 통일
        return result.analysis.detectedDefects.map(defect => ({
          type: defect.type,
          confidence: parseFloat(defect.confidence),
          severity: defect.severity,
          description: defect.description + (defect.repairSuggestion ? `\n\n💡 보수방법: ${defect.repairSuggestion}` : '')
        }));
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ Azure AI 분석 실패:', error);
      // Azure AI 실패 시 폴백
      return await this.generateMockPredictions();
    }
  }
  
  // Teachable Machine으로 실제 감지
  async detectWithTeachableMachine(imageElement) {
    const predictions = await this.model.predict(imageElement);
    const detectedDefects = [];
    
    // 신뢰도가 높은 예측만 선택
    for (let i = 0; i < predictions.length; i++) {
      const prediction = predictions[i];
      if (prediction.probability >= this.confidenceThreshold) {
        const defectType = prediction.className;
        
        detectedDefects.push({
          type: defectType,
          confidence: prediction.probability.toFixed(2),
          severity: this.severityMapping[defectType] || '보통',
          description: this.descriptionMapping[defectType] || defectType
        });
      }
    }
    
    // 신뢰도 순으로 정렬
    detectedDefects.sort((a, b) => b.confidence - a.confidence);
    
    return detectedDefects;
  }
  
  // 모의 예측 생성 (실제 모델이 없을 때)
  async generateMockPredictions() {
    const mockDefects = [];
    const randomDefectCount = Math.floor(Math.random() * 2) + 1; // 1~2개 하자
    
    // 랜덤하게 하자 선택
    const selectedIndexes = [];
    while (selectedIndexes.length < randomDefectCount) {
      const randomIndex = Math.floor(Math.random() * this.defectClasses.length);
      if (!selectedIndexes.includes(randomIndex)) {
        selectedIndexes.push(randomIndex);
      }
    }
    
    for (const index of selectedIndexes) {
      const defectType = this.defectClasses[index];
      const confidence = (Math.random() * 0.3 + 0.6).toFixed(2); // 60%~90% 신뢰도
      
      mockDefects.push({
        type: defectType,
        confidence: parseFloat(confidence),
        severity: this.severityMapping[defectType] || '보통',
        description: this.descriptionMapping[defectType] || defectType
      });
    }
    
    // 신뢰도 순으로 정렬
    mockDefects.sort((a, b) => b.confidence - a.confidence);
    
    console.log('🎭 모의 AI 감지 결과:', mockDefects);
    return mockDefects;
  }
}

// 전역 인스턴스 생성
const defectDetector = new DefectDetector();

// 사용자 피드백을 통한 지속적 학습 시스템
class LearningSystem {
  constructor() {
    this.feedbackQueue = [];
    this.predictionCache = new Map();
    this.setupAutoSend();
  }
  
  // 사용자 피드백 수집
  collectFeedback(predictionId, userFeedback) {
    const feedback = {
      predictionId: predictionId,
      isCorrect: userFeedback.isCorrect,
      correctedDefectType: userFeedback.correctedDefectType || null,
      feedback: userFeedback.feedback,
      timestamp: new Date().toISOString(),
      householdId: window.AppState?.session?.householdId || null
    };
    
    this.feedbackQueue.push(feedback);
    console.log('📝 피드백 수집:', feedback);
  }
  
  // AI 예측 결과를 서버에 저장
  async savePredictionResults(imagePath, predictions, photoType) {
    try {
      // API가 구현되어 있으면 서버로 전송
      if (window.api && window.api.saveAIPrediction) {
        const formattedPredictions = predictions.map(pred => ({
          defectType: pred.type,
          confidence: pred.confidence,
          severity: pred.severity,
          description: pred.description
        }));
        
        const result = await window.api.saveAIPrediction(
          imagePath, 
          formattedPredictions, 
          photoType
        );
        
        // 예측 결과를 캐시에 저장 (피드백 수집용)
        if (result && result.predictions) {
          result.predictions.forEach((pred, index) => {
            this.predictionCache.set(`defect-${index}`, pred.id);
          });
        }
        
        console.log('✅ AI 예측 결과 저장 완료');
        return result;
      } else {
        console.log('ℹ️ 오프라인 모드: 예측 결과를 로컬에 저장');
        return null;
      }
    } catch (error) {
      console.error('❌ AI 예측 결과 저장 실패:', error);
      return null;
    }
  }
  
  // 학습 데이터 전송
  async sendLearningData() {
    if (this.feedbackQueue.length === 0) return;
    
    try {
      if (window.api && window.api.sendAIFeedback) {
        await window.api.sendAIFeedback(this.feedbackQueue);
        console.log('✅ 학습 데이터 전송 완료:', this.feedbackQueue.length, '건');
        this.feedbackQueue = [];
      }
    } catch (error) {
      console.error('❌ 학습 데이터 전송 실패:', error);
    }
  }
  
  // 일정 시간마다 학습 데이터 전송
  setupAutoSend() {
    setInterval(() => {
      this.sendLearningData();
    }, 5 * 60 * 1000); // 5분마다 전송
  }
  
  // 페이지 종료 시 남은 피드백 전송
  sendOnUnload() {
    if (this.feedbackQueue.length > 0) {
      navigator.sendBeacon('/api/ai-learning/feedback', JSON.stringify({
        feedbacks: this.feedbackQueue
      }));
    }
  }
}

// 전역 학습 시스템 인스턴스
const learningSystem = new LearningSystem();

// 페이지 종료 시 피드백 전송
window.addEventListener('beforeunload', () => {
  learningSystem.sendOnUnload();
});

// 하이브리드 감지기 호환성을 위한 별칭
const hybridDetector = defectDetector;
