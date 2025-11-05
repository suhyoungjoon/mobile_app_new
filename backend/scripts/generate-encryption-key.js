// 암호화 키 생성 스크립트
const crypto = require('crypto');

function generateEncryptionKey() {
  console.log('🔑 암호화 키 생성 중...');
  const key = crypto.randomBytes(32).toString('hex');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 암호화 키 생성 완료!\n');
  console.log('📋 생성된 키:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`ENCRYPTION_KEY=${key}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📝 Render 환경변수 설정:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Render Dashboard → Environment');
  console.log('2. "Add Environment Variable" 클릭');
  console.log('3. Key: ENCRYPTION_KEY');
  console.log(`4. Value: ${key}`);
  console.log('5. "Save Changes" 클릭');
  console.log('6. 서비스 재배포\n');
  
  console.log('⚠️  중요: 이 키를 안전하게 보관하세요!');
  console.log('   - 키를 분실하면 데이터 복호화가 불가능합니다.');
  console.log('   - Git에 커밋하지 마세요!');
  console.log('   - 환경변수로만 관리하세요.\n');
  
  return key;
}

if (require.main === module) {
  generateEncryptionKey();
}

module.exports = { generateEncryptionKey };

