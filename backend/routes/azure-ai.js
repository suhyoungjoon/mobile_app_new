// Azure OpenAI Service를 이용한 하자 이미지 분석 API
const express = require('express');
const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Azure OpenAI 설정
const endpoint = process.env.AZURE_OPENAI_ENDPOINT || 'https://your-resource.openai.azure.com';
const apiKey = process.env.AZURE_OPENAI_API_KEY || 'your-api-key';
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4-vision'; // GPT-4 Vision 배포 이름

// OpenAI 클라이언트 초기화
let client;
try {
  client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));
  console.log('✅ Azure OpenAI Client 초기화 완료');
} catch (error) {
  console.error('❌ Azure OpenAI Client 초기화 실패:', error);
}

// 하자 유형 정의
const DEFECT_TYPES = [
  '벽지찢김', '벽균열', '마루판들뜸', '타일균열', '페인트벗겨짐',
  '천장누수', '욕실곰팡이', '문틀변형', '콘센트불량', '창문잠금불량'
];

// 이미지 분석 요청
router.post('/analyze-defect', authenticateToken, async (req, res) => {
  try {
    const { imageBase64, photoType } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: '이미지가 필요합니다' });
    }
    
    console.log('🔍 Azure OpenAI로 하자 이미지 분석 시작...');
    
    // GPT-4 Vision에게 이미지 분석 요청
    const prompt = `당신은 건설 하자 전문가입니다. 제공된 이미지를 분석하여 다음 중 가장 적합한 하자 유형을 찾아주세요:

하자 유형 목록:
${DEFECT_TYPES.map((type, index) => `${index + 1}. ${type}`).join('\n')}

다음 JSON 형식으로 응답해주세요:
{
  "detectedDefects": [
    {
      "type": "하자유형명",
      "confidence": 0.95,
      "severity": "심각|보통|경미",
      "description": "구체적인 하자 설명 (한글로)",
      "location": "예상 위치",
      "repairSuggestion": "보수 방법 제안"
    }
  ],
  "overallAssessment": "전체적인 평가 (한글로)"
}

주의사항:
- 이미지에서 실제로 보이는 하자만 감지하세요
- 하자가 없으면 빈 배열을 반환하세요
- 신뢰도(confidence)는 0.0~1.0 사이 값
- 심각도는 하자의 정도에 따라 판단
- 설명은 구체적이고 전문적으로 작성`;

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
    
    // Azure OpenAI API 호출
    const result = await client.getChatCompletions(
      deploymentName,
      messages,
      {
        maxTokens: 1000,
        temperature: 0.3, // 일관성 있는 분석을 위해 낮은 temperature
      }
    );
    
    const responseText = result.choices[0].message.content;
    console.log('🤖 Azure OpenAI 응답:', responseText);
    
    // JSON 파싱
    let analysis;
    try {
      // JSON 블록 추출 (```json ... ``` 형태일 수 있음)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON 형식을 찾을 수 없습니다');
      }
    } catch (parseError) {
      console.error('JSON 파싱 실패:', parseError);
      // 파싱 실패 시 기본 응답
      analysis = {
        detectedDefects: [],
        overallAssessment: responseText
      };
    }
    
    // 응답 반환
    res.json({
      success: true,
      analysis: analysis,
      photoType: photoType,
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ 하자 분석 완료:', analysis.detectedDefects.length, '개 하자 감지');
    
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
    
    const prompt = `당신은 건설 하자 전문가입니다. 다음 질문에 답변해주세요:

질문: ${question}
${defectType ? `하자 유형: ${defectType}` : ''}
${context ? `추가 정보: ${context}` : ''}

전문적이고 이해하기 쉽게 한글로 답변해주세요.`;

    const messages = [
      { role: 'system', content: '당신은 건설 하자 보수 전문가입니다. 정확하고 실용적인 조언을 제공합니다.' },
      { role: 'user', content: prompt }
    ];
    
    const result = await client.getChatCompletions(
      deploymentName,
      messages,
      {
        maxTokens: 500,
        temperature: 0.7,
      }
    );
    
    const answer = result.choices[0].message.content;
    
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
    if (!client) {
      return res.status(503).json({
        status: 'error',
        message: 'Azure OpenAI 클라이언트가 초기화되지 않았습니다'
      });
    }
    
    // 간단한 테스트 요청
    const testResult = await client.getChatCompletions(
      deploymentName,
      [{ role: 'user', content: '안녕하세요' }],
      { maxTokens: 10 }
    );
    
    res.json({
      status: 'ok',
      endpoint: endpoint.replace(/https?:\/\/([^.]+)\..*/, 'https://$1.***'),
      deployment: deploymentName,
      message: 'Azure OpenAI 서비스가 정상 작동 중입니다'
    });
    
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Azure OpenAI 연결 실패',
      details: error.message
    });
  }
});

module.exports = router;

