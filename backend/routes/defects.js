// Defects routes
const express = require('express');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create defect item
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { case_id, location, trade, content, memo, photo_near_key, photo_far_key } = req.body;
    const { householdId } = req.user;

    // Validate required fields
    if (!case_id || !location || !trade || !content) {
      return res.status(400).json({ error: 'case_id, location, trade, and content are required' });
    }

    // Generate defect ID with timestamp to ensure uniqueness
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const defectId = `DEF-${timestamp}-${random}`;

    // Insert defect into database
    const insertQuery = `
      INSERT INTO defect (id, case_id, location, trade, content, memo, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, case_id, location, trade, content, memo, created_at
    `;

    const result = await pool.query(insertQuery, [defectId, case_id, location, trade, content, memo || '']);
    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Create defect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
