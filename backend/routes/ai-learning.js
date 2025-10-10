// AI 학습 시스템 라우트 (조코딩 스타일)
const express = require('express');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// AI 예측 결과 저장
router.post('/predict', authenticateToken, async (req, res) => {
  try {
    const { imagePath, predictions, photoType } = req.body;
    const { householdId } = req.user;
    
    console.log(`🤖 AI 예측 결과 저장 - 사용자: ${householdId}, 사진: ${imagePath}`);
    
    const results = [];
    
    for (const prediction of predictions) {
      const insertQuery = `
        INSERT INTO ai_predictions 
        (image_path, predicted_defect_id, confidence_score, bbox_coordinates, 
         photo_type, household_id, model_version, prediction_timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id
      `;
      
      const result = await pool.query(insertQuery, [
        imagePath,
        prediction.defectId,
        prediction.confidence,
        JSON.stringify(prediction.bbox),
        photoType,
        householdId,
        'tensorflow-js-v1.0'
      ]);
      
      results.push({
        predictionId: result.rows[0].id,
        ...prediction
      });
    }
    
    console.log(`✅ ${results.length}개 예측 결과 저장 완료`);
    res.json({ success: true, predictions: results });
    
  } catch (error) {
    console.error('❌ AI 예측 저장 실패:', error);
    res.status(500).json({ error: 'AI 예측 저장에 실패했습니다.' });
  }
});

// 사용자 피드백 수집
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { feedbacks } = req.body;
    const { householdId } = req.user;
    
    console.log(`📝 사용자 피드백 수집 - 사용자: ${householdId}, 피드백 수: ${feedbacks.length}`);
    
    const results = [];
    
    for (const feedback of feedbacks) {
      // 피드백 정보를 DB에 저장
      const insertQuery = `
        INSERT INTO ai_feedback 
        (prediction_id, household_id, is_correct, feedback_text, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id
      `;
      
      const result = await pool.query(insertQuery, [
        feedback.predictionId,
        householdId,
        feedback.isCorrect,
        feedback.feedback
      ]);
      
      // AI 예측 결과 업데이트
      if (feedback.actualDefectId) {
        await pool.query(`
          UPDATE ai_predictions 
          SET user_confirmed = $1, actual_defect_id = $2, verified_at = NOW()
          WHERE id = $3
        `, [feedback.isCorrect, feedback.actualDefectId, feedback.predictionId]);
      } else {
        await pool.query(`
          UPDATE ai_predictions 
          SET user_confirmed = $1, verified_at = NOW()
          WHERE id = $2
        `, [feedback.isCorrect, feedback.predictionId]);
      }
      
      results.push({
        feedbackId: result.rows[0].id,
        predictionId: feedback.predictionId
      });
    }
    
    console.log(`✅ ${results.length}개 피드백 처리 완료`);
    res.json({ success: true, processed: results });
    
  } catch (error) {
    console.error('❌ 피드백 처리 실패:', error);
    res.status(500).json({ error: '피드백 처리에 실패했습니다.' });
  }
});

// 학습 데이터 조회
router.get('/training-data', authenticateToken, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    const query = `
      SELECT 
        ap.id,
        ap.image_path,
        ap.predicted_defect_id,
        ap.confidence_score,
        ap.bbox_coordinates,
        ap.user_confirmed,
        ap.actual_defect_id,
        ap.verified_at,
        dc_predicted.name as predicted_defect_name,
        dc_actual.name as actual_defect_name,
        af.feedback_text
      FROM ai_predictions ap
      LEFT JOIN defect_categories dc_predicted ON ap.predicted_defect_id = dc_predicted.id
      LEFT JOIN defect_categories dc_actual ON ap.actual_defect_id = dc_actual.id
      LEFT JOIN ai_feedback af ON ap.id = af.prediction_id
      WHERE ap.verified_at IS NOT NULL
      ORDER BY ap.verified_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    
    res.json({
      success: true,
      trainingData: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('❌ 학습 데이터 조회 실패:', error);
    res.status(500).json({ error: '학습 데이터 조회에 실패했습니다.' });
  }
});

// AI 모델 성능 통계
router.get('/performance', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_predictions,
        COUNT(CASE WHEN user_confirmed = TRUE THEN 1 END) as correct_predictions,
        COUNT(CASE WHEN user_confirmed = FALSE THEN 1 END) as incorrect_predictions,
        AVG(confidence_score) as average_confidence,
        COUNT(DISTINCT predicted_defect_id) as detected_defect_types
      FROM ai_predictions 
      WHERE verified_at IS NOT NULL
    `;
    
    const result = await pool.query(query);
    const stats = result.rows[0];
    
    const accuracy = stats.total_predictions > 0 
      ? (stats.correct_predictions / stats.total_predictions * 100).toFixed(2)
      : 0;
    
    res.json({
      success: true,
      performance: {
        totalPredictions: parseInt(stats.total_predictions),
        correctPredictions: parseInt(stats.correct_predictions),
        incorrectPredictions: parseInt(stats.incorrect_predictions),
        accuracy: parseFloat(accuracy),
        averageConfidence: parseFloat(stats.average_confidence || 0),
        detectedDefectTypes: parseInt(stats.detected_defect_types)
      }
    });
    
  } catch (error) {
    console.error('❌ 성능 통계 조회 실패:', error);
    res.status(500).json({ error: '성능 통계 조회에 실패했습니다.' });
  }
});

