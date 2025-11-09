const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');

/**
 * Azure OpenAI Vision 분석 서비스
 * 기존 azure-ai 라우터의 로직을 서비스 형태로 분리하여
 * 다른 모듈에서도 재사용할 수 있도록 구성합니다.
 */
class AzureVisionService {
  constructor() {
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    this.apiKey = process.env.AZURE_OPENAI_API_KEY;
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4-vision';
    this.client = null;
    this.initialized = false;
  }

  /**
   * Azure OpenAI 클라이언트를 초기화합니다.
   */
  initialize() {
    if (this.initialized) return;

    if (!this.endpoint || !this.apiKey) {
      throw new Error('Azure OpenAI 환경 변수가 설정되어 있지 않습니다');
    }

    this.client = new OpenAIClient(this.endpoint, new AzureKeyCredential(this.apiKey));
    this.initialized = true;
  }

  /**
   * Azure OpenAI Vision 모델을 호출하여 하자 분석을 수행합니다.
   * @param {string} imageBase64 Base64 인코딩된 이미지 (data URL 가능)
   * @param {'near'|'far'} photoType 근거리/원거리 여부
   * @returns {Promise<object>} 분석 결과
   */
  async analyzeDefect(imageBase64, photoType = 'near') {
    this.initialize();

    const prompt = `당신은 건설 현장의 하자 전문가입니다. 제공된 ${
      photoType === 'near' ? '근접' : '전체'
    } 사진을 분석하여 건축 하자를 감지하고 분석해주세요.

분석 절차:
1. 이미지에서 발견되는 하자를 자유롭게 감지하고 설명하세요
2. 감지된 하자를 다음 카테고리 중 가장 유사한 것으로 분류하세요:
   1. 벽지찢김, 2. 벽균열, 3. 마루판들뜸, 4. 타일균열, 5. 페인트벗겨짐,
   6. 천장누수, 7. 욕실곰팡이, 8. 문틀변형, 9. 콘센트불량, 10. 창문잠금불량
3. 위 카테고리에 정확히 맞지 않는 경우 가장 가까운 카테고리를 선택하세요

응답 형식 (JSON):
{
  "detectedDefects": [
    {
      "type": "카테고리명",
      "actualDefect": "실제 감지된 하자명",
      "confidence": 0.85,
      "severity": "심각|보통|경미",
      "description": "하자에 대한 구체적인 설명",
      "repairSuggestion": "보수 방법 및 난이도"
    }
  ],
  "overallAssessment": "전체적인 평가 (한글)"
}

주의사항:
- 이미지에서 실제로 보이는 하자만 감지하세요
- 하자가 없으면 빈 배열을 반환하세요
- 신뢰도(confidence)는 0~1 사이 값입니다.`;

    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            imageUrl: {
              url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      }
    ];

    const result = await this.client.getChatCompletions(this.deploymentName, messages, {
      maxTokens: 1000,
      temperature: 0.3
    });

    const responseText = result.choices[0]?.message?.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        detectedDefects: [],
        overallAssessment: responseText || '분석 결과를 해석할 수 없습니다.'
      };
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      return {
        detectedDefects: [],
        overallAssessment: responseText,
        parseError: error.message
      };
    }
  }

  /**
   * Azure OpenAI 연결 상태를 확인합니다.
   */
  async checkStatus() {
    this.initialize();

    const testResult = await this.client.getChatCompletions(
      this.deploymentName,
      [{ role: 'user', content: '안녕하세요' }],
      { maxTokens: 5 }
    );

    return {
      endpoint: this.endpoint,
      deployment: this.deploymentName,
      testMessage: testResult?.choices?.[0]?.message?.content || null
    };
  }

  /**
   * 텍스트 기반 상담을 수행합니다.
   */
  async consult({ question, defectType, context }) {
    this.initialize();

    const prompt = `당신은 건설 하자 전문가입니다. 다음 질문에 답변해주세요:

질문: ${question}
${defectType ? `하자 유형: ${defectType}` : ''}
${context ? `추가 정보: ${context}` : ''}

전문적이고 이해하기 쉽게 한글로 답변해주세요.`;

    const messages = [
      { role: 'system', content: '당신은 건설 하자 보수 전문가입니다. 정확하고 실용적인 조언을 제공합니다.' },
      { role: 'user', content: prompt }
    ];

    const result = await this.client.getChatCompletions(
      this.deploymentName,
      messages,
      {
        maxTokens: 500,
        temperature: 0.7
      }
    );

    return result.choices[0]?.message?.content || '';
  }
}

module.exports = new AzureVisionService();

