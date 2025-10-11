// Defects routes
const express = require('express');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get defects by case_id
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { case_id } = req.query;
    
    if (!case_id) {
      return res.status(400).json({ error: 'case_id is required' });
    }
    
    const query = `
      SELECT d.id, d.case_id, d.location, d.trade, d.content, d.memo, 
             d.created_at, d.updated_at
      FROM defect d
      WHERE d.case_id = $1
      ORDER BY d.created_at DESC
    `;
    
    const result = await pool.query(query, [case_id]);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Get defects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

// Update defect item
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { location, trade, content, memo, photo_near_key, photo_far_key } = req.body;
    const { householdId } = req.user;

    // Validate required fields
    if (!location || !trade || !content) {
      return res.status(400).json({ error: 'location, trade, and content are required' });
    }

    // Update defect in database
    const updateQuery = `
      UPDATE defect 
      SET location = $1, trade = $2, content = $3, memo = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING id, case_id, location, trade, content, memo, created_at, updated_at
    `;

    const result = await pool.query(updateQuery, [location, trade, content, memo || '', id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Defect not found' });
    }
    
    res.json(result.rows[0]);

  } catch (error) {
    console.error('Update defect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get defect by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT d.id, d.case_id, d.location, d.trade, d.content, d.memo, 
             d.created_at, d.updated_at
      FROM defect d
      WHERE d.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Defect not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Get defect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
