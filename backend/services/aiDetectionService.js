const azureVisionService = require('./azureVisionService');
const localVisionService = require('./localVisionService');
const aiDetectionSettingsService = require('./aiDetectionSettingsService');
const huggingFaceVisionService = require('./huggingFaceVisionService');

class AiDetectionService {
  /**
   * 하이브리드 분석 실행
   */
  async analyze({ imageBase64, photoType = 'near' }) {
    const settings = await aiDetectionSettingsService.getSettings();
    const provider = settings.provider || (settings.mode === 'huggingface' ? 'huggingface' : 'azure');

    // 설정된 규칙을 로컬 서비스에 적용
    if (settings.rules) {
      localVisionService.setRules(settings.rules);
    } else {
      localVisionService.setRules();
    }

    const responses = [];
    let localResult = null;

    if (settings.localEnabled) {
      try {
        localResult = await localVisionService.analyze(imageBase64, {
          baseConfidence: settings.localBaseConfidence
        });
        responses.push({
          source: 'local',
          success: true,
          ...localResult
        });
      } catch (error) {
        responses.push({
          source: 'local',
          success: false,
          error: error.message
        });
      }
    }

    if (provider === 'azure') {
      const shouldCallAzure =
        settings.azureEnabled &&
        (settings.mode === 'azure' ||
          (settings.mode === 'hybrid' &&
            (!localResult || localResult.confidence < settings.azureFallbackThreshold)));

      if (shouldCallAzure) {
        try {
          const azureAnalysis = await azureVisionService.analyzeDefect(imageBase64, photoType);

          responses.push({
            source: 'azure',
            success: true,
            analysis: azureAnalysis
          });
        } catch (error) {
          responses.push({
            source: 'azure',
            success: false,
            error: error.message
          });
        }
      }
    } else if (provider === 'huggingface') {
      const shouldCallHuggingFace =
        settings.huggingfaceEnabled &&
        (settings.mode === 'huggingface' ||
          (settings.mode === 'hybrid' &&
            (!localResult || localResult.confidence < settings.azureFallbackThreshold)));

      if (shouldCallHuggingFace) {
        try {
          const hfAnalysis = await huggingFaceVisionService.analyzeDefect(
            imageBase64,
            settings.huggingfaceModel
          );

          responses.push({
            source: 'huggingface',
            success: true,
            analysis: hfAnalysis
          });
        } catch (error) {
          responses.push({
            source: 'huggingface',
            success: false,
            error: error.message
          });
        }
      }
    }

    return {
      mode: settings.mode,
      provider,
      responses,
      finalDetection: this._selectFinalDetection(responses, settings),
      settings
    };
  }

  /**
   * 최종 판정 선택 로직
   */
  _selectFinalDetection(responses, settings) {
    const azureResponse = responses.find((res) => res.source === 'azure' && res.success);
    const localResponse = responses.find((res) => res.source === 'local' && res.success);
    const hfResponse = responses.find((res) => res.source === 'huggingface' && res.success);

    if (settings.mode === 'azure' && azureResponse) {
      return { source: 'azure', ...azureResponse };
    }

    if (settings.mode === 'huggingface' && hfResponse) {
      return { source: 'huggingface', ...hfResponse };
    }

    if (settings.mode === 'local' && localResponse) {
      return { source: 'local', ...localResponse };
    }

    if (settings.mode === 'hybrid') {
      if (hfResponse && hfResponse.analysis?.detectedDefects?.length) {
        return { source: 'huggingface', ...hfResponse };
      }
      if (azureResponse && azureResponse.analysis?.detectedDefects?.length) {
        return { source: 'azure', ...azureResponse };
      }
      if (localResponse) {
        return { source: 'local', ...localResponse };
      }
    }

    // 아무 것도 없는 경우
    return {
      source: null,
      success: false,
      message: '사용 가능한 AI 분석 결과가 없습니다.'
    };
  }
}

module.exports = new AiDetectionService();

