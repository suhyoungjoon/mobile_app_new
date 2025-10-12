// 로컬 AI 디텍터 (Mock 모드 → 추후 CLIP/TensorFlow.js로 전환 가능)
class LocalDetector extends BaseDetector {
  constructor() {
    super('LocalDetector');
    this.mode = 'mock'; // 'mock', 'clip', 'mobilenet'
    this.confidenceThreshold = 0.80;
    
    // 하자 유형 정의
    this.defectTypes = [
      '벽지찢김', '벽균열', '마루판들뜸', '타일균열', '페인트벗겨짐',
      '천장누수', '욕실곰팡이', '문틀변형', '콘센트불량', '창문잠금불량'
    ];
    
    // 심각도 매핑
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
    
    // 설명 매핑
    this.descriptionMapping = {
      '벽지찢김': '벽체부위 벽지파손은 위치별 크기별로 다르나 보수로 처리가능',
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

  async loadModel() {
    if (this.isLoaded) return;
    
    console.log(`🔧 ${this.name} 로드 중... (모드: ${this.mode})`);
    
    if (this.mode === 'mock') {
      // Mock 모드는 로드 불필요
      this.isLoaded = true;
      console.log('✅ Mock 모드 준비 완료');
      return;
    }
    
    if (this.mode === 'clip') {
      // 추후 CLIP 모델 로드
      console.log('⏳ CLIP 모델 로드 예정...');
      // TODO: CLIP 구현
    }
    
    if (this.mode === 'mobilenet') {
      // 추후 MobileNet 로드
      console.log('⏳ MobileNet 모델 로드 예정...');
      // TODO: MobileNet 구현
    }
  }

  async analyze(imageFile) {
    const startTime = performance.now();
    
    if (!this.isLoaded) {
      await this.loadModel();
    }

    if (this.mode === 'mock') {
      return this.analyzeMock(imageFile, startTime);
    }
    
    if (this.mode === 'clip') {
      // TODO: CLIP 분석
      return this.analyzeMock(imageFile, startTime);
    }
    
    if (this.mode === 'mobilenet') {
      // TODO: MobileNet 분석
      return this.analyzeMock(imageFile, startTime);
    }
  }

  /**
   * Mock 모드 분석 (낮은 신뢰도로 랜덤 예측)
   */
  async analyzeMock(imageFile, startTime) {
    // 짧은 지연 시뮬레이션 (실제 AI 느낌)
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
    
    // 랜덤 하자 유형 선택
    const defectType = this.defectTypes[Math.floor(Math.random() * this.defectTypes.length)];
    
    // 높은 신뢰도로 설정 (0.85-0.95) → 클라우드 호출 건너뛰기
    const confidence = 0.85 + Math.random() * 0.1;
    
    const processingTime = performance.now() - startTime;
    
    return {
      defectType,
      confidence,
      location: this.getRandomLocation(),
      severity: this.severityMapping[defectType] || '보통',
      description: this.descriptionMapping[defectType] || '',
      source: 'local-mock',
      processingTime: Math.round(processingTime),
      note: '로컬 AI 예측 (Mock 모드 - 테스트용 높은 신뢰도)'
    };
  }
  
  getRandomLocation() {
    const locations = ['좌측 상단', '우측 상단', '좌측 하단', '우측 하단', '중앙', '전체'];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  /**
   * 모드 전환
   * @param {string} newMode - 'mock', 'clip', 'mobilenet'
   */
  async switchMode(newMode) {
    if (!['mock', 'clip', 'mobilenet'].includes(newMode)) {
      throw new Error(`Invalid mode: ${newMode}`);
    }
    
    console.log(`🔄 로컬 AI 모드 전환: ${this.mode} → ${newMode}`);
    
    // 기존 모델 언로드
    if (this.isLoaded) {
      await this.unload();
    }
    
    this.mode = newMode;
    this.isLoaded = false;
    
    // 새 모델 로드
    await this.loadModel();
    
    console.log(`✅ 모드 전환 완료: ${newMode}`);
  }
}

