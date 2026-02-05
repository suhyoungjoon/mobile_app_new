// Defects routes
const express = require('express');
const pool = require('../database');
const { authenticateToken, requireInspectorAccess } = require('../middleware/auth');
const { decrypt } = require('../utils/encryption');

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
             d.created_at
      FROM defect d
      WHERE d.case_id = $1
      ORDER BY d.created_at DESC
    `;
    
    const result = await pool.query(query, [case_id]);
    const defects = result.rows;
    
    // Fetch photos for each defect
    for (const defect of defects) {
      const photoQuery = `
        SELECT id, kind, url, thumb_url, taken_at
        FROM photo
        WHERE defect_id = $1
      `;
      const photoResult = await pool.query(photoQuery, [defect.id]);
      defect.photos = photoResult.rows;
    }
    
    res.json(defects);
    
  } catch (error) {
    console.error('Get defects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 점검원용: 하자가 등록된 사용자(세대) 목록 (household_id 기준)
// 점검결과( inspection_item )가 하나라도 있는 사용자는 상단 정렬 + has_inspected 표시
router.get('/users', authenticateToken, requireInspectorAccess, async (req, res) => {
  try {
    const query = `
      WITH household_defects AS (
        SELECT 
          h.id AS household_id,
          c.name AS complex_name,
          h.dong,
          h.ho,
          h.resident_name,
          h.resident_name_encrypted,
          COUNT(d.id) AS defect_count,
          COUNT(ii.id) AS inspected_count
        FROM household h
        JOIN complex c ON h.complex_id = c.id
        JOIN case_header ch ON ch.household_id = h.id
        JOIN defect d ON d.case_id = ch.id
        LEFT JOIN inspection_item ii ON ii.defect_id = d.id
        WHERE LOWER(TRIM(c.name)) <> 'admin'
        GROUP BY h.id, c.name, h.dong, h.ho, h.resident_name, h.resident_name_encrypted
      )
      SELECT * FROM household_defects
      ORDER BY (inspected_count > 0) DESC, defect_count DESC, dong, ho
      LIMIT 500
    `;
    const result = await pool.query(query);
    const users = result.rows.map((row) => {
      let name = row.resident_name || '';
      if (row.resident_name_encrypted) {
        try {
          name = decrypt(row.resident_name_encrypted);
        } catch (e) {
          name = row.resident_name || '';
        }
      }
      const inspectedCount = parseInt(row.inspected_count, 10) || 0;
      return {
        household_id: row.household_id,
        complex_name: row.complex_name || '',
        dong: row.dong || '',
        ho: row.ho || '',
        resident_name: name,
        defect_count: parseInt(row.defect_count, 10),
        has_inspected: inspectedCount > 0
      };
    });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get users with defects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 점검원용: 특정 사용자(세대)의 하자 목록 (household_id 기준)
router.get('/by-household/:householdId', authenticateToken, requireInspectorAccess, async (req, res) => {
  try {
    const householdId = parseInt(req.params.householdId, 10);
    if (Number.isNaN(householdId)) {
      return res.status(400).json({ error: 'Invalid household_id' });
    }
    const query = `
      SELECT 
        d.id, d.case_id, d.location, d.trade, d.content, d.memo, 
        d.created_at,
        ch.type AS case_type, ch.created_at AS case_created_at
      FROM defect d
      JOIN case_header ch ON d.case_id = ch.id
      WHERE ch.household_id = $1
      ORDER BY d.created_at DESC
      LIMIT 1000
    `;
    const result = await pool.query(query, [householdId]);
    const defects = result.rows;
    for (const defect of defects) {
      const photoResult = await pool.query(
        'SELECT id, kind, url, thumb_url, taken_at FROM photo WHERE defect_id = $1',
        [defect.id]
      );
      defect.photos = photoResult.rows;
    }
    res.json({ success: true, defects, total: defects.length });
  } catch (error) {
    console.error('Get defects by household error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 점검원용: 모든 하자 조회 (admin complex만 접근 가능)
router.get('/all', authenticateToken, requireInspectorAccess, async (req, res) => {
  try {
    const query = `
      SELECT 
        d.id, d.case_id, d.location, d.trade, d.content, d.memo, 
        d.created_at,
        ch.type as case_type, ch.created_at as case_created_at
      FROM defect d
      JOIN case_header ch ON d.case_id = ch.id
      ORDER BY d.created_at DESC
      LIMIT 1000
    `;
    
    const result = await pool.query(query);
    const defects = result.rows;
    
    // Fetch photos for each defect
    for (const defect of defects) {
      const photoQuery = `
        SELECT id, kind, url, thumb_url, taken_at
        FROM photo
        WHERE defect_id = $1
      `;
      const photoResult = await pool.query(photoQuery, [defect.id]);
      defect.photos = photoResult.rows;
    }
    
    res.json({
      success: true,
      defects: defects,
      total: defects.length
    });
    
  } catch (error) {
    console.error('Get all defects error:', error);
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
    const defect = result.rows[0];
    
    // Insert photos if provided
    if (photo_near_key) {
      const photoId = `PHOTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await pool.query(
        `INSERT INTO photo (id, defect_id, kind, url, taken_at) 
         VALUES ($1, $2, 'near', $3, NOW())`,
        [photoId, defectId, `/uploads/${photo_near_key}`]
      );
    }
    
    if (photo_far_key) {
      const photoId = `PHOTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await pool.query(
        `INSERT INTO photo (id, defect_id, kind, url, taken_at) 
         VALUES ($1, $2, 'far', $3, NOW())`,
        [photoId, defectId, `/uploads/${photo_far_key}`]
      );
    }
    
    res.status(201).json(defect);

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
      SET location = $1, trade = $2, content = $3, memo = $4
      WHERE id = $5
      RETURNING id, case_id, location, trade, content, memo, created_at
    `;

    const result = await pool.query(updateQuery, [location, trade, content, memo || '', id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Defect not found' });
    }
    
    const defect = result.rows[0];
    
    // 사진 업데이트 처리 (photo_near_key 또는 photo_far_key가 제공된 경우에만)
    if (photo_near_key !== undefined && photo_near_key !== null) {
      // 기존 near 사진 삭제
      await pool.query('DELETE FROM photo WHERE defect_id = $1 AND kind = $2', [id, 'near']);
      
      // 새 near 사진이 제공된 경우에만 추가
      if (photo_near_key) {
        const photoId = `PHOTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await pool.query(
          `INSERT INTO photo (id, defect_id, kind, url, taken_at) 
           VALUES ($1, $2, 'near', $3, NOW())`,
          [photoId, id, `/uploads/${photo_near_key}`]
        );
      }
    }
    
    if (photo_far_key !== undefined && photo_far_key !== null) {
      // 기존 far 사진 삭제
      await pool.query('DELETE FROM photo WHERE defect_id = $1 AND kind = $2', [id, 'far']);
      
      // 새 far 사진이 제공된 경우에만 추가
      if (photo_far_key) {
        const photoId = `PHOTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await pool.query(
          `INSERT INTO photo (id, defect_id, kind, url, taken_at) 
           VALUES ($1, $2, 'far', $3, NOW())`,
          [photoId, id, `/uploads/${photo_far_key}`]
        );
      }
    }
    
    // 업데이트된 사진 정보 조회
    const photoQuery = `
      SELECT id, kind, url, thumb_url, taken_at
      FROM photo
      WHERE defect_id = $1
      ORDER BY kind, taken_at
    `;
    const photoResult = await pool.query(photoQuery, [id]);
    defect.photos = photoResult.rows;
    
    res.json(defect);

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
             d.created_at
      FROM defect d
      WHERE d.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Defect not found' });
    }
    
    const defect = result.rows[0];
    
    // Fetch photos for the defect
    const photoQuery = `
      SELECT id, kind, url, thumb_url, taken_at
      FROM photo
      WHERE defect_id = $1
      ORDER BY kind, taken_at
    `;
    const photoResult = await pool.query(photoQuery, [id]);
    defect.photos = photoResult.rows;
    
    res.json(defect);
    
  } catch (error) {
    console.error('Get defect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
