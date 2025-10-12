// Admin routes
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database');
const config = require('../config');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware: Admin 권한 체크
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Middleware: Super Admin 권한 체크
function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super Admin access required' });
  }
  next();
}

// Admin 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Admin 조회
    const result = await pool.query(
      'SELECT * FROM admin_user WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];

    // 비밀번호 확인
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 마지막 로그인 시간 업데이트
    await pool.query(
      'UPDATE admin_user SET last_login = NOW() WHERE id = $1',
      [admin.id]
    );

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        adminId: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isAdmin: true
      },
      config.jwt.secret,
      { expiresIn: '7d' } // Admin은 7일
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 전체 사용자 목록 (검색, 필터, 페이지네이션)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { search, complex_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        h.id, h.dong, h.ho, h.resident_name, h.phone,
        c.id as complex_id, c.name as complex_name, c.address,
        COUNT(DISTINCT ch.id) as total_cases,
        COUNT(d.id) as total_defects
      FROM household h
      JOIN complex c ON h.complex_id = c.id
      LEFT JOIN case_header ch ON h.id = ch.household_id
      LEFT JOIN defect d ON ch.id = d.case_id
    `;

    const params = [];
    const conditions = [];

    // 검색 조건
    if (search) {
      conditions.push(`(
        h.dong ILIKE $${params.length + 1} OR 
        h.ho ILIKE $${params.length + 1} OR 
        h.resident_name ILIKE $${params.length + 1} OR
        h.phone ILIKE $${params.length + 1} OR
        c.name ILIKE $${params.length + 1}
      )`);
      params.push(`%${search}%`);
    }

    // 단지 필터
    if (complex_id) {
      conditions.push(`c.id = $${params.length + 1}`);
      params.push(complex_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY h.id, h.dong, h.ho, h.resident_name, h.phone, c.id, c.name, c.address
      ORDER BY h.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // 총 개수 조회
    let countQuery = 'SELECT COUNT(DISTINCT h.id) as total FROM household h JOIN complex c ON h.complex_id = c.id';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 사용자 상세 정보
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        h.*,
        c.name as complex_name,
        c.address as complex_address,
        json_agg(
          json_build_object(
            'id', at.id,
            'token', at.token,
            'purpose', at.purpose,
            'starts_at', at.starts_at,
            'ends_at', at.ends_at,
            'status', at.status
          )
        ) FILTER (WHERE at.id IS NOT NULL) as tokens
      FROM household h
      JOIN complex c ON h.complex_id = c.id
      LEFT JOIN access_token at ON h.id = at.household_id
      WHERE h.id = $1
      GROUP BY h.id, c.name, c.address
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 사용자 정보 수정
router.put('/users/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { resident_name, phone } = req.body;

    const result = await pool.query(
      `UPDATE household 
       SET resident_name = COALESCE($1, resident_name),
           phone = COALESCE($2, phone)
       WHERE id = $3
       RETURNING *`,
      [resident_name, phone, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 토큰 발급/연장
router.post('/users/:id/tokens', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { purpose = 'precheck', days = 30 } = req.body;

    // 랜덤 토큰 생성
    const token = `token-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startsAt = new Date();
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + days);

    const result = await pool.query(
      `INSERT INTO access_token (household_id, purpose, token, starts_at, ends_at, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [id, purpose, token, startsAt, endsAt]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Create token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 토큰 비활성화
router.delete('/tokens/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE access_token SET status = 'inactive' WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }

    res.json({ message: 'Token deactivated', token: result.rows[0] });

  } catch (error) {
    console.error('Deactivate token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 전체 하자 목록 (Admin용)
router.get('/defects', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { search, complex_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        d.id, d.location, d.trade, d.content, d.memo, 
        d.photo_near, d.photo_far, d.created_at,
        ch.id as case_id, ch.type as case_type,
        h.id as household_id, h.dong, h.ho, h.resident_name, h.phone,
        c.id as complex_id, c.name as complex_name,
        dr.id as resolution_id,
        dr.memo as resolution_memo,
        dr.contractor, dr.worker, dr.cost,
        dr.resolution_photos,
        dr.updated_at as resolution_updated_at
      FROM defect d
      JOIN case_header ch ON d.case_id = ch.id
      JOIN household h ON ch.household_id = h.id
      JOIN complex c ON h.complex_id = c.id
      LEFT JOIN defect_resolution dr ON d.id = dr.defect_id
    `;

    const params = [];
    const conditions = [];

    if (search) {
      conditions.push(`(
        d.location ILIKE $${params.length + 1} OR
        d.trade ILIKE $${params.length + 1} OR
        d.content ILIKE $${params.length + 1} OR
        h.dong ILIKE $${params.length + 1} OR
        h.ho ILIKE $${params.length + 1} OR
        h.resident_name ILIKE $${params.length + 1}
      )`);
      params.push(`%${search}%`);
    }

    if (complex_id) {
      conditions.push(`c.id = $${params.length + 1}`);
      params.push(complex_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      ORDER BY d.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      defects: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get admin defects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 처리 결과 등록/수정
router.post('/defects/:defectId/resolution', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { defectId } = req.params;
    const { memo, contractor, worker, cost, resolution_photos } = req.body;
    const adminId = req.user.adminId;

    // 기존 처리 결과 확인
    const existing = await pool.query(
      'SELECT id FROM defect_resolution WHERE defect_id = $1',
      [defectId]
    );

    let result;

    if (existing.rows.length > 0) {
      // 수정
      result = await pool.query(
        `UPDATE defect_resolution
         SET memo = $1, contractor = $2, worker = $3, cost = $4,
             resolution_photos = $5, updated_at = NOW()
         WHERE defect_id = $6
         RETURNING *`,
        [memo, contractor, worker, cost, resolution_photos || [], defectId]
      );
    } else {
      // 신규 등록
      result = await pool.query(
        `INSERT INTO defect_resolution 
         (defect_id, admin_user_id, memo, contractor, worker, cost, resolution_photos)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [defectId, adminId, memo, contractor, worker, cost, resolution_photos || []]
      );
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Save resolution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 처리 결과 조회
router.get('/defects/:defectId/resolution', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { defectId } = req.params;

    const result = await pool.query(
      `SELECT dr.*, au.name as admin_name, au.email as admin_email
       FROM defect_resolution dr
       LEFT JOIN admin_user au ON dr.admin_user_id = au.id
       WHERE dr.defect_id = $1`,
      [defectId]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get resolution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 단지 목록
router.get('/complexes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT h.id) as household_count,
        COUNT(DISTINCT ch.id) as case_count,
        COUNT(d.id) as defect_count
      FROM complex c
      LEFT JOIN household h ON c.id = h.complex_id
      LEFT JOIN case_header ch ON h.id = ch.household_id
      LEFT JOIN defect d ON ch.id = d.case_id
      GROUP BY c.id
      ORDER BY c.name
    `);

    res.json(result.rows);

  } catch (error) {
    console.error('Get complexes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 통계 대시보드
router.get('/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM household) as total_users,
        (SELECT COUNT(*) FROM complex) as total_complexes,
        (SELECT COUNT(*) FROM case_header) as total_cases,
        (SELECT COUNT(*) FROM defect) as total_defects,
        (SELECT COUNT(*) FROM defect_resolution) as total_resolutions,
        (SELECT COUNT(*) FROM defect d 
         LEFT JOIN defect_resolution dr ON d.id = dr.defect_id 
         WHERE dr.id IS NULL) as pending_defects
    `);

    res.json(stats.rows[0]);

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

