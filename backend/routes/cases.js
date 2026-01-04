// Cases routes
const express = require('express');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get cases for current household (하자가 있는 케이스만 조회)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    const { householdId } = req.user;

    // Get cases from database (하자가 있는 케이스만 조회)
    const query = `
      SELECT c.id, c.type, c.created_at,
             json_agg(
               json_build_object(
                 'id', d.id,
                 'location', d.location,
                 'trade', d.trade,
                 'content', d.content,
                 'memo', d.memo,
                 'created_at', d.created_at
               )
             ) FILTER (WHERE d.id IS NOT NULL) as defects
      FROM case_header c
      INNER JOIN defect d ON c.id = d.case_id
      WHERE c.household_id = $1
      ${type ? `AND c.type = $2` : ''}
      GROUP BY c.id, c.type, c.created_at
      HAVING COUNT(d.id) > 0
      ORDER BY c.created_at DESC
    `;

    const params = [householdId];
    if (type) {
      params.push(type);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error('Get cases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new case
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type } = req.body;
    const { householdId } = req.user;

    if (!type || !['하자접수', '추가접수', '장비점검', '종합점검'].includes(type)) {
      return res.status(400).json({ error: 'Invalid case type' });
    }

    // '하자접수' 타입의 경우, 기존 케이스가 있는지 확인
    if (type === '하자접수') {
      const existingCaseQuery = `
        SELECT id, type, created_at
        FROM case_header
        WHERE household_id = $1 AND type = '하자접수'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const existingResult = await pool.query(existingCaseQuery, [householdId]);
      
      if (existingResult.rows.length > 0) {
        // 기존 케이스가 있으면 반환
        console.log('✅ 기존 하자접수 케이스 반환:', existingResult.rows[0].id);
        return res.status(200).json(existingResult.rows[0]);
      }
    }

    // 기존 케이스가 없으면 새로 생성
    const year = new Date().getFullYear().toString().slice(-2);
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits
    const caseId = `CASE-${year}${timestamp}`;

    // Insert new case into database
    const insertQuery = `
      INSERT INTO case_header (id, household_id, type, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, household_id, type, created_at
    `;

    const result = await pool.query(insertQuery, [caseId, householdId, type]);
    console.log('✅ 새 케이스 생성:', result.rows[0].id);
    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Create case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
