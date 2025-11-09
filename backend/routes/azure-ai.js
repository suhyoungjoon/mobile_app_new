// Azure OpenAI Service를 이용한 하자 이미지 분석 API
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const azureVisionService = require('../services/azureVisionService');

const router = express.Router();

// 이미지 분석 요청
router.post('/analyze-defect', authenticateToken, async (req, res) => {
  try {
    const { imageBase64, photoType } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: '이미지가 필요합니다' });
    }
    
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
    res.status(500).json({ 
      error: '하자 분석 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

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
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = await azureVisionService.checkStatus();
    
    res.json({ status: 'ok', ...status, message: 'Azure OpenAI 서비스가 정상 작동 중입니다' });
    
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Azure OpenAI 연결 실패',
      details: error.message
    });
  }
});

module.exports = router;

