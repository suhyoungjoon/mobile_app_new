const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const aiDetectionService = require('../services/aiDetectionService');
const aiDetectionSettingsService = require('../services/aiDetectionSettingsService');
const localVisionService = require('../services/localVisionService');

const router = express.Router();

/**
 * 이미지 하자 분석 (하이브리드)
 */
router.post('/detect', authenticateToken, async (req, res) => {
  try {
    const { imageBase64, photoType = 'near' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: '이미지 데이터가 필요합니다.' });
    }

    const result = await aiDetectionService.analyze({ imageBase64, photoType });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ AI 분석 실패:', error);
    res.status(500).json({ error: 'AI 분석에 실패했습니다.', details: error.message });
  }
});

/**
 * AI 판정 설정 조회 (관리자용)
 */
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const settings = await aiDetectionSettingsService.getSettings();

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('❌ AI 설정 조회 실패:', error);
    res.status(500).json({ error: 'AI 설정 조회에 실패했습니다.' });
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
    res.status(500).json({ error: 'AI 설정 업데이트에 실패했습니다.' });
  }
});

module.exports = router;

