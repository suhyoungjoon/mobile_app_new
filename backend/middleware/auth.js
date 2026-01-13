// Simple JWT authentication middleware
const jwt = require('jsonwebtoken');
const config = require('../config');

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

module.exports = { 
  authenticateToken, 
  checkUserRole, 
  requireEquipmentAccess, 
  requireAdminAccess 
};
