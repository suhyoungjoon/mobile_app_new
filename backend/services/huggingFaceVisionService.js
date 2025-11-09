class HuggingFaceVisionService {
  constructor() {
    this.apiToken = process.env.HUGGINGFACE_API_TOKEN;
    this.baseUrl = process.env.HUGGINGFACE_ROUTER_BASE_URL || 'https://router.huggingface.co/hf-inference';
  }

  _getHeaders() {
    if (!this.apiToken) {
      throw new Error('HUGGINGFACE_API_TOKEN 환경 변수가 설정되어 있지 않습니다.');
    }

    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/octet-stream',
      Accept: 'application/json',
      'x-wait-for-model': 'true'
    };
  }

  async analyzeDefect(imageBase64, modelName = 'microsoft/resnet-50') {
    if (!imageBase64) {
      throw new Error('이미지 데이터가 필요합니다.');
    }

    const buffer = imageBase64.startsWith('data:')
      ? Buffer.from(imageBase64.split(',')[1], 'base64')
      : Buffer.from(imageBase64, 'base64');

    const endpoint = `${this.baseUrl}/models/${encodeURIComponent(modelName)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this._getHeaders(),
      body: buffer
    });

    if (response.status === 202) {
      throw new Error('Hugging Face 모델을 로딩 중입니다. 잠시 후 다시 시도해주세요.');
    }

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      const errText = await response.text();
      let detail = errText;
      if (contentType.includes('application/json')) {
        try {
          const parsed = JSON.parse(errText);
          detail = parsed.error || parsed.message || errText;
        } catch {
          // ignore JSON parse errors, keep original text
        }
      }

      throw new Error(`Hugging Face API 호출 실패: ${response.status} ${detail}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return {
        detectedDefects: [],
        overallAssessment: '모델 응답 형식을 해석할 수 없습니다.',
        raw: data
      };
    }

    const detections = data
      .filter(item => typeof item.score === 'number' && item.score > 0)
      .slice(0, 3)
      .map(item => ({
        type: item.label || 'HuggingFace 예측',
        actualDefect: item.label || 'HuggingFace 예측',
        confidence: item.score,
        severity: item.score > 0.75 ? '심각' : item.score > 0.5 ? '보통' : '경미',
        description: `Hugging Face 모델(${modelName})에서 감지된 하자 유형입니다.`,
        repairSuggestion: ''
      }));

    return {
      detectedDefects: detections,
      overallAssessment: detections.length
        ? `${detections[0].type} 가능성이 가장 높습니다.`
        : '확실한 하자를 감지하지 못했습니다.',
      raw: data
    };
  }
}

module.exports = new HuggingFaceVisionService();

