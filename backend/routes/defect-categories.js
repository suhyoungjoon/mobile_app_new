// 하자 카테고리 관련 라우트
const express = require('express');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 모든 하자 카테고리 목록 조회
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        description,
        solution,
        severity,
        category
      FROM defect_categories 
      ORDER BY category, name
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Get defect categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 카테고리별 하자 목록 조회
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const query = `
      SELECT 
        id,
        name,
        description,
        solution,
        severity,
        category
      FROM defect_categories 
      WHERE category = $1
      ORDER BY name
    `;
    
    const result = await pool.query(query, [category]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get defect categories by category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 특정 하자 카테고리 상세 정보 조회 (동영상 포함)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 하자 카테고리 정보
    const categoryQuery = `
      SELECT 
        id,
        name,
        description,
        solution,
        severity,
        category
      FROM defect_categories 
      WHERE id = $1
    `;
    
    const categoryResult = await pool.query(categoryQuery, [id]);
    
    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Defect category not found' });
    }
    
    // 관련 동영상 정보
    const videosQuery = `
      SELECT 
        id,
        youtube_video_id,
        youtube_url,
        title,
        description,
        timestamp_start,
        timestamp_end,
        is_primary
      FROM defect_videos 
      WHERE defect_category_id = $1
      ORDER BY is_primary DESC, timestamp_start
    `;
    
    const videosResult = await pool.query(videosQuery, [id]);
    
    res.json({
      ...categoryResult.rows[0],
      videos: videosResult.rows
    });
  } catch (error) {
    console.error('Get defect category detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 하자 카테고리 검색
router.get('/search/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const query = `
      SELECT 
        id,
        name,
        description,
        solution,
        severity,
        category
      FROM defect_categories 
      WHERE name ILIKE $1 OR description ILIKE $1
      ORDER BY name
    `;
    
    const result = await pool.query(query, [`%${keyword}%`]);
    res.json(result.rows);
  } catch (error) {
    console.error('Search defect categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 하자 카테고리별 동영상 목록 조회
router.get('/:id/videos', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        id,
        youtube_video_id,
        youtube_url,
        title,
        description,
        timestamp_start,
        timestamp_end,
        is_primary
      FROM defect_videos 
      WHERE defect_category_id = $1
      ORDER BY is_primary DESC, timestamp_start
    `;
    
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get defect videos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
