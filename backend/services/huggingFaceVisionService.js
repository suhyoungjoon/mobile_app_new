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

  async analyzeDefect(imageBase64, modelName = 'microsoft/resnet-50', options = {}) {
    if (!imageBase64) {
      throw new Error('이미지 데이터가 필요합니다.');
    }

    const { task = 'image-classification', prompt, maxDetections = 5 } = options;

    const buffer = imageBase64.startsWith('data:')
      ? Buffer.from(imageBase64.split(',')[1], 'base64')
      : Buffer.from(imageBase64, 'base64');

    const endpoint = `${this.baseUrl}/models/${encodeURIComponent(modelName)}`;
    const isJsonTask = ['image-to-text', 'visual-question-answering', 'captioning'].includes(task);
    const imageDataUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const headers = {
      ...this._getHeaders(),
      'Content-Type': isJsonTask ? 'application/json' : 'application/octet-stream'
    };

    const body = isJsonTask
      ? JSON.stringify({
          inputs:
            task === 'visual-question-answering'
              ? {
                  image: imageDataUrl,
                  question:
                    prompt ||
                    'Identify any building defects such as cracks, leaks, or mold in this image.'
                }
              : {
                  image: imageDataUrl,
                  prompt:
                    prompt ||
                    'Describe any building defects such as cracks, water leaks, mold, or safety issues.'
                }
        })
      : buffer;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body
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
    return this._parseDetections(data, modelName, { task, maxDetections, prompt });
  }

  _parseDetections(rawResponse, modelName, options = {}) {
    const { task = 'image-classification', maxDetections = 5 } = options;

    if (task === 'image-to-text' || task === 'visual-question-answering' || task === 'captioning') {
      return this._parseTextualResponse(rawResponse, modelName, options);
    }

    const list = Array.isArray(rawResponse)
      ? rawResponse
      : Array.isArray(rawResponse?.predictions)
      ? rawResponse.predictions
      : Array.isArray(rawResponse?.[0]?.predictions)
      ? rawResponse[0].predictions
      : null;

    if (!Array.isArray(list)) {
      return {
        detectedDefects: [],
        overallAssessment: '모델 응답 형식을 해석할 수 없습니다.',
        raw: rawResponse
      };
    }

    const detections = list
      .map(item => {
        const score = item.score ?? item.confidence ?? item.probability ?? 0;
        const label =
          item.label ??
          item.class ??
          item.class_name ??
          item.actualDefect ??
          'HuggingFace 예측';
        const box = item.box ?? item.boundingBox ?? item.bbox ?? null;
        const severity = score > 0.75 ? '심각' : score > 0.5 ? '보통' : '경미';

        return {
          type: label,
          actualDefect: label,
          confidence: score,
          severity,
          description: `Hugging Face 모델(${modelName})에서 감지된 하자 유형입니다.`,
          repairSuggestion: '',
          ...(box
            ? {
                boundingBox: {
                  xmin: box.xmin ?? box[0] ?? box.x1 ?? null,
                  ymin: box.ymin ?? box[1] ?? box.y1 ?? null,
                  xmax: box.xmax ?? box[2] ?? box.x2 ?? null,
                  ymax: box.ymax ?? box[3] ?? box.y2 ?? null,
                  width:
                    box.width ??
                    (box.xmax != null && box.xmin != null ? box.xmax - box.xmin : null),
                  height:
                    box.height ??
                    (box.ymax != null && box.ymin != null ? box.ymax - box.ymin : null)
                }
              }
            : {})
        };
      })
      .filter(item => typeof item.confidence === 'number' && item.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxDetections);

    return {
      detectedDefects: detections,
      overallAssessment: detections.length
        ? `${detections[0].type} 가능성이 가장 높습니다.`
        : '확실한 하자를 감지하지 못했습니다.',
      raw: rawResponse
    };
  }

  _parseTextualResponse(rawResponse, modelName, options = {}) {
    const { prompt } = options;
    let textOutputs = [];

    if (typeof rawResponse === 'string') {
      textOutputs = [rawResponse];
    } else if (Array.isArray(rawResponse)) {
      textOutputs = rawResponse
        .map((item) => item.generated_text || item.caption || item.output || item)
        .filter(Boolean)
        .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)));
    } else if (rawResponse && typeof rawResponse === 'object') {
      if (rawResponse.generated_text) {
        textOutputs = [rawResponse.generated_text];
      } else if (Array.isArray(rawResponse.answers)) {
        textOutputs = rawResponse.answers.map((ans) => ans.text || ans.answer || ans);
      } else if (rawResponse.output_text) {
        textOutputs = Array.isArray(rawResponse.output_text)
          ? rawResponse.output_text
          : [rawResponse.output_text];
      }
    }

    if (textOutputs.length === 0) {
      return {
        detectedDefects: [],
        overallAssessment: '모델이 텍스트 설명을 반환하지 않았습니다.',
        raw: rawResponse
      };
    }

    const detections = textOutputs.map((text, index) => ({
      type: index === 0 ? 'AI 텍스트 분석' : `AI 텍스트 분석 #${index + 1}`,
      actualDefect: '텍스트 설명',
      confidence: 0.55,
      severity: text.toLowerCase().includes('crack') || text.includes('균열') ? '심각' : '보통',
      description: text,
      promptUsed: prompt || ''
    }));

    return {
      detectedDefects: detections,
      overallAssessment: detections[0].description,
      raw: rawResponse
    };
  }
}

module.exports = new HuggingFaceVisionService();

