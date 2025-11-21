// Azure OpenAI Service를 이용한 하자 이미지 분석 API
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const azureVisionService = require('../services/azureVisionService');
const { isFeatureAvailable, createFeatureUnavailableError, asyncHandler, createSafeErrorResponse } = require('../utils/errorHandler');
const config = require('../config');

const router = express.Router();

// 이미지 분석 요청
router.post('/analyze-defect', authenticateToken, asyncHandler(async (req, res) => {
  const { imageBase64, photoType } = req.body;
  
  if (!imageBase64) {
    return res.status(400).json({ 
      success: false,
      error: 'validation_error',
      message: '이미지가 필요합니다' 
    });
  }
  
  // Azure OpenAI 설정 확인
  if (!isFeatureAvailable('azure-ai')) {
    return res.status(503).json(createFeatureUnavailableError('azure-ai'));
  }
  
  try {
    const analysis = await azureVisionService.analyzeDefect(imageBase64, photoType);

    // 응답 반환
    res.json({
      success: true,
      analysis: analysis,
      photoType: photoType,
      timestamp: new Date().toISOString()
    });
    
    const detectedCount = Array.isArray(analysis.detectedDefects) ? analysis.detectedDefects.length : 0;
    console.log('✅ 하자 분석 완료:', detectedCount, '개 하자 감지');
    
  } catch (error) {
    console.error('❌ Azure OpenAI 분석 실패:', error);
    
    // 에러 타입별 처리
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(503).json({
        success: false,
        error: 'azure_ai_auth_error',
        message: 'Azure OpenAI 인증에 실패했습니다. API 키를 확인해주세요.',
        details: 'Azure OpenAI API 키가 유효하지 않거나 만료되었을 수 있습니다.'
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(503).json({
        success: false,
        error: 'azure_ai_rate_limit',
        message: 'Azure OpenAI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        details: '너무 많은 요청이 발생했습니다. 잠시 기다린 후 다시 시도해주세요.'
      });
    }
    
    // 기타 에러 - graceful degradation
    res.status(500).json({ 
      success: false,
      error: 'azure_ai_analysis_failed',
      message: 'AI 분석에 실패했습니다. 수동으로 하자를 등록해주세요.',
      details: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
}));

// 텍스트 기반 하자 상담 (선택 사항)
router.post('/consult', authenticateToken, async (req, res) => {
  try {
    const { question, defectType, context } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: '질문이 필요합니다' });
    }
    
    const answer = await azureVisionService.consult({ question, defectType, context });
    
    res.json({
      success: true,
      answer: answer,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ 상담 처리 실패:', error);
    res.status(500).json({ 
      error: '상담 처리 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

// Azure OpenAI 연결 상태 확인
router.get('/status', authenticateToken, asyncHandler(async (req, res) => {
  // Azure OpenAI 설정 확인
  if (!isFeatureAvailable('azure-ai')) {
    return res.json({
      status: 'unavailable',
      available: false,
      message: 'Azure OpenAI가 설정되지 않았습니다.',
      reason: 'configuration_missing'
    });
  }
  
  try {
    const status = await azureVisionService.checkStatus();
    
    res.json({ 
      status: 'ok', 
      available: true,
      ...status, 
      message: 'Azure OpenAI 서비스가 정상 작동 중입니다' 
    });
    
  } catch (error) {
    res.json({
      status: 'error',
      available: false,
      message: 'Azure OpenAI 연결 실패',
      details: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
}));

module.exports = router;

