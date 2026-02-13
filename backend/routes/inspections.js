// 장비점검 관련 API 라우트
const express = require('express');
const pool = require('../database');
const { authenticateToken, requireEquipmentAccess, requireInspectorAccess } = require('../middleware/auth');
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
    right_mm: { min: -50, max: 50, decimal: 1 },
    point_mm: { min: -10, max: 10, decimal: 1 },
    reference_mm: { min: 1, max: 999, decimal: 1 }
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
router.post('/thermal', authenticateToken, requireInspectorAccess, async (req, res) => {
  try {
    const { caseId, defectId, location, trade, note, result = 'normal' } = req.body;
    
    if (!caseId || !location) {
      return res.status(400).json({ error: '케이스 ID와 위치는 필수입니다' });
    }
    
    const itemId = uuidv4();
    
    // 점검 항목 생성 (defect_id 포함)
    const query = `
      INSERT INTO inspection_item (id, case_id, defect_id, type, location, trade, note, result)
      VALUES ($1, $2, $3, 'thermal', $4, $5, $6, $7)
      RETURNING *
    `;
    
    const queryResult = await pool.query(query, [itemId, caseId, defectId || null, location, trade, note, result]);
    
    res.status(201).json({
      success: true,
      item: queryResult.rows[0],
      message: '열화상 점검 항목이 생성되었습니다'
    });
    
  } catch (error) {
    console.error('열화상 점검 항목 생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 육안점검 항목 생성 (점검원 점검의견) — defectId 선택(세대별 점검 시 생략)
router.post('/visual', authenticateToken, requireInspectorAccess, async (req, res) => {
  try {
    const { caseId, defectId, location, trade, note, result = 'normal' } = req.body;

    if (!caseId) {
      return res.status(400).json({ error: '케이스 ID는 필수입니다' });
    }

    const itemId = uuidv4();
    const loc = (location && String(location).trim()) || '육안';

    const query = `
      INSERT INTO inspection_item (id, case_id, defect_id, type, location, trade, note, result)
      VALUES ($1, $2, $3, 'visual', $4, $5, $6, $7)
      RETURNING *
    `;
    const queryResult = await pool.query(query, [itemId, caseId, defectId || null, loc, trade || null, note || null, result]);

    res.status(201).json({
      success: true,
      item: queryResult.rows[0],
      message: '육안점검 항목이 저장되었습니다'
    });
  } catch (error) {
    console.error('육안점검 항목 생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 열화상 사진 업로드
router.post('/thermal/:itemId/photos', authenticateToken, requireInspectorAccess, async (req, res) => {
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
router.post('/air', authenticateToken, requireInspectorAccess, async (req, res) => {
  try {
    const { caseId, defectId, location, trade, process_type, tvoc, hcho, co2, note, result = 'normal' } = req.body;
    
    if (!caseId || !location) {
      return res.status(400).json({ error: '케이스 ID와 위치는 필수입니다' });
    }
    
    if (process_type != null && process_type !== '' && !['flush_out', 'bake_out'].includes(process_type)) {
      return res.status(400).json({ error: '공정 유형은 flush_out 또는 bake_out 이어야 합니다' });
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
      
      // 점검 항목 생성 (defect_id 포함)
      const itemQuery = `
        INSERT INTO inspection_item (id, case_id, defect_id, type, location, trade, note, result)
        VALUES ($1, $2, $3, 'air', $4, $5, $6, $7)
        RETURNING *
      `;
      
      const itemResult = await client.query(itemQuery, [itemId, caseId, defectId || null, location, trade, note, result]);
      
      // 공기질 측정값 저장 (process_type: Flush-out / Bake-out)
      const measureQuery = `
        INSERT INTO air_measure (item_id, process_type, tvoc, hcho, co2)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const measureResult = await client.query(measureQuery, [
        itemId,
        process_type && ['flush_out', 'bake_out'].includes(process_type) ? process_type : null,
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
router.post('/radon', authenticateToken, requireInspectorAccess, async (req, res) => {
  try {
    const { caseId, defectId, location, trade, radon, unit_radon = 'Bq/m³', note, result = 'normal' } = req.body;
    
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
      
      // 점검 항목 생성 (defect_id 포함)
      const itemQuery = `
        INSERT INTO inspection_item (id, case_id, defect_id, type, location, trade, note, result)
        VALUES ($1, $2, $3, 'radon', $4, $5, $6, $7)
        RETURNING *
      `;
      
      const itemResult = await client.query(itemQuery, [itemId, caseId, defectId || null, location, trade, note, result]);
      
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

// 레벨기 측정 등록 (4 point ±10mm, 기준 150mm)
router.post('/level', authenticateToken, requireInspectorAccess, async (req, res) => {
  try {
    const {
      caseId, defectId, location, trade, note, result = 'normal',
      left_mm, right_mm,
      point1_left_mm, point1_right_mm, point2_left_mm, point2_right_mm,
      point3_left_mm, point3_right_mm, point4_left_mm, point4_right_mm,
      reference_mm
    } = req.body;
    
    if (!caseId || !location) {
      return res.status(400).json({ error: '케이스 ID와 위치는 필수입니다' });
    }
    
    const pointRules = ValidationRules.level.point_mm;
    const refRules = ValidationRules.level.reference_mm;
    const points = [
      [point1_left_mm, point1_right_mm],
      [point2_left_mm, point2_right_mm],
      [point3_left_mm, point3_right_mm],
      [point4_left_mm, point4_right_mm]
    ];
    
    const has4Point = points.some(([l, r]) => l != null && l !== '' || r != null && r !== '');
    const hasLegacy = left_mm != null && left_mm !== '' && right_mm != null && right_mm !== '';
    
    if (!has4Point && !hasLegacy) {
      return res.status(400).json({ error: '4개 측정점(좌/우) 또는 기존 좌/우 수치를 입력해주세요' });
    }
    
    for (let i = 0; i < points.length; i++) {
      const [l, r] = points[i];
      if (l != null && l !== '' && !validateInput(l, pointRules)) {
        return res.status(400).json({ error: `${i + 1}번 좌측 수치가 유효하지 않습니다 (±10mm, 소수점 1자리)` });
      }
      if (r != null && r !== '' && !validateInput(r, pointRules)) {
        return res.status(400).json({ error: `${i + 1}번 우측 수치가 유효하지 않습니다 (±10mm, 소수점 1자리)` });
      }
    }
    
    if (reference_mm != null && reference_mm !== '' && !validateInput(reference_mm, refRules)) {
      return res.status(400).json({ error: '기준(mm) 값이 유효하지 않습니다 (1~999, 소수점 1자리)' });
    }
    
    if (hasLegacy && (left_mm == null || right_mm == null || !validateInput(left_mm, ValidationRules.level.left_mm) || !validateInput(right_mm, ValidationRules.level.right_mm))) {
      return res.status(400).json({ error: '기존 좌/우 수치는 -50~+50, 소수점 1자리여야 합니다' });
    }
    
    const itemId = uuidv4();
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const itemQuery = `
        INSERT INTO inspection_item (id, case_id, defect_id, type, location, trade, note, result)
        VALUES ($1, $2, $3, 'level', $4, $5, $6, $7)
        RETURNING *
      `;
      
      const itemResult = await client.query(itemQuery, [itemId, caseId, defectId || null, location, trade, note, result]);
      
      const parseOpt = (v) => (v != null && v !== '' ? parseFloat(v) : null);
      
      const measureQuery = `
        INSERT INTO level_measure (
          item_id, left_mm, right_mm,
          point1_left_mm, point1_right_mm, point2_left_mm, point2_right_mm,
          point3_left_mm, point3_right_mm, point4_left_mm, point4_right_mm,
          reference_mm
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const measureResult = await client.query(measureQuery, [
        itemId,
        hasLegacy ? parseFloat(left_mm) : (parseOpt(point1_left_mm) ?? null),
        hasLegacy ? parseFloat(right_mm) : (parseOpt(point1_right_mm) ?? null),
        parseOpt(point1_left_mm), parseOpt(point1_right_mm),
        parseOpt(point2_left_mm), parseOpt(point2_right_mm),
        parseOpt(point3_left_mm), parseOpt(point3_right_mm),
        parseOpt(point4_left_mm), parseOpt(point4_right_mm),
        reference_mm != null && reference_mm !== '' ? parseFloat(reference_mm) : 150
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

// 세대(household)용 케이스 ID 조회 또는 생성 (점검결과 입력 시 케이스 없을 수 있음)
router.get('/case-for-household/:householdId', authenticateToken, requireInspectorAccess, async (req, res) => {
  try {
    const { householdId } = req.params;
    const hid = parseInt(householdId, 10);
    if (isNaN(hid)) {
      return res.status(400).json({ error: '유효한 세대 ID가 필요합니다' });
    }
    let row = (await pool.query(
      'SELECT id FROM case_header WHERE household_id = $1 ORDER BY created_at DESC LIMIT 1',
      [hid]
    )).rows[0];
    if (!row) {
      const caseId = `CASE-${Date.now().toString().slice(-9)}`;
      await pool.query(
        'INSERT INTO case_header (id, household_id, type, created_at) VALUES ($1, $2, $3, NOW())',
        [caseId, hid, '종합점검']
      );
      row = { id: caseId };
    }
    res.json({ success: true, caseId: row.id });
  } catch (error) {
    console.error('케이스 조회/생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 세대(household)별 점검 항목 조회 — 타입별 N건 (하자 무관)
router.get('/by-household/:householdId', authenticateToken, async (req, res) => {
  try {
    const { householdId } = req.params;
    const hid = parseInt(householdId, 10);
    if (isNaN(hid)) {
      return res.status(400).json({ error: '유효한 세대 ID가 필요합니다' });
    }

    const query = `
      SELECT 
        ii.*,
        am.process_type, am.tvoc, am.hcho, am.co2, am.unit_tvoc, am.unit_hcho,
        rm.radon, rm.unit_radon,
        lm.left_mm, lm.right_mm,
        lm.point1_left_mm, lm.point1_right_mm, lm.point2_left_mm, lm.point2_right_mm,
        lm.point3_left_mm, lm.point3_right_mm, lm.point4_left_mm, lm.point4_right_mm,
        lm.reference_mm,
        (SELECT json_agg(json_build_object('file_url', tp.file_url, 'caption', tp.caption, 'shot_at', tp.shot_at))
         FROM thermal_photo tp WHERE tp.item_id = ii.id) as thermal_photos
      FROM inspection_item ii
      LEFT JOIN air_measure am ON ii.id = am.item_id
      LEFT JOIN radon_measure rm ON ii.id = rm.item_id
      LEFT JOIN level_measure lm ON ii.id = lm.item_id
      WHERE ii.case_id IN (SELECT id FROM case_header WHERE household_id = $1)
      ORDER BY ii.created_at ASC
    `;
    const result = await pool.query(query, [hid]);

    const grouped = { visual: [], thermal: [], air: [], radon: [], level: [] };
    (result.rows || []).forEach((row) => {
      const type = row.type || 'thermal';
      if (!grouped[type]) grouped[type] = [];
      const item = { ...row };
      if (row.thermal_photos && Array.isArray(row.thermal_photos)) {
        item.photos = row.thermal_photos;
      } else if (row.thermal_photos) {
        item.photos = [row.thermal_photos];
      } else {
        item.photos = [];
      }
      delete item.thermal_photos;
      grouped[type].push(item);
    });

    res.json({
      success: true,
      householdId: hid,
      inspections: grouped,
      total: result.rows.length
    });
  } catch (error) {
    console.error('세대별 점검 항목 조회 오류:', error);
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
        am.process_type, am.tvoc, am.hcho, am.co2, am.unit_tvoc, am.unit_hcho,
        rm.radon, rm.unit_radon,
        lm.left_mm, lm.right_mm,
        lm.point1_left_mm, lm.point1_right_mm, lm.point2_left_mm, lm.point2_right_mm,
        lm.point3_left_mm, lm.point3_right_mm, lm.point4_left_mm, lm.point4_right_mm,
        lm.reference_mm,
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

// 하자별 점검 항목 조회
router.get('/defects/:defectId', authenticateToken, async (req, res) => {
  try {
    const { defectId } = req.params;
    
    const query = `
      SELECT 
        ii.*,
        am.process_type, am.tvoc, am.hcho, am.co2, am.unit_tvoc, am.unit_hcho,
        rm.radon, rm.unit_radon,
        lm.left_mm, lm.right_mm,
        lm.point1_left_mm, lm.point1_right_mm, lm.point2_left_mm, lm.point2_right_mm,
        lm.point3_left_mm, lm.point3_right_mm, lm.point4_left_mm, lm.point4_right_mm,
        lm.reference_mm,
        tp.file_url as thermal_photo_url, tp.caption as thermal_caption
      FROM inspection_item ii
      LEFT JOIN air_measure am ON ii.id = am.item_id
      LEFT JOIN radon_measure rm ON ii.id = rm.item_id
      LEFT JOIN level_measure lm ON ii.id = lm.item_id
      LEFT JOIN thermal_photo tp ON ii.id = tp.item_id
      WHERE ii.defect_id = $1
      ORDER BY ii.created_at DESC
    `;
    
    const result = await pool.query(query, [defectId]);
    
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
      defectId: defectId,
      inspections: grouped,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('하자별 점검 항목 조회 오류:', error);
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
