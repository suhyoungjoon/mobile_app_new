// 조코딩 스타일의 TensorFlow.js + YOLO 하이브리드 하자 감지 시스템
class DefectDetector {
  constructor() {
    this.model = null;
    this.isLoaded = false;
    this.isLoading = false;
    this.confidenceThreshold = 0.5;
    
    // 하자 클래스 정의 (10가지 하자 유형)
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
  }
  
  // 모델 초기화 및 로드
  async initialize() {
    if (this.isLoading) return;
    
    try {
      this.isLoading = true;
      console.log('🤖 AI 모델 로딩 시작...');
      
      // TensorFlow.js 백엔드 설정
      await tf.setBackend('webgl');
      await tf.ready();
      
      // 경량화된 모델 로드 (실제로는 커스텀 훈련된 모델 사용)
      await this.loadCustomModel();
      
      this.isLoaded = true;
      this.isLoading = false;
      console.log('✅ AI 모델 로드 완료!');
      
      return true;
    } catch (error) {
      console.error('❌ AI 모델 로드 실패:', error);
      this.isLoading = false;
      return false;
    }
  }
  
  // 커스텀 하자 감지 모델 로드
  async loadCustomModel() {
    try {
      // 실제 환경에서는 훈련된 모델을 로드
      // 현재는 모의 모델 구조를 생성
      this.model = this.createMockModel();
      
      console.log('📦 커스텀 하자 감지 모델 로드 완료');
    } catch (error) {
      console.log('⚠️ 커스텀 모델 로드 실패, 모의 모델 사용');
      this.model = this.createMockModel();
    }
  }
  
  // 모의 모델 생성 (실제 개발에서는 훈련된 모델 로드)
  createMockModel() {
    return {
      predict: async (input) => {
        // 모의 예측 결과 생성
        const batchSize = input.shape[0];
        const mockPredictions = [];
        
        for (let i = 0; i < batchSize; i++) {
          const predictions = [];
          for (let j = 0; j < 10; j++) { // 10개 하자 클래스
            predictions.push(Math.random() * 0.8 + 0.1); // 0.1 ~ 0.9 사이 랜덤
          }
          mockPredictions.push(predictions);
        }
        
        return tf.tensor2d(mockPredictions);
      }
    };
  }
  
  // 이미지에서 하자 감지 (메인 함수)
  async detectDefects(imageElement) {
    if (!this.isLoaded) {
      const loaded = await this.initialize();
      if (!loaded) {
        throw new Error('AI 모델 로드에 실패했습니다.');
      }
    }
    
    try {
      console.log('🔍 하자 감지 시작...');
      
      // 1단계: 이미지 전처리
      const processedImage = await this.preprocessImage(imageElement);
      
      // 2단계: AI 모델로 예측
      const predictions = await this.model.predict(processedImage);
      const predictionData = await predictions.data();
      
      // 3단계: 결과 해석
      const defects = this.interpretPredictions(predictionData, imageElement);
      
      // 4단계: 메모리 정리
      processedImage.dispose();
      predictions.dispose();
      
      console.log(`✅ ${defects.length}개의 하자 감지 완료`);
      return defects;
      
    } catch (error) {
      console.error('❌ 하자 감지 실패:', error);
      throw error;
    }
  }
  
  // 이미지 전처리
  async preprocessImage(imageElement) {
    // 이미지를 텐서로 변환
    let tensor = tf.browser.fromPixels(imageElement);
    
    // 크기 조정 (224x224)
    tensor = tf.image.resizeBilinear(tensor, [224, 224]);
    
    // 정규화 (0-255 → 0-1)
    tensor = tensor.div(255.0);
    
    // 배치 차원 추가
    tensor = tensor.expandDims(0);
    
    return tensor;
  }
  
  // 예측 결과 해석
  interpretPredictions(predictionData, imageElement) {
    const defects = [];
    const imageWidth = imageElement.width;
    const imageHeight = imageElement.height;
    
    // 예측 결과를 하자 객체로 변환
    for (let i = 0; i < this.defectClasses.length; i++) {
      const confidence = predictionData[i];
      
      if (confidence > this.confidenceThreshold) {
        const defectType = this.defectClasses[i];
        
        // 하자 위치 추정 (모의)
        const bbox = this.generateMockBbox(imageWidth, imageHeight, defectType);
        
        defects.push({
          type: defectType,
          confidence: Math.round(confidence * 100) / 100,
          bbox: bbox,
          severity: this.severityMapping[defectType],
          description: this.getDefectDescription(defectType),
          solution: this.getDefectSolution(defectType),
          detectedAt: new Date().toISOString()
        });
      }
    }
    
    // 신뢰도 순으로 정렬
    return defects.sort((a, b) => b.confidence - a.confidence);
  }
  