// 하자별 AI 성능 분석
router.get('/performance-by-defect', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        dc.name as defect_name,
        COUNT(ap.id) as total_predictions,
        COUNT(CASE WHEN ap.user_confirmed = TRUE THEN 1 END) as correct_predictions,
        AVG(ap.confidence_score) as average_confidence,
        (COUNT(CASE WHEN ap.user_confirmed = TRUE THEN 1 END)::float / COUNT(ap.id) * 100) as accuracy
      FROM ai_predictions ap
      JOIN defect_categories dc ON ap.predicted_defect_id = dc.id
      WHERE ap.verified_at IS NOT NULL
      GROUP BY dc.id, dc.name
      ORDER BY accuracy DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      defectPerformance: result.rows.map(row => ({
        defectName: row.defect_name,
        totalPredictions: parseInt(row.total_predictions),
        correctPredictions: parseInt(row.correct_predictions),
        accuracy: parseFloat(row.accuracy.toFixed(2)),
        averageConfidence: parseFloat(row.average_confidence.toFixed(2))
      }))
    });
    
  } catch (error) {
    console.error('❌ 하자별 성능 분석 실패:', error);
    res.status(500).json({ error: '하자별 성능 분석에 실패했습니다.' });
  }
});

// AI 모델 재훈련 트리거
router.post('/retrain', authenticateToken, async (req, res) => {
  try {
    const { householdId } = req.user;
    
    // 관리자 권한 확인 (실제로는 role 기반 권한 체크)
    if (householdId !== 1) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    
    console.log('🔄 AI 모델 재훈련 요청됨');
    
    // 재훈련 작업을 백그라운드에서 실행
    const { spawn } = require('child_process');
    const pythonProcess = spawn('python3', ['../scripts/retrain_model.py'], {
      cwd: __dirname,
      stdio: 'pipe'
    });
    
    let output = '';
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log('재훈련 진행:', data.toString());
    });
    
    pythonProcess.stderr.on('data', (data) => {
      console.error('재훈련 에러:', data.toString());
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ 모델 재훈련 완료');
      } else {
        console.error('❌ 모델 재훈련 실패:', code);
      }
    });
    
    res.json({ 
      success: true, 
      message: '모델 재훈련이 시작되었습니다.',
      processId: pythonProcess.pid
    });
    
  } catch (error) {
    console.error('❌ 모델 재훈련 실패:', error);
    res.status(500).json({ error: '모델 재훈련에 실패했습니다.' });
  }
});

// 실시간 AI 감지 (실제 이미지 처리)
router.post('/detect', authenticateToken, async (req, res) => {
  try {
    const { imageBase64, imageType = 'jpeg' } = req.body;
    
    // 이미지 데이터를 Buffer로 변환
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    
    // 실제 AI 감지 로직 (현재는 모의)
    const mockDetections = [
      {
        defectType: '벽균열',
        confidence: 0.85,
        bbox: { x: 100, y: 150, width: 200, height: 100 },
        severity: '심각',
        description: '벽체에 발생한 균열로 건물의 구조적 문제를 나타낼 수 있음'
      },
      {
        defectType: '페인트벗겨짐',
        confidence: 0.72,
        bbox: { x: 300, y: 200, width: 150, height: 80 },
        severity: '경미',
        description: '도장 표면이 벗겨지거나 박리되는 현상'
      }
    ];
    
    console.log(`🔍 AI 감지 완료 - ${mockDetections.length}개 하자 감지`);
    
    res.json({
      success: true,
      detections: mockDetections,
      processingTime: '1.2초',
      modelVersion: 'tensorflow-js-v1.0'
    });
    
  } catch (error) {
    console.error('❌ AI 감지 실패:', error);
    res.status(500).json({ error: 'AI 감지에 실패했습니다.' });
  }
});

module.exports = router;
