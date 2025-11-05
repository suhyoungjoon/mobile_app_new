// 개인정보 암호화/복호화 유틸리티
const crypto = require('crypto');

// 환경변수에서 암호화 키 가져오기 (32 bytes = 256 bits)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  : null;

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES 블록 크기

/**
 * 개인정보 암호화
 * @param {string} text - 암호화할 텍스트
 * @returns {string} 암호화된 텍스트 (IV:암호문 형식)
 */
function encrypt(text) {
  if (!ENCRYPTION_KEY) {
    console.warn('⚠️ ENCRYPTION_KEY가 설정되지 않았습니다. 암호화를 건너뜁니다.');
    return text;
  }
  
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // IV와 암호문을 결합하여 저장 (IV:암호문)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('❌ 암호화 실패:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * 개인정보 복호화
 * @param {string} encryptedText - 암호화된 텍스트
 * @returns {string} 복호화된 텍스트
 */
function decrypt(encryptedText) {
  if (!ENCRYPTION_KEY) {
    console.warn('⚠️ ENCRYPTION_KEY가 설정되지 않았습니다. 복호화를 건너뜁니다.');
    return encryptedText;
  }
  
  if (!encryptedText || typeof encryptedText !== 'string') {
    return encryptedText;
  }
  
  // 평문인 경우 (마이그레이션 전 데이터)
  if (!encryptedText.includes(':')) {
    return encryptedText;
  }
  
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = textParts.join(':');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ 복호화 실패:', error);
    throw new Error('Decryption failed');
  }
}

/**
 * 객체의 특정 필드만 암호화
 * @param {object} data - 암호화할 데이터 객체
 * @param {array} fields - 암호화할 필드명 배열
 * @returns {object} 암호화된 데이터 객체
 */
function encryptFields(data, fields) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const encrypted = { ...data };
  
  fields.forEach(field => {
    if (encrypted[field]) {
      encrypted[field] = encrypt(encrypted[field]);
    }
  });
  
  return encrypted;
}

/**
 * 객체의 특정 필드만 복호화
 * @param {object} data - 복호화할 데이터 객체
 * @param {array} fields - 복호화할 필드명 배열
 * @returns {object} 복호화된 데이터 객체
 */
function decryptFields(data, fields) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const decrypted = { ...data };
  
  fields.forEach(field => {
    if (decrypted[field]) {
      decrypted[field] = decrypt(decrypted[field]);
    }
  });
  
  return decrypted;
}

/**
 * 암호화 키 생성 (초기 설정용)
 * @returns {string} 32바이트 hex 키
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  generateEncryptionKey
};

