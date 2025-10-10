// Cases routes
const express = require('express');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get cases for current household
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    const { householdId } = req.user;

    // Get cases from database
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
      LEFT JOIN defect d ON c.id = d.case_id
      WHERE c.household_id = $1
      GROUP BY c.id, c.type, c.created_at
      ORDER BY c.created_at DESC
    `;

    const result = await pool.query(query, [householdId]);
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

    if (!type || !['하자접수', '추가접수'].includes(type)) {
      return res.status(400).json({ error: 'Invalid case type' });
    }

    // Generate case ID (CASE-YYXXX format)
    const year = new Date().getFullYear().toString().slice(-2);
    const countQuery = 'SELECT COUNT(*) as count FROM case_header';
    const countResult = await pool.query(countQuery);
    const count = parseInt(countResult.rows[0].count) + 1;
    const caseId = `CASE-${year}${count.toString().padStart(3, '0')}`;

    // Insert new case into database
    const insertQuery = `
      INSERT INTO case_header (id, household_id, type, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, household_id, type, created_at
    `;

    const result = await pool.query(insertQuery, [caseId, householdId, type]);
    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Create case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
