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

    // Complex 찾기 또는 생성
    let complexResult = await pool.query(
      'SELECT id FROM complex WHERE name = $1',
      [complex]
    );
    
    let complexId;
    if (complexResult.rows.length === 0) {
      // 신규 Complex 생성
      complexResult = await pool.query(
        'INSERT INTO complex (name, address) VALUES ($1, $2) RETURNING id',
        [complex, '자동 등록']
      );
      complexId = complexResult.rows[0].id;
      console.log('✅ 신규 단지 생성:', complex);
    } else {
      complexId = complexResult.rows[0].id;
    }
    
    // Household 찾기 (단지+동+호만으로 조회)
    let householdResult = await pool.query(
      `SELECT id, resident_name, phone FROM household 
       WHERE complex_id = $1 AND dong = $2 AND ho = $3`,
      [complexId, dong, ho]
    );
    
    let householdId;
    
    if (householdResult.rows.length === 0) {
      // 신규 세대 등록
      console.log('🆕 신규 세대 등록:', { complex, dong, ho, name });
      
      const newHouseholdResult = await pool.query(
        `INSERT INTO household (complex_id, dong, ho, resident_name, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [complexId, dong, ho, name, phone]
      );
      
      householdId = newHouseholdResult.rows[0].id;
      console.log('✅ 신규 세대 등록 완료:', householdId);
      
    } else {
      // 기존 세대 - 정보 업데이트
      householdId = householdResult.rows[0].id;
      const existing = householdResult.rows[0];
      
      // 이름이나 전화번호가 다르면 업데이트
      if (existing.resident_name !== name || existing.phone !== phone) {
        console.log('🔄 세대 정보 업데이트:', { name, phone });
        await pool.query(
          `UPDATE household SET resident_name = $1, phone = $2 WHERE id = $3`,
          [name, phone, householdId]
        );
      }
      
      console.log('👤 기존 세대 로그인:', householdId);
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
