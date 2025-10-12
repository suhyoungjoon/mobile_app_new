// 클라우드 AI 디텍터 (GPT-4o, Gemini, Claude 등 지원)
class CloudDetector extends BaseDetector {
  constructor() {
    super('CloudDetector');
    this.provider = 'gpt4o'; // 'gpt4o', 'gemini', 'claude'
    this.apiEndpoint = null;
    
    // 프롬프트 템플릿
    this.promptTemplate = `당신은 건축 하자 감지 전문가입니다. 다음 이미지를 분석하고 건축 하자를 감지하세요.

로컬 AI 예측: {localPrediction} (신뢰도: {localConfidence})

다음 정보를 정확히 JSON 형식으로 반환하세요:
{
  "defectType": "하자 유형 (벽지찢김, 벽균열, 마루판들뜸, 타일균열, 페인트벗겨짐, 천장누수, 욕실곰팡이, 문틀변형, 콘센트불량, 창문잠금불량 중 선택)",
  "confidence": 0.95,
  "location": "구체적인 위치 (예: 거실 좌측 상단, 주방 싱크대 하단)",
  "severity": "심각도 (경미, 보통, 심각 중 선택)",
  "description": "상세한 하자 설명"
}`;
  }

  async loadModel() {
    // 클라우드 API는 로드 불필요
    this.isLoaded = true;
    console.log(`✅ ${this.name} 준비 완료 (Provider: ${this.provider})`);
  }

  async analyze(imageFile, localResult = null) {
    const startTime = performance.now();
    
    if (!this.isLoaded) {
      await this.loadModel();
    }

    try {
      // 이미지를 Base64로 변환
      const base64Image = await this.fileToBase64(imageFile);
      
      // 프롬프트 준비
      const prompt = this.preparePrompt(localResult);
      
      // API 호출
      let result;
      if (this.provider === 'gpt4o') {
        result = await this.analyzeWithGPT4o(base64Image, prompt);
      } else if (this.provider === 'gemini') {
        result = await this.analyzeWithGemini(base64Image, prompt);
      } else if (this.provider === 'claude') {
        result = await this.analyzeWithClaude(base64Image, prompt);
      }
      
      const processingTime = performance.now() - startTime;
      
      return {
        ...result,
        source: `cloud-${this.provider}`,
        processingTime: Math.round(processingTime),
        localPrediction: localResult
      };
      
    } catch (error) {
      console.error(`❌ ${this.name} 분석 실패:`, error);
      throw error;
    }
  }

  preparePrompt(localResult) {
    if (!localResult) {
      return this.promptTemplate
        .replace('{localPrediction}', '없음')
        .replace('{localConfidence}', '0');
    }
    
    return this.promptTemplate
      .replace('{localPrediction}', localResult.defectType)
      .replace('{localConfidence}', localResult.confidence.toFixed(2));
  }

  async analyzeWithGPT4o(base64Image, prompt) {
    console.log('🌐 GPT-4o 분석 시작...');
    
    // Backend API를 통해 호출 (API 키 보호)
    const response = await api.analyzeDefectWithAI(base64Image, prompt, 'gpt4o');
    
    return response;
  }

  async analyzeWithGemini(base64Image, prompt) {
    console.log('🌐 Gemini Pro Vision 분석 시작...');
    
    // Backend API를 통해 호출
    const response = await api.analyzeDefectWithAI(base64Image, prompt, 'gemini');
    
    return response;
  }

  async analyzeWithClaude(base64Image, prompt) {
    console.log('🌐 Claude 3.5 Sonnet 분석 시작...');
    
    // Backend API를 통해 호출
    const response = await api.analyzeDefectWithAI(base64Image, prompt, 'claude');
    
    return response;
  }

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * 프로바이더 전환
   * @param {string} provider - 'gpt4o', 'gemini', 'claude'
   */
  switchProvider(provider) {
    if (!['gpt4o', 'gemini', 'claude'].includes(provider)) {
      throw new Error(`Invalid provider: ${provider}`);
    }
    
    console.log(`🔄 클라우드 AI 프로바이더 전환: ${this.provider} → ${provider}`);
    this.provider = provider;
    
    // 비용 정보 업데이트
    const costs = {
      gpt4o: '$2.5/1M tokens',
      gemini: '$0.25/1K images',
      claude: '$3/1M tokens'
    };
    
    console.log(`💰 예상 비용: ${costs[provider]}`);
  }
}

