const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const aiDetectionService = require('../services/aiDetectionService');
const aiDetectionSettingsService = require('../services/aiDetectionSettingsService');
const localVisionService = require('../services/localVisionService');
const { asyncHandler, createSafeErrorResponse } = require('../utils/errorHandler');
const config = require('../config');

const router = express.Router();

/**
 * 이미지 하자 분석 (하이브리드)
 */
router.post('/detect', authenticateToken, asyncHandler(async (req, res) => {
  const { imageBase64, photoType = 'near' } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ 
      success: false,
      error: 'validation_error',
      message: '이미지 데이터가 필요합니다.' 
    });
  }

  try {
    const result = await aiDetectionService.analyze({ imageBase64, photoType });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ AI 분석 실패:', error);
    
    // 에러 타입별 처리
    const errorResponse = createSafeErrorResponse(
      error, 
      'AI 분석에 실패했습니다. 수동으로 하자를 등록해주세요.'
    );
    
    // AI 분석 실패는 치명적이지 않으므로 200으로 응답 (graceful degradation)
    res.status(200).json({
      success: false,
      ...errorResponse,
      fallback: true,
      message: 'AI 분석에 실패했습니다. 수동으로 하자를 등록해주세요.'
    });
  }
}));

/**
 * AI 판정 설정 조회 (관리자용)
 */
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 AI 설정 조회 요청:', {
      user: req.user ? { isAdmin: req.user.isAdmin, adminId: req.user.adminId } : 'no user',
      hasToken: !!req.headers.authorization
    });

    if (!req.user || !req.user.isAdmin) {
      console.warn('⚠️ 관리자 권한 없음:', req.user);
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const settings = await aiDetectionSettingsService.getSettings();
    console.log('✅ AI 설정 조회 성공:', { mode: settings.mode, provider: settings.provider });

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('❌ AI 설정 조회 실패:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      constraint: error.constraint
    });
    
    const errorResponse = createSafeErrorResponse(error, 'AI 설정 조회에 실패했습니다.');
    res.status(500).json({
      success: false,
      ...errorResponse
    });
  }
});

/**
 * AI 판정 설정 업데이트 (관리자용)
 */
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const {
      mode,
      provider,
      azureEnabled,
      localEnabled,
      azureFallbackThreshold,
      localBaseConfidence,
      maxDetections,
      huggingfaceEnabled,
      huggingfaceModel,
      rules
    } = req.body;

    const newSettings = await aiDetectionSettingsService.upsertSettings({
      mode,
      provider,
      azureEnabled,
      localEnabled,
      azureFallbackThreshold,
      localBaseConfidence,
      maxDetections,
      huggingfaceEnabled,
      huggingfaceModel,
      rules
    });

    // 규칙이 변경되었으면 즉시 적용
    if (rules) {
      localVisionService.setRules(rules);
    } else {
      localVisionService.setRules();
    }

    res.json({
      success: true,
      settings: newSettings
    });
  } catch (error) {
    console.error('❌ AI 설정 업데이트 실패:', error);
    
    const errorResponse = createSafeErrorResponse(error, 'AI 설정 업데이트에 실패했습니다.');
    res.status(500).json({
      success: false,
      ...errorResponse
    });
  }
});

module.exports = router;

