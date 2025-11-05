// 개인정보 보호를 위한 안전한 로깅 유틸리티
// 개인정보는 마스킹하여 로그에 기록

/**
 * 전화번호 마스킹
 * @param {string} phone - 전화번호 (예: "010-1234-5678")
 * @returns {string} 마스킹된 전화번호 (예: "010-****-5678")
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return phone;
  
  // 전화번호 형식: 010-1234-5678 또는 01012345678
  const cleaned = phone.replace(/-/g, '');
  
  if (cleaned.length === 11) {
    // 010-1234-5678 형식
    return phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3');
  } else if (cleaned.length === 10) {
    // 010-123-4567 형식
    return phone.replace(/(\d{3})-(\d{3})-(\d{4})/, '$1-***-$3');
  }
  
  // 형식이 맞지 않으면 전체 마스킹
  return '***-****-****';
}

/**
 * 이름 마스킹
 * @param {string} name - 이름 (예: "홍길동")
 * @returns {string} 마스킹된 이름 (예: "홍**")
 */
function maskName(name) {
  if (!name || typeof name !== 'string') return name;
  if (name.length <= 1) return name;
  if (name.length === 2) return name.charAt(0) + '*';
  
  // 첫 글자만 보여주고 나머지는 마스킹
  return name.charAt(0) + '*'.repeat(name.length - 1);
}

/**
 * 이메일 마스킹
 * @param {string} email - 이메일 (예: "test@example.com")
 * @returns {string} 마스킹된 이메일 (예: "te***@example.com")
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return email;
  
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  
  if (local.length <= 2) {
    return local + '***@' + domain;
  }
  
  return local.substring(0, 2) + '***@' + domain;
}

/**
 * 주소 정보 마스킹 (동/호)
 * @param {string} dong - 동 (예: "101")
 * @param {string} ho - 호 (예: "1203")
 * @returns {object} 마스킹된 동/호
 */
function maskAddress(dong, ho) {
  return {
    dong: dong ? dong.substring(0, 1) + '**' : dong,
    ho: ho ? '***' : ho
  };
}

/**
 * 객체에서 개인정보 마스킹
 * @param {object} data - 마스킹할 데이터
 * @returns {object} 마스킹된 데이터
 */
function maskPersonalInfo(data) {
  if (!data || typeof data !== 'object') return data;
  
  const masked = { ...data };
  
  // 전화번호 관련 필드
  if (masked.phone) {
    masked.phone = maskPhone(masked.phone);
  }
  
  // 이름 관련 필드
  if (masked.name) {
    masked.name = maskName(masked.name);
  }
  if (masked.resident_name) {
    masked.resident_name = maskName(masked.resident_name);
  }
  if (masked.inspector_name) {
    masked.inspector_name = maskName(masked.inspector_name);
  }
  
  // 이메일
  if (masked.email) {
    masked.email = maskEmail(masked.email);
  }
  
  // 주소 정보
  if (masked.dong) {
    masked.dong = maskAddress(masked.dong, masked.ho).dong;
  }
  if (masked.ho) {
    masked.ho = maskAddress(masked.dong, masked.ho).ho;
  }
  
  return masked;
}

/**
 * 안전한 로깅 함수 (개인정보 자동 마스킹)
 * @param {string} level - 로그 레벨 ('info', 'warn', 'error')
 * @param {string} message - 로그 메시지
 * @param {object} data - 로그 데이터 (개인정보 포함 가능)
 */
function safeLog(level, message, data = {}) {
  const maskedData = maskPersonalInfo(data);
  const timestamp = new Date().toISOString();
  
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  switch (level) {
    case 'error':
      console.error(logMessage, JSON.stringify(maskedData, null, 2));
      break;
    case 'warn':
      console.warn(logMessage, JSON.stringify(maskedData, null, 2));
      break;
    default:
      console.log(logMessage, JSON.stringify(maskedData, null, 2));
  }
}

module.exports = {
  maskPhone,
  maskName,
  maskEmail,
  maskAddress,
  maskPersonalInfo,
  safeLog
};

