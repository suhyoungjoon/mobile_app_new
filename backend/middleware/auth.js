// Simple JWT authentication middleware
const jwt = require('jsonwebtoken');
const config = require('../config');
const pool = require('../database');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.log('❌ 인증 실패: 토큰 없음', { path: req.path, method: req.method });
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      console.log('❌ 인증 실패: 토큰 유효하지 않음', { 
        path: req.path, 
        method: req.method,
        error: err.message 
      });
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// 사용자 유형별 권한 확인 미들웨어
const checkUserRole = (requiredRoles) => {
  return (req, res, next) => {
    const userType = req.user?.user_type || 'resident';
    
    // 역할 계층 정의
    const roleHierarchy = {
      'resident': 1,    // 입주자 (하자 등록만)
      'company': 2,      // 회사/점검원 (장비점검 가능)
      'admin': 3         // 관리자 (전체 권한)
    };
    
    const userLevel = roleHierarchy[userType] || 1;
    const requiredLevel = Math.min(...requiredRoles.map(role => roleHierarchy[role] || 1));
    
    if (userLevel >= requiredLevel) {
      next();
    } else {
      res.status(403).json({ 
        error: '권한이 없습니다',
        required: requiredRoles,
        current: userType
      });
    }
  };
};

// 장비점검 전용 권한 (회사 계정 이상)
const requireEquipmentAccess = checkUserRole(['company', 'admin']);

// 관리자 전용 권한
const requireAdminAccess = checkUserRole(['admin']);

// 점검원 권한 체크 (complex === 'admin'인지 확인)
const requireInspectorAccess = async (req, res, next) => {
  try {
    const householdId = req.user?.householdId;
    
    if (!householdId) {
      return res.status(403).json({ error: '점검원 권한이 필요합니다' });
    }
    
    // household와 complex 정보 조회
    const result = await pool.query(
      `SELECT c.name as complex_name 
       FROM household h
       JOIN complex c ON h.complex_id = c.id
       WHERE h.id = $1`,
      [householdId]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: '세대 정보를 찾을 수 없습니다' });
    }
    
    const complexName = result.rows[0].complex_name?.toLowerCase();
    
    if (complexName !== 'admin') {
      return res.status(403).json({ 
        error: '점검원 권한이 필요합니다. 아파트(단지) 항목에 "admin"을 입력하세요.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('점검원 권한 체크 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

module.exports = { 
  authenticateToken, 
  checkUserRole, 
  requireEquipmentAccess, 
  requireAdminAccess,
  requireInspectorAccess
};
