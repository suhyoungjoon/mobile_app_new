// 하이브리드 AI 디텍터 (로컬 + 클라우드)
class HybridDetector {
  constructor() {
    this.localDetector = new LocalDetector();
    this.cloudDetector = new CloudDetector();
    this.confidenceThreshold = 0.80;
    
    // 통계 추적
    this.stats = {
      totalAnalyses: 0,
      localOnly: 0,
      cloudCalls: 0,
      totalCost: 0,
      averageConfidence: 0,
      savedCost: 0
    };
    
    // localStorage에서 통계 로드
    this.loadStats();
  }

  async initialize() {
    console.log('🚀 HybridDetector 초기화...');
    
    // 로컬 모델 로드
    await this.localDetector.loadModel();
    
    // 클라우드는 필요시 로드
    await this.cloudDetector.loadModel();
    
    console.log('✅ HybridDetector 준비 완료');
    console.log(`   신뢰도 임계값: ${this.confidenceThreshold}`);
    console.log(`   로컬 모드: ${this.localDetector.mode}`);
    console.log(`   클라우드 프로바이더: ${this.cloudDetector.provider}`);
  }

  /**
   * 하이브리드 분석 실행
   * @param {File} imageFile - 분석할 이미지
   * @returns {Promise<DetectionResult>}
   */
  async analyze(imageFile) {
    const overallStartTime = performance.now();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 하이브리드 AI 분석 시작');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      // 1단계: 로컬 AI 분석
      console.log('📱 1단계: 로컬 AI 분석...');
      const localResult = await this.localDetector.analyze(imageFile);
      
      console.log(`✅ 로컬 분석 완료: ${localResult.defectType} (신뢰도: ${(localResult.confidence * 100).toFixed(1)}%)`);
      console.log(`⏱️  처리 시간: ${localResult.processingTime}ms`);
      
      // 2단계: 신뢰도 체크
      if (localResult.confidence >= this.confidenceThreshold) {
        console.log('✅ 신뢰도 충분! 로컬 결과 사용');
        console.log(`💰 비용 절감: $0.0025`);
        
        this.stats.totalAnalyses++;
        this.stats.localOnly++;
        this.stats.savedCost += 0.0025; // GPT-4o 호출 비용
        this.saveStats();
        
        const totalTime = performance.now() - overallStartTime;
        
        return {
          ...localResult,
          totalProcessingTime: Math.round(totalTime),
          cost: 0
        };
      }
      
      // 3단계: 클라우드 AI 분석 (신뢰도 낮을 때만)
      console.log('⚠️ 신뢰도 부족 → 클라우드 AI로 검증');
      console.log('☁️  2단계: 클라우드 AI 분석...');
      
      const cloudResult = await this.cloudDetector.analyze(imageFile, localResult);
      
      console.log(`✅ 클라우드 분석 완료: ${cloudResult.defectType} (신뢰도: ${(cloudResult.confidence * 100).toFixed(1)}%)`);
      console.log(`⏱️  처리 시간: ${cloudResult.processingTime}ms`);
      console.log(`💰 비용: $0.0025 (${this.cloudDetector.provider})`);
      
      this.stats.totalAnalyses++;
      this.stats.cloudCalls++;
      this.stats.totalCost += 0.0025;
      this.saveStats();
      
      const totalTime = performance.now() - overallStartTime;
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ 하이브리드 분석 완료 (총 ${Math.round(totalTime)}ms)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return {
        ...cloudResult,
        totalProcessingTime: Math.round(totalTime),
        cost: 0.0025
      };
      
    } catch (error) {
      console.error('❌ 하이브리드 분석 실패:', error);
      throw error;
    }
  }

  /**
   * 통계 저장
   */
  saveStats() {
    try {
      localStorage.setItem('ai_stats', JSON.stringify(this.stats));
    } catch (error) {
      console.error('통계 저장 실패:', error);
    }
  }

  /**
   * 통계 로드
   */
  loadStats() {
    try {
      const saved = localStorage.getItem('ai_stats');
      if (saved) {
        this.stats = { ...this.stats, ...JSON.parse(saved) };
        console.log('📊 AI 통계 로드:', this.stats);
      }
    } catch (error) {
      console.error('통계 로드 실패:', error);
    }
  }

  /**
   * 통계 조회
   */
  getStats() {
    const localPercentage = this.stats.totalAnalyses > 0
      ? ((this.stats.localOnly / this.stats.totalAnalyses) * 100).toFixed(1)
      : 0;
    
    const cloudPercentage = this.stats.totalAnalyses > 0
      ? ((this.stats.cloudCalls / this.stats.totalAnalyses) * 100).toFixed(1)
      : 0;
    
    return {
      ...this.stats,
      localPercentage,
      cloudPercentage,
      averageCost: this.stats.totalAnalyses > 0
        ? (this.stats.totalCost / this.stats.totalAnalyses).toFixed(4)
        : 0
    };
  }

  /**
   * 통계 리셋
   */
  resetStats() {
    this.stats = {
      totalAnalyses: 0,
      localOnly: 0,
      cloudCalls: 0,
      totalCost: 0,
      averageConfidence: 0,
      savedCost: 0
    };
    this.saveStats();
    console.log('🔄 통계 초기화 완료');
  }

  /**
   * 신뢰도 임계값 조정
   */
  setConfidenceThreshold(threshold) {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
    
    console.log(`🔧 신뢰도 임계값 변경: ${this.confidenceThreshold} → ${threshold}`);
    this.confidenceThreshold = threshold;
    
    localStorage.setItem('ai_confidence_threshold', threshold.toString());
  }

  /**
   * 로컬 모델 모드 전환
   */
  async switchLocalMode(mode) {
    await this.localDetector.switchMode(mode);
    console.log(`✅ 로컬 모드 전환 완료: ${mode}`);
  }

  /**
   * 클라우드 프로바이더 전환
   */
  switchCloudProvider(provider) {
    this.cloudDetector.switchProvider(provider);
    console.log(`✅ 클라우드 프로바이더 전환 완료: ${provider}`);
  }
}

