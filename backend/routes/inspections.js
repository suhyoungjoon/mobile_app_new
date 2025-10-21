// 장비점검 관련 API 라우트
const express = require('express');
const pool = require('../database');
const { authenticateToken, requireEquipmentAccess } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// 입력 검증 규칙
const ValidationRules = {
  air: {
    tvoc: { min: 0, max: 20, decimal: 2 },
    hcho: { min: 0, max: 20, decimal: 2 },
    co2: { min: 0, max: 10000, decimal: 0 }
  },
  radon: {
    radon: { min: 0, max: 5000, decimal: 2 }
  },
  level: {
    left_mm: { min: -50, max: 50, decimal: 1 },
    right_mm: { min: -50, max: 50, decimal: 1 }
  }
};

// 입력값 검증 함수
function validateInput(value, rules) {
  if (value === null || value === undefined) return true; // 선택적 필드는 null 허용
  
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  
  if (num < rules.min || num > rules.max) return false;
  
  // 소수점 자리수 검증
  const decimalPlaces = (value.toString().split('.')[1] || '').length;
  if (decimalPlaces > rules.decimal) return false;
  
  return true;
}

// 열화상 점검 항목 생성
router.post('/thermal', authenticateToken, requireEquipmentAccess, async (req, res) => {
  try {
    const { caseId, location, trade, note, result = 'normal' } = req.body;
    
    if (!caseId || !location) {
      return res.status(400).json({ error: '케이스 ID와 위치는 필수입니다' });
    }
    
    const itemId = uuidv4();
    
    // 점검 항목 생성
    const query = `
      INSERT INTO inspection_item (id, case_id, type, location, trade, note, result)
      VALUES ($1, $2, 'thermal', $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [itemId, caseId, location, trade, note, result]);
    
    res.status(201).json({
      success: true,
      item: result.rows[0],
      message: '열화상 점검 항목이 생성되었습니다'
    });
    
  } catch (error) {
    console.error('열화상 점검 항목 생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 열화상 사진 업로드
router.post('/thermal/:itemId/photos', authenticateToken, requireEquipmentAccess, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { file_url, caption } = req.body;
    
    if (!file_url) {
      return res.status(400).json({ error: '파일 URL은 필수입니다' });
    }
    
    const photoId = uuidv4();
    
    const query = `
      INSERT INTO thermal_photo (id, item_id, file_url, caption)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await pool.query(query, [photoId, itemId, file_url, caption]);
    
    res.status(201).json({
      success: true,
      photo: result.rows[0],
      message: '열화상 사진이 업로드되었습니다'
    });
    
  } catch (error) {
    console.error('열화상 사진 업로드 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 공기질 측정 등록
router.post('/air', authenticateToken, async (req, res) => {
  try {
    const { caseId, location, trade, tvoc, hcho, co2, note, result = 'normal' } = req.body;
    
    if (!caseId || !location) {
      return res.status(400).json({ error: '케이스 ID와 위치는 필수입니다' });
    }
    
    // 입력값 검증
    if (tvoc !== null && !validateInput(tvoc, ValidationRules.air.tvoc)) {
      return res.status(400).json({ error: 'TVOC 값이 유효하지 않습니다 (0-20, 소수점 2자리)' });
    }
    
    if (hcho !== null && !validateInput(hcho, ValidationRules.air.hcho)) {
      return res.status(400).json({ error: 'HCHO 값이 유효하지 않습니다 (0-20, 소수점 2자리)' });
    }
    
    if (co2 !== null && !validateInput(co2, ValidationRules.air.co2)) {
      return res.status(400).json({ error: 'CO2 값이 유효하지 않습니다 (0-10000)' });
    }
    
    const itemId = uuidv4();
    
    // 트랜잭션 시작
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 점검 항목 생성
      const itemQuery = `
        INSERT INTO inspection_item (id, case_id, type, location, trade, note, result)
        VALUES ($1, $2, 'air', $3, $4, $5, $6)
        RETURNING *
      `;
      
      const itemResult = await client.query(itemQuery, [itemId, caseId, location, trade, note, result]);
      
      // 공기질 측정값 저장
      const measureQuery = `
        INSERT INTO air_measure (item_id, tvoc, hcho, co2)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const measureResult = await client.query(measureQuery, [
        itemId, 
        tvoc ? parseFloat(tvoc) : null,
        hcho ? parseFloat(hcho) : null,
        co2 ? parseFloat(co2) : null
      ]);
      
      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        item: itemResult.rows[0],
        measure: measureResult.rows[0],
        message: '공기질 측정이 등록되었습니다'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('공기질 측정 등록 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 라돈 측정 등록
router.post('/radon', authenticateToken, async (req, res) => {
  try {
    const { caseId, location, trade, radon, unit_radon = 'Bq/m³', note, result = 'normal' } = req.body;
    
    if (!caseId || !location) {
      return res.status(400).json({ error: '케이스 ID와 위치는 필수입니다' });
    }
    
    if (!radon) {
      return res.status(400).json({ error: '라돈 측정값은 필수입니다' });
    }
    
    // 입력값 검증
    if (!validateInput(radon, ValidationRules.radon.radon)) {
      return res.status(400).json({ error: '라돈 값이 유효하지 않습니다 (0-5000, 소수점 2자리)' });
    }
    
    if (!['Bq/m³', 'pCi/L'].includes(unit_radon)) {
      return res.status(400).json({ error: '라돈 단위는 Bq/m³ 또는 pCi/L이어야 합니다' });
    }
    
    const itemId = uuidv4();
    
    // 트랜잭션 시작
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 점검 항목 생성
      const itemQuery = `
        INSERT INTO inspection_item (id, case_id, type, location, trade, note, result)
        VALUES ($1, $2, 'radon', $3, $4, $5, $6)
        RETURNING *
      `;
      
      const itemResult = await client.query(itemQuery, [itemId, caseId, location, trade, note, result]);
      
      // 라돈 측정값 저장
      const measureQuery = `
        INSERT INTO radon_measure (item_id, radon, unit_radon)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      const measureResult = await client.query(measureQuery, [itemId, parseFloat(radon), unit_radon]);
      
      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        item: itemResult.rows[0],
        measure: measureResult.rows[0],
        message: '라돈 측정이 등록되었습니다'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('라돈 측정 등록 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 레벨기 측정 등록
router.post('/level', authenticateToken, async (req, res) => {
  try {
    const { caseId, location, trade, left_mm, right_mm, note, result = 'normal' } = req.body;
    
    if (!caseId || !location) {
      return res.status(400).json({ error: '케이스 ID와 위치는 필수입니다' });
    }
    
    if (left_mm === null || left_mm === undefined || right_mm === null || right_mm === undefined) {
      return res.status(400).json({ error: '좌측과 우측 수치는 모두 필수입니다' });
    }
    
    // 입력값 검증
    if (!validateInput(left_mm, ValidationRules.level.left_mm)) {
      return res.status(400).json({ error: '좌측 수치가 유효하지 않습니다 (-50~+50, 소수점 1자리)' });
    }
    
    if (!validateInput(right_mm, ValidationRules.level.right_mm)) {
      return res.status(400).json({ error: '우측 수치가 유효하지 않습니다 (-50~+50, 소수점 1자리)' });
    }
    
    const itemId = uuidv4();
    
    // 트랜잭션 시작
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 점검 항목 생성
      const itemQuery = `
        INSERT INTO inspection_item (id, case_id, type, location, trade, note, result)
        VALUES ($1, $2, 'level', $3, $4, $5, $6)
        RETURNING *
      `;
      
      const itemResult = await client.query(itemQuery, [itemId, caseId, location, trade, note, result]);
      
      // 레벨기 측정값 저장
      const measureQuery = `
        INSERT INTO level_measure (item_id, left_mm, right_mm)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      const measureResult = await client.query(measureQuery, [
        itemId, 
        parseFloat(left_mm), 
        parseFloat(right_mm)
      ]);
      
      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        item: itemResult.rows[0],
        measure: measureResult.rows[0],
        message: '레벨기 측정이 등록되었습니다'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('레벨기 측정 등록 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 케이스별 점검 항목 조회
router.get('/:caseId', authenticateToken, async (req, res) => {
  try {
    const { caseId } = req.params;
    
    const query = `
      SELECT 
        ii.*,
        am.tvoc, am.hcho, am.co2, am.unit_tvoc, am.unit_hcho,
        rm.radon, rm.unit_radon,
        lm.left_mm, lm.right_mm,
        tp.file_url as thermal_photo_url, tp.caption as thermal_caption
      FROM inspection_item ii
      LEFT JOIN air_measure am ON ii.id = am.item_id
      LEFT JOIN radon_measure rm ON ii.id = rm.item_id
      LEFT JOIN level_measure lm ON ii.id = lm.item_id
      LEFT JOIN thermal_photo tp ON ii.id = tp.item_id
      WHERE ii.case_id = $1
      ORDER BY ii.created_at DESC
    `;
    
    const result = await pool.query(query, [caseId]);
    
    // 결과를 타입별로 그룹화
    const grouped = result.rows.reduce((acc, row) => {
      if (!acc[row.type]) {
        acc[row.type] = [];
      }
      acc[row.type].push(row);
      return acc;
    }, {});
    
    res.json({
      success: true,
      caseId: caseId,
      inspections: grouped,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('점검 항목 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 점검 항목 삭제
router.delete('/:itemId', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    // 트랜잭션 시작
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 관련 측정값 삭제
      await client.query('DELETE FROM air_measure WHERE item_id = $1', [itemId]);
      await client.query('DELETE FROM radon_measure WHERE item_id = $1', [itemId]);
      await client.query('DELETE FROM level_measure WHERE item_id = $1', [itemId]);
      await client.query('DELETE FROM thermal_photo WHERE item_id = $1', [itemId]);
      
      // 점검 항목 삭제
      const result = await client.query('DELETE FROM inspection_item WHERE id = $1 RETURNING *', [itemId]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: '점검 항목을 찾을 수 없습니다' });
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: '점검 항목이 삭제되었습니다'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('점검 항목 삭제 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

module.exports = router;
