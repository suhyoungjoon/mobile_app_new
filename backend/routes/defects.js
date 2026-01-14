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
