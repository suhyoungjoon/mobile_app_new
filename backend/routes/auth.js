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
    
    let householdResult = await pool.query(householdQuery, [complex, dong, ho, name, phone]);
    
    let householdId;
    let complexId;
    
    if (householdResult.rows.length === 0) {
      // 신규 사용자 - 자동 등록
      console.log('🆕 신규 사용자 등록:', { complex, dong, ho, name });
      
      // Complex 찾기 또는 생성
      let complexResult = await pool.query(
        'SELECT id FROM complex WHERE name = $1',
        [complex]
      );
      
      if (complexResult.rows.length === 0) {
        // 신규 Complex 생성
        complexResult = await pool.query(
          'INSERT INTO complex (name, address) VALUES ($1, $2) RETURNING id',
          [complex, '자동 등록']
        );
        console.log('✅ 신규 단지 생성:', complex);
      }
      
      complexId = complexResult.rows[0].id;
      
      // Household 생성
      const newHouseholdResult = await pool.query(
        `INSERT INTO household (complex_id, dong, ho, resident_name, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [complexId, dong, ho, name, phone]
      );
      
      householdId = newHouseholdResult.rows[0].id;
      console.log('✅ 신규 세대 등록 완료:', householdId);
      
    } else {
      // 기존 사용자
      householdId = householdResult.rows[0].id;
      console.log('👤 기존 사용자 로그인:', householdId);
    }

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
