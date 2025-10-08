// Authentication routes
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../database');
const config = require('../config');

const router = express.Router();

// Create session by household info
router.post('/session', async (req, res) => {
  try {
    const { complex, dong, ho, name, phone } = req.body;

    // Validate required fields
    if (!complex || !dong || !ho || !name || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Find household in database
    const householdQuery = `
      SELECT h.id, h.complex_id, c.name as complex_name
      FROM household h
      JOIN complex c ON h.complex_id = c.id
      WHERE c.name = $1 AND h.dong = $2 AND h.ho = $3 
      AND h.resident_name = $4 AND h.phone = $5
    `;
    
    const householdResult = await pool.query(householdQuery, [complex, dong, ho, name, phone]);
    
    if (householdResult.rows.length === 0) {
      return res.status(404).json({ error: 'Household not found' });
    }
    
    const householdId = householdResult.rows[0].id;

    // Generate JWT token
    const token = jwt.sign(
      { 
        householdId, 
        complex, 
        dong, 
        ho, 
        name, 
        phone,
        purpose: 'precheck' // Default purpose
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3); // 3 days

    res.json({
      token,
      purpose: 'precheck',
      expires_at: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
