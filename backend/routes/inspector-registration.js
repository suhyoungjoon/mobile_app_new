// Inspector Registration Routes
const express = require('express');
const pool = require('../database');
const { authenticateToken, requireAdminAccess } = require('../middleware/auth');

const router = express.Router();

// 점검원 등록 신청
router.post('/register', async (req, res) => {
  try {
    const { 
      complex, 
      dong, 
      ho, 
      inspector_name, 
      phone, 
      company_name, 
      license_number, 
      email, 
      registration_reason 
    } = req.body;

    // 필수 필드 검증
    if (!complex || !dong || !ho || !inspector_name || !phone) {
      return res.status(400).json({ 
        error: '필수 필드를 모두 입력해주세요',
        required: ['complex', 'dong', 'ho', 'inspector_name', 'phone']
      });
    }

    // Complex 찾기 또는 생성
    let complexResult = await pool.query(
      'SELECT id FROM complex WHERE name = $1',
      [complex]
    );
    
    let complexId;
    if (complexResult.rows.length === 0) {
      complexResult = await pool.query(
        'INSERT INTO complex (name, address) VALUES ($1, $2) RETURNING id',
        [complex, '자동 등록']
      );
      complexId = complexResult.rows[0].id;
    } else {
      complexId = complexResult.rows[0].id;
    }

    // 중복 등록 확인 (같은 동/호에 이미 등록된 점검원이 있는지)
    const existingRegistration = await pool.query(
      `SELECT id, status FROM inspector_registration 
       WHERE complex_id = $1 AND dong = $2 AND ho = $3 
       AND inspector_name = $4 AND phone = $5`,
      [complexId, dong, ho, inspector_name, phone]
    );

    if (existingRegistration.rows.length > 0) {
      const existing = existingRegistration.rows[0];
      if (existing.status === 'pending') {
        return res.status(409).json({ 
          error: '이미 등록 신청이 진행 중입니다',
          registration_id: existing.id
        });
      } else if (existing.status === 'approved') {
        return res.status(409).json({ 
          error: '이미 승인된 점검원입니다',
          registration_id: existing.id
        });
      }
    }

    // 점검원 등록 신청 생성
    const registrationResult = await pool.query(
      `INSERT INTO inspector_registration 
       (complex_id, dong, ho, inspector_name, phone, company_name, license_number, email, registration_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, status, created_at`,
      [complexId, dong, ho, inspector_name, phone, company_name, license_number, email, registration_reason]
    );

    const registration = registrationResult.rows[0];

    console.log('🔍 점검원 등록 신청:', {
      id: registration.id,
      complex,
      dong,
      ho,
      inspector_name,
      status: registration.status
    });

    res.status(201).json({
      success: true,
      registration: {
        id: registration.id,
        complex,
        dong,
        ho,
        inspector_name,
        phone,
        company_name,
        license_number,
        email,
        registration_reason,
        status: registration.status,
        created_at: registration.created_at
      },
      message: '점검원 등록 신청이 접수되었습니다. 관리자 승인 후 장비점검 기능을 사용할 수 있습니다.'
    });

  } catch (error) {
    console.error('점검원 등록 오류:', error);
    res.status(500).json({ 
      error: '점검원 등록 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

// 점검원 등록 상태 조회 (본인 신청)
router.get('/status/:registrationId', async (req, res) => {
  try {
    const { registrationId } = req.params;

    const result = await pool.query(
      `SELECT 
        ir.*,
        c.name as complex_name
       FROM inspector_registration ir
       JOIN complex c ON ir.complex_id = c.id
       WHERE ir.id = $1`,
      [registrationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '등록 신청을 찾을 수 없습니다' });
    }

    const registration = result.rows[0];

    res.json({
      success: true,
      registration: {
        id: registration.id,
        complex: registration.complex_name,
        dong: registration.dong,
        ho: registration.ho,
        inspector_name: registration.inspector_name,
        phone: registration.phone,
        company_name: registration.company_name,
        license_number: registration.license_number,
        email: registration.email,
        registration_reason: registration.registration_reason,
        status: registration.status,
        approved_by: registration.approved_by,
        approved_at: registration.approved_at,
        rejection_reason: registration.rejection_reason,
        created_at: registration.created_at,
        updated_at: registration.updated_at
      }
    });

  } catch (error) {
    console.error('등록 상태 조회 오류:', error);
    res.status(500).json({ 
      error: '등록 상태 조회 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

// 관리자: 대기 중인 점검원 등록 목록 조회
router.get('/admin/pending', authenticateToken, requireAdminAccess, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        ir.*,
        c.name as complex_name,
        au.name as approved_by_name
       FROM inspector_registration ir
       JOIN complex c ON ir.complex_id = c.id
       LEFT JOIN admin_user au ON ir.approved_by = au.id
       ORDER BY ir.created_at DESC`
    );

    const registrations = result.rows.map(row => ({
      id: row.id,
      complex: row.complex_name,
      dong: row.dong,
      ho: row.ho,
      inspector_name: row.inspector_name,
      phone: row.phone,
      company_name: row.company_name,
      license_number: row.license_number,
      email: row.email,
      registration_reason: row.registration_reason,
      status: row.status,
      approved_by: row.approved_by_name,
      approved_at: row.approved_at,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    res.json({
      success: true,
      registrations,
      total: registrations.length,
      pending: registrations.filter(r => r.status === 'pending').length,
      approved: registrations.filter(r => r.status === 'approved').length,
      rejected: registrations.filter(r => r.status === 'rejected').length
    });

  } catch (error) {
    console.error('관리자 등록 목록 조회 오류:', error);
    res.status(500).json({ 
      error: '등록 목록 조회 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

// 관리자: 점검원 등록 승인/거부
router.put('/admin/:registrationId/approve', authenticateToken, requireAdminAccess, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { approved, rejection_reason } = req.body;

    if (typeof approved !== 'boolean') {
      return res.status(400).json({ error: 'approved 필드는 boolean 값이어야 합니다' });
    }

    if (!approved && !rejection_reason) {
      return res.status(400).json({ error: '거부 시 거부 사유를 입력해주세요' });
    }

    // 등록 신청 조회
    const registrationResult = await pool.query(
      'SELECT * FROM inspector_registration WHERE id = $1',
      [registrationId]
    );

    if (registrationResult.rows.length === 0) {
      return res.status(404).json({ error: '등록 신청을 찾을 수 없습니다' });
    }

    const registration = registrationResult.rows[0];

    if (registration.status !== 'pending') {
      return res.status(400).json({ 
        error: '이미 처리된 등록 신청입니다',
        current_status: registration.status 
      });
    }

    const adminId = req.user.adminId;

    if (approved) {
      // 승인 처리
      await pool.query('BEGIN');

      try {
        // 1. 등록 상태를 승인으로 변경
        await pool.query(
          `UPDATE inspector_registration 
           SET status = 'approved', approved_by = $1, approved_at = now(), updated_at = now()
           WHERE id = $2`,
          [adminId, registrationId]
        );

        // 2. 해당 세대의 user_type을 company로 변경
        await pool.query(
          `UPDATE household 
           SET user_type = 'company', resident_name = $1, phone = $2
           WHERE complex_id = $3 AND dong = $4 AND ho = $5`,
          [registration.inspector_name, registration.phone, registration.complex_id, registration.dong, registration.ho]
        );

        // 3. 해당 세대가 없으면 새로 생성
        const householdCheck = await pool.query(
          'SELECT id FROM household WHERE complex_id = $1 AND dong = $2 AND ho = $3',
          [registration.complex_id, registration.dong, registration.ho]
        );

        if (householdCheck.rows.length === 0) {
          await pool.query(
            `INSERT INTO household (complex_id, dong, ho, resident_name, phone, user_type)
             VALUES ($1, $2, $3, $4, $5, 'company')`,
            [registration.complex_id, registration.dong, registration.ho, registration.inspector_name, registration.phone]
          );
        }

        await pool.query('COMMIT');

        console.log('✅ 점검원 승인 완료:', {
          registration_id: registrationId,
          inspector_name: registration.inspector_name,
          approved_by: adminId
        });

        res.json({
          success: true,
          message: '점검원 등록이 승인되었습니다',
          registration: {
            id: registrationId,
            status: 'approved',
            approved_at: new Date().toISOString()
          }
        });

      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }

    } else {
      // 거부 처리
      await pool.query(
        `UPDATE inspector_registration 
         SET status = 'rejected', approved_by = $1, approved_at = now(), 
             rejection_reason = $2, updated_at = now()
         WHERE id = $3`,
        [adminId, rejection_reason, registrationId]
      );

      console.log('❌ 점검원 등록 거부:', {
        registration_id: registrationId,
        inspector_name: registration.inspector_name,
        rejection_reason,
        rejected_by: adminId
      });

      res.json({
        success: true,
        message: '점검원 등록이 거부되었습니다',
        registration: {
          id: registrationId,
          status: 'rejected',
          rejection_reason,
          approved_at: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('점검원 승인/거부 오류:', error);
    res.status(500).json({ 
      error: '승인/거부 처리 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

// 관리자: 점검원 등록 삭제
router.delete('/admin/:registrationId', authenticateToken, requireAdminAccess, async (req, res) => {
  try {
    const { registrationId } = req.params;

    const result = await pool.query(
      'DELETE FROM inspector_registration WHERE id = $1 RETURNING inspector_name',
      [registrationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '등록 신청을 찾을 수 없습니다' });
    }

    console.log('🗑️ 점검원 등록 삭제:', {
      registration_id: registrationId,
      inspector_name: result.rows[0].inspector_name
    });

    res.json({
      success: true,
      message: '점검원 등록이 삭제되었습니다'
    });

  } catch (error) {
    console.error('점검원 등록 삭제 오류:', error);
    res.status(500).json({ 
      error: '등록 삭제 중 오류가 발생했습니다',
      details: error.message 
    });
  }
});

module.exports = router;
