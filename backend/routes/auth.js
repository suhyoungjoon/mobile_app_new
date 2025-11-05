// Authentication routes
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../database');
const config = require('../config');
const { safeLog } = require('../utils/logger');
const { encrypt, decrypt } = require('../utils/encryption');

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
      safeLog('info', '신규 단지 생성', { complex });
    } else {
      complexId = complexResult.rows[0].id;
    }
    
    // Household 찾기 (단지+동+호만으로 조회) - 암호화된 필드도 조회
    let householdResult = await pool.query(
      `SELECT id, resident_name, phone, resident_name_encrypted, phone_encrypted, user_type 
       FROM household 
       WHERE complex_id = $1 AND dong = $2 AND ho = $3`,
      [complexId, dong, ho]
    );
    
    let householdId;
    
    if (householdResult.rows.length === 0) {
      // 신규 세대 등록 - 암호화하여 저장
      safeLog('info', '신규 세대 등록', { complex, dong, ho, name });
      
      const nameEncrypted = encrypt(name);
      const phoneEncrypted = encrypt(phone);
      
      const newHouseholdResult = await pool.query(
        `INSERT INTO household (complex_id, dong, ho, resident_name, phone, resident_name_encrypted, phone_encrypted)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [complexId, dong, ho, name, phone, nameEncrypted, phoneEncrypted]
      );
      
      householdId = newHouseholdResult.rows[0].id;
      safeLog('info', '신규 세대 등록 완료', { householdId });
      
    } else {
      // 기존 세대 - 정보 업데이트
      householdId = householdResult.rows[0].id;
      const existing = householdResult.rows[0];
      
      // 암호화된 필드가 있으면 복호화, 없으면 평문 사용 (호환성)
      const existingName = existing.resident_name_encrypted 
        ? decrypt(existing.resident_name_encrypted) 
        : existing.resident_name;
      const existingPhone = existing.phone_encrypted 
        ? decrypt(existing.phone_encrypted) 
        : existing.phone;
      
      // 이름이나 전화번호가 다르면 업데이트 (암호화하여 저장)
      if (existingName !== name || existingPhone !== phone) {
        safeLog('info', '세대 정보 업데이트', { name, phone });
        const nameEncrypted = encrypt(name);
        const phoneEncrypted = encrypt(phone);
        await pool.query(
          `UPDATE household 
           SET resident_name = $1, phone = $2, 
               resident_name_encrypted = $4, phone_encrypted = $5 
           WHERE id = $3`,
          [name, phone, householdId, nameEncrypted, phoneEncrypted]
        );
      }
      
      safeLog('info', '기존 세대 로그인', { householdId });
    }

    // Get user type for token
    let userType = 'resident'; // Default for new households
    if (householdResult.rows.length > 0) {
      userType = householdResult.rows[0].user_type || 'resident';
    }

    // Generate JWT token (최소 정보만 포함 - 개인정보 제거)
    const token = jwt.sign(
      { 
        householdId,
        user_type: userType,
        purpose: 'precheck'
        // ✅ 개인정보(complex, dong, ho, name, phone) 제거
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3); // 3 days

    res.json({
      token,
      user: {
        householdId,
        complex,
        dong,
        ho,
        name,
        phone,
        user_type: userType
      },
      purpose: 'precheck',
      expires_at: expiresAt.toISOString()
    });

  } catch (error) {
    safeLog('error', 'Auth error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