  // 모의 바운딩 박스 생성
  generateMockBbox(imageWidth, imageHeight, defectType) {
    // 실제로는 YOLO에서 바운딩 박스를 받아옴
    const centerX = Math.random() * imageWidth;
    const centerY = Math.random() * imageHeight;
    const width = Math.random() * 100 + 50;
    const height = Math.random() * 100 + 50;
    
    return {
      x: Math.max(0, centerX - width / 2),
      y: Math.max(0, centerY - height / 2),
      width: Math.min(width, imageWidth),
      height: Math.min(height, imageHeight)
    };
  }
  
  // 하자별 설명 반환
  getDefectDescription(defectType) {
    const descriptions = {
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
    
    return descriptions[defectType] || '하자 감지됨';
  }
  
  // 하자별 해결방법 반환
  getDefectSolution(defectType) {
    const solutions = {
      '벽지찢김': '벽지 교체 또는 부분 보수',
      '벽균열': '균열 폭과 깊이에 따라 구조보수 또는 표면처리',
      '마루판들뜸': '마루판 재시공 또는 접착제 보강',
      '타일균열': '타일 교체 또는 시공재 시공',
      '페인트벗겨짐': '표면 정리 후 재도장',
      '천장누수': '누수 원인 파악 후 방수처리',
      '욕실곰팡이': '곰팡이 제거 후 방습처리',
      '문틀변형': '문틀 교체 또는 보정',
      '콘센트불량': '전기공사 필요',
      '창문잠금불량': '잠금장치 교체'
    };
    
    return solutions[defectType] || '전문업체 상담 필요';
  }
}

// YOLO 스타일의 빠른 감지 시스템
class QuickDefectDetector {
  constructor() {
    this.isInitialized = false;
  }
  
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('⚡ 빠른 감지 시스템 초기화...');
    this.isInitialized = true;
  }
  
  // 빠른 하자 감지 (1차 필터링)
  async quickDetect(imageElement) {
    await this.initialize();
    
    // OpenCV 스타일의 빠른 전처리
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    ctx.drawImage(imageElement, 0, 0);
    
    // 간단한 엣지 검출 (모의)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const edges = this.detectEdges(imageData);
    
    // 하자 후보 영역 찾기
    const candidateRegions = this.findCandidateRegions(edges);
    
    return {
      hasDefects: candidateRegions.length > 0,
      candidateRegions: candidateRegions,
      confidence: 0.7 // 빠른 감지의 기본 신뢰도
    };
  }
  
  // 간단한 엣지 검출
  detectEdges(imageData) {
    // 실제로는 더 정교한 엣지 검출 알고리즘 사용
    return Math.random() > 0.5; // 모의 결과
  }
  
  // 후보 영역 찾기
  findCandidateRegions(hasEdges) {
    if (!hasEdges) return [];
    
    // 모의 후보 영역
    return [
      { x: 100, y: 100, width: 150, height: 100, confidence: 0.8 },
      { x: 300, y: 200, width: 100, height: 80, confidence: 0.6 }
    ];
  }
}

// 하이브리드 감지 시스템 (조코딩 스타일)
class HybridDefectDetector {
  constructor() {
    this.quickDetector = new QuickDefectDetector();
    this.preciseDetector = new DefectDetector();
    this.isInitialized = false;
  }
  
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🔄 하이브리드 감지 시스템 초기화...');
    
    // 빠른 감지 시스템 초기화
    await this.quickDetector.initialize();
    
    // 정밀 감지 시스템은 필요시에만 초기화
    this.isInitialized = true;
    console.log('✅ 하이브리드 시스템 준비 완료');
  }
  
  // 메인 감지 함수
  async detectDefects(imageElement) {
    await this.initialize();
    
    try {
      console.log('🚀 하이브리드 하자 감지 시작...');
      
      // 1단계: 빠른 감지로 1차 필터링
      const quickResult = await this.quickDetector.quickDetect(imageElement);
      
      if (!quickResult.hasDefects) {
        console.log('✅ 하자 감지되지 않음');
        return [];
      }
      
      console.log(`⚡ ${quickResult.candidateRegions.length}개 후보 영역 발견`);
      
      // 2단계: 정밀 감지로 상세 분석
      const preciseResult = await this.preciseDetector.detectDefects(imageElement);
      
      // 3단계: 결과 조합 및 최적화
      const finalResults = this.combineResults(quickResult, preciseResult);
      
      console.log(`🎯 최종 ${finalResults.length}개 하자 감지 완료`);
      return finalResults;
      
    } catch (error) {
      console.error('❌ 하이브리드 감지 실패:', error);
      
      // 폴백: 빠른 감지만 사용
      console.log('🔄 빠른 감지 모드로 폴백...');
      const quickResult = await this.quickDetector.quickDetect(imageElement);
      return this.convertQuickResults(quickResult);
    }
  }
  
  // 결과 조합
  combineResults(quickResult, preciseResult) {
    // 빠른 감지와 정밀 감지 결과를 조합하여 최적화
    const combined = [...preciseResult];
    
    // 빠른 감지에서 발견된 후보 영역 중 정밀 감지에서 놓친 것이 있다면 추가
    quickResult.candidateRegions.forEach(candidate => {
      const isAlreadyDetected = preciseResult.some(defect => 
        this.isOverlapping(defect.bbox, candidate)
      );
      
      if (!isAlreadyDetected && candidate.confidence > 0.8) {
        combined.push({
          type: '미분류 하자',
          confidence: candidate.confidence,
          bbox: candidate,
          severity: '보통',
          description: '하자가 감지되었으나 정확한 유형을 분류할 수 없습니다.',
          solution: '전문가 상담 필요',
          detectedAt: new Date().toISOString()
        });
      }
    });
    
    return combined;
  }
  
  // 영역 겹침 확인
  isOverlapping(bbox1, bbox2) {
    const overlap = Math.max(0, Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width) - Math.max(bbox1.x, bbox2.x)) *
                   Math.max(0, Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height) - Math.max(bbox1.y, bbox2.y));
    
    const area1 = bbox1.width * bbox1.height;
    const area2 = bbox2.width * bbox2.height;
    
    return overlap / Math.min(area1, area2) > 0.3; // 30% 이상 겹치면 동일한 영역으로 간주
  }
  
  // 빠른 감지 결과를 표준 형식으로 변환
  convertQuickResults(quickResult) {
    return quickResult.candidateRegions.map((region, index) => ({
      type: '하자 감지됨',
      confidence: region.confidence,
      bbox: region,
      severity: '보통',
      description: '하자가 감지되었습니다. 상세 분석을 위해 정밀 검사를 권장합니다.',
      solution: '전문가 상담 필요',
      detectedAt: new Date().toISOString()
    }));
  }
}

