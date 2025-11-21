// 중앙화된 에러 핸들링 유틸리티
const config = require('../config');

/**
 * 환경변수 체크 및 경고
 */
function checkEnvironmentVariables() {
  const warnings = [];
  const errors = [];

  // 필수 환경변수 체크
  if (!process.env.DATABASE_URL && !config.database.host) {
    errors.push('데이터베이스 연결 정보가 설정되지 않았습니다.');
  }

  // 선택적 환경변수 체크 (기능이 작동하지 않을 수 있음)
  if (!config.youtubeApiKey) {
    warnings.push('YOUTUBE_API_KEY가 설정되지 않았습니다. YouTube 검색 기능이 작동하지 않습니다.');
  }

  if (!config.azureOpenAI.endpoint || !config.azureOpenAI.apiKey) {
    warnings.push('Azure OpenAI 설정이 없습니다. Azure AI 판정 기능이 작동하지 않습니다.');
  }

  if (!config.sms.accountSid || !config.sms.authToken) {
    warnings.push('SMS 설정이 없습니다. SMS 발송 기능이 작동하지 않습니다.');
  }

  if (!config.vapidPublicKey || !config.vapidPrivateKey) {
    warnings.push('VAPID 키가 설정되지 않았습니다. 푸시 알림 기능이 작동하지 않습니다.');
  }

  // 경고 및 에러 로깅
  if (warnings.length > 0) {
    console.warn('⚠️ 환경변수 경고:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  if (errors.length > 0) {
    console.error('❌ 환경변수 에러:');
    errors.forEach(error => console.error(`   - ${error}`));
  }

  return {
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
    errors,
    warnings
  };
}

/**
 * 기능 사용 가능 여부 체크
 */
function isFeatureAvailable(featureName) {
  switch (featureName) {
    case 'youtube':
      return !!config.youtubeApiKey;
    case 'azure-ai':
      return !!(config.azureOpenAI.endpoint && config.azureOpenAI.apiKey);
    case 'sms':
      return !!(config.sms.accountSid && config.sms.authToken);
    case 'push':
      return !!(config.vapidPublicKey && config.vapidPrivateKey);
    default:
      return true;
  }
}

/**
 * 기능 사용 불가 시 에러 응답 생성
 */
function createFeatureUnavailableError(featureName, customMessage = null) {
  const messages = {
    youtube: 'YouTube 검색 기능이 설정되지 않았습니다. 관리자에게 문의하세요.',
    'azure-ai': 'Azure AI 판정 기능이 설정되지 않았습니다. 관리자에게 문의하세요.',
    sms: 'SMS 발송 기능이 설정되지 않았습니다. 관리자에게 문의하세요.',
    push: '푸시 알림 기능이 설정되지 않았습니다. 관리자에게 문의하세요.'
  };

  return {
    success: false,
    error: `${featureName} feature unavailable`,
    message: customMessage || messages[featureName] || `${featureName} 기능을 사용할 수 없습니다.`,
    available: false,
    reason: 'configuration_missing'
  };
}

/**
 * 안전한 에러 응답 생성
 */
function createSafeErrorResponse(error, defaultMessage = '오류가 발생했습니다.') {
  // 프로덕션 환경에서는 상세 에러 정보를 숨김
  const isProduction = config.nodeEnv === 'production';

  // 에러 타입별 처리
  if (error.name === 'ValidationError') {
    return {
      success: false,
      error: 'validation_error',
      message: error.message || '입력값이 올바르지 않습니다.',
      details: isProduction ? undefined : error.details
    };
  }

  if (error.name === 'DatabaseError' || error.code === 'ECONNREFUSED') {
    return {
      success: false,
      error: 'database_error',
      message: '데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.',
      details: isProduction ? undefined : error.message
    };
  }

  if (error.name === 'NetworkError' || error.code === 'ENOTFOUND') {
    return {
      success: false,
      error: 'network_error',
      message: '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.',
      details: isProduction ? undefined : error.message
    };
  }

  // 기타 에러
  return {
    success: false,
    error: 'internal_error',
    message: defaultMessage,
    details: isProduction ? undefined : error.message
  };
}

/**
 * Express 미들웨어: 에러 핸들링
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });

  // 이미 응답이 전송된 경우
  if (res.headersSent) {
    return next(err);
  }

  const errorResponse = createSafeErrorResponse(err);

  res.status(err.status || 500).json(errorResponse);
}

/**
 * 비동기 함수 래퍼: 에러 자동 처리
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 기능 사용 가능 여부 체크 미들웨어
 */
function requireFeature(featureName) {
  return (req, res, next) => {
    if (!isFeatureAvailable(featureName)) {
      const errorResponse = createFeatureUnavailableError(featureName);
      return res.status(503).json(errorResponse);
    }
    next();
  };
}

/**
 * 안전한 함수 실행 (에러 발생 시 기본값 반환)
 */
async function safeExecute(fn, defaultValue = null, errorMessage = null) {
  try {
    return await fn();
  } catch (error) {
    console.error('⚠️ Safe execute error:', error.message);
    if (errorMessage) {
      console.error(`   ${errorMessage}`);
    }
    return defaultValue;
  }
}

module.exports = {
  checkEnvironmentVariables,
  isFeatureAvailable,
  createFeatureUnavailableError,
  createSafeErrorResponse,
  errorHandler,
  asyncHandler,
  requireFeature,
  safeExecute
};

