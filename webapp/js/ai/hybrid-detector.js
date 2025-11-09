// 하이브리드 AI 디텍터 (로컬 + 클라우드)
class HybridDetector {
  constructor() {
    this.settings = null;
    this.stats = {
      totalAnalyses: 0,
      localOnly: 0,
      cloudCalls: 0,
      totalCost: 0,
      averageConfidence: 0,
      savedCost: 0
    };
    this._loadStats();
  }

  async initialize() {
    try {
      if (window.api && window.api.getAIDetectionSettings) {
        const response = await window.api.getAIDetectionSettings();
        if (response && response.success) {
          this.settings = response.settings;
          console.log('✅ AI Detection settings loaded:', this.settings);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load AI detection settings:', error);
    }
  }

  async analyze(imageFile, photoType = 'near') {
    const base64 = await this._fileToBase64(imageFile);
    const startTime = performance.now();

    const api = window.api || null;
    if (!api || !api.analyzeDefectHybrid) {
      throw new Error('API 클라이언트가 준비되지 않았습니다.');
    }

    const response = await api.analyzeDefectHybrid(base64, photoType);
    const totalTime = Math.round(performance.now() - startTime);

    console.log('🤖 Hybrid detection response:', response);

    if (response.settings) {
      this.settings = response.settings;
    }

    const finalSource = response?.finalDetection?.source;
    const finalData = response?.finalDetection;

    const formatted =
      finalSource === 'azure'
        ? this._formatAzureResult(finalData?.analysis?.detectedDefects || [], totalTime)
        : finalSource === 'huggingface'
        ? this._formatHuggingFaceResult(finalData?.analysis?.detectedDefects || [], totalTime, finalData?.analysis)
        : finalSource === 'local'
        ? this._formatLocalResult(finalData?.detectedDefects || [], totalTime, finalData?.stats)
        : {
            source: 'none',
            defects: [],
            primary: {
              defectType: '판정 불가',
              confidence: 0.0,
              severity: '보통',
              description: response?.finalDetection?.message || 'AI 분석 결과가 없습니다.'
            },
            totalProcessingTime: totalTime,
            stats: null
          };

    this._updateStats(formatted);
    return formatted;
  }

  async switchLocalMode(mode) {
    console.log('ℹ️ 로컬 모드 전환은 관리자 설정을 통해 수행됩니다. (요청 모드:', mode, ')');
  }

  switchCloudProvider(provider) {
    console.log('ℹ️ 클라우드 프로바이더 전환은 현재 지원되지 않습니다. (요청 프로바이더:', provider, ')');
  }

  setConfidenceThreshold(value) {
    const threshold = Math.max(0, Math.min(1, value));
    localStorage.setItem('ai_confidence_threshold', threshold.toString());
    if (this.settings) {
      this.settings.azureFallbackThreshold = threshold;
    }
    console.log(`🔧 (로컬) Azure 호출 임계값 설정: ${threshold}`);
  }

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

  resetStats() {
    this.stats = {
      totalAnalyses: 0,
      localOnly: 0,
      cloudCalls: 0,
      totalCost: 0,
      averageConfidence: 0,
      savedCost: 0
    };
    this._saveStats();
    console.log('🔄 AI 분석 통계를 초기화했습니다.');
  }

  _formatAzureResult(defects, totalTime) {
    if (!defects.length) {
      return {
        source: 'azure',
        defects: [],
        primary: {
          defectType: '하자 없음',
          confidence: 0.5,
          severity: '경미',
          description: 'Azure OpenAI 결과: 하자가 감지되지 않았습니다.',
          source: 'azure',
          processingTime: totalTime
        },
        totalProcessingTime: totalTime,
        stats: null
      };
    }

    const mapped = defects.map(defect => ({
      type: defect.type || defect.actualDefect || '미분류 하자',
      confidence: typeof defect.confidence === 'number' ? defect.confidence : parseFloat(defect.confidence) || 0.7,
      severity: defect.severity || '보통',
      description: defect.description || 'Azure OpenAI 분석 결과입니다.',
      recommendation: defect.repairSuggestion || ''
    }));

    return {
      source: 'azure',
      defects: mapped,
      primary: {
        ...mapped[0],
        source: 'azure',
        processingTime: totalTime
      },
      totalProcessingTime: totalTime,
      stats: null
    };
  }

  _formatLocalResult(defects, totalTime, stats = null) {
    if (!defects.length) {
      return {
        source: 'local',
        defects: [],
        primary: {
          defectType: '하자 없음',
          confidence: 0.5,
          severity: '경미',
          description: '로컬 규칙 기반 분석 결과: 하자가 감지되지 않았습니다.',
          source: 'local',
          processingTime: totalTime
        },
        stats,
        totalProcessingTime: totalTime
      };
    }

    const mapped = defects.map(defect => ({
      type: defect.type || '로컬 추정 하자',
      confidence: defect.confidence || 0.65,
      severity: defect.severity || '보통',
      description: defect.description || '로컬 규칙 기반 분석 결과입니다.',
      recommendation: defect.recommendation || ''
    }));

    return {
      source: 'local',
      defects: mapped,
      primary: {
        ...mapped[0],
        source: 'local',
        processingTime: totalTime
      },
      stats,
      totalProcessingTime: totalTime
    };
  }

  _formatHuggingFaceResult(defects, totalTime, analysis = {}) {
    if (!defects.length) {
      return {
        source: 'huggingface',
        defects: [],
        primary: {
          defectType: '하자 없음',
          confidence: 0.5,
          severity: '경미',
          description: 'Hugging Face 모델에서 명확한 하자를 찾지 못했습니다.',
          source: 'huggingface',
          processingTime: totalTime
        },
        stats: null,
        totalProcessingTime: totalTime,
        raw: analysis?.raw
      };
    }

    const mapped = defects.map(defect => ({
      type: defect.type || 'Hugging Face 예측',
      confidence: defect.confidence || 0.65,
      severity: defect.severity || '보통',
      description: defect.description || 'Hugging Face 인퍼런스 결과입니다.',
      recommendation: defect.repairSuggestion || defect.recommendation || ''
    }));

    return {
      source: 'huggingface',
      defects: mapped,
      primary: {
        ...mapped[0],
        source: 'huggingface',
        processingTime: totalTime
      },
      stats: null,
      totalProcessingTime: totalTime,
      raw: analysis?.raw
    };
  }

  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  _updateStats(result) {
    this.stats.totalAnalyses += 1;

    const confidence = result?.primary?.confidence || 0;
    this.stats.averageConfidence = this.stats.totalAnalyses === 1
      ? confidence
      : (this.stats.averageConfidence * 0.7 + confidence * 0.3);

    if (result.source === 'local') {
      this.stats.localOnly += 1;
      this.stats.savedCost += 0.0025;
    } else if (result.source === 'azure' || result.source === 'huggingface') {
      this.stats.cloudCalls += 1;
      this.stats.totalCost += 0.0025;
    }

    this._saveStats();
  }

  _saveStats() {
    try {
      localStorage.setItem('ai_stats', JSON.stringify(this.stats));
    } catch (error) {
      console.warn('AI 통계 저장 실패:', error);
    }
  }

  _loadStats() {
    try {
      const saved = localStorage.getItem('ai_stats');
      if (saved) {
        this.stats = { ...this.stats, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('AI 통계 로드 실패:', error);
    }
  }
}