// 전역 인스턴스 생성
const hybridDetector = new HybridDefectDetector();

// 사용자 피드백을 통한 학습 시스템
class LearningSystem {
  constructor() {
    this.feedbackQueue = [];
    this.learningData = [];
    this.predictionCache = new Map(); // 예측 결과 캐시
  }
  
  // 사용자 피드백 수집
  collectFeedback(predictionId, userFeedback) {
    const feedback = {
      predictionId: predictionId,
      isCorrect: userFeedback.isCorrect,
      feedback: userFeedback.feedback,
      actualDefectId: userFeedback.actualDefectId || null,
      timestamp: new Date().toISOString()
    };
    
    this.feedbackQueue.push(feedback);
    console.log('📝 피드백 수집:', feedback);
  }
  
  // 학습 데이터 전송
  async sendLearningData() {
    if (this.feedbackQueue.length === 0) return;
    
    try {
      await api.sendAIFeedback(this.feedbackQueue);
      console.log('✅ 학습 데이터 전송 완료');
      this.feedbackQueue = [];
    } catch (error) {
      console.error('❌ 학습 데이터 전송 실패:', error);
    }
  }
  
  // AI 예측 결과를 서버에 저장
  async savePredictionResults(imagePath, predictions, photoType) {
    try {
      const formattedPredictions = predictions.map(pred => ({
        defectId: this.getDefectIdByName(pred.type),
        confidence: pred.confidence,
        bbox: pred.bbox
      }));
      
      const result = await api.saveAIPrediction(imagePath, formattedPredictions, photoType);
      
      // 예측 결과를 캐시에 저장 (피드백 수집용)
      predictions.forEach((pred, index) => {
        if (result.predictions && result.predictions[index]) {
          this.predictionCache.set(`defect-${index}`, result.predictions[index].predictionId);
        }
      });
      
      console.log('✅ AI 예측 결과 저장 완료');
      return result;
    } catch (error) {
      console.error('❌ AI 예측 결과 저장 실패:', error);
      throw error;
    }
  }
  
  // 하자명으로 하자 ID 찾기
  getDefectIdByName(defectName) {
    const defectMapping = {
      '벽지찢김': 1,
      '벽균열': 2,
      '마루판들뜸': 3,
      '타일균열': 4,
      '페인트벗겨짐': 5,
      '천장누수': 6,
      '욕실곰팡이': 7,
      '문틀변형': 8,
      '콘센트불량': 9,
      '창문잠금불량': 10
    };
    
    return defectMapping[defectName] || null;
  }
  
  // AI 성능 통계 조회
  async getPerformanceStats() {
    try {
      const performance = await api.getAIPerformance();
      console.log('📊 AI 성능 통계:', performance);
      return performance;
    } catch (error) {
      console.error('❌ 성능 통계 조회 실패:', error);
      return null;
    }
  }
  
  // 하자별 성능 분석 조회
  async getDefectPerformance() {
    try {
      const performance = await api.getAIPerformanceByDefect();
      console.log('📈 하자별 성능 분석:', performance);
      return performance;
    } catch (error) {
      console.error('❌ 하자별 성능 분석 실패:', error);
      return null;
    }
  }
}

// 전역 학습 시스템 인스턴스
const learningSystem = new LearningSystem();

// 자동 학습 데이터 전송 (5분마다)
setInterval(() => {
  learningSystem.sendLearningData();
}, 5 * 60 * 1000);
