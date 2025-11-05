// 암호화 검증 스크립트
const { Pool } = require('pg');
const { decrypt } = require('../utils/encryption');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL 환경변수가 설정되지 않았습니다!');
  process.exit(1);
}

if (!process.env.ENCRYPTION_KEY) {
  console.error('❌ ENCRYPTION_KEY 환경변수가 설정되지 않았습니다!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyEncryption() {
  console.log('🔍 암호화 검증 시작\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. household 테이블 검증
    console.log('📋 household 테이블 검증');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const households = await pool.query(`
      SELECT 
        id, 
        resident_name, 
        resident_name_encrypted,
        phone,
        phone_encrypted
      FROM household 
      WHERE resident_name_encrypted IS NOT NULL
      LIMIT 3
    `);
    
    console.log(`   발견된 암호화된 레코드: ${households.rows.length}개\n`);
    
    for (const household of households.rows) {
      const decryptedName = decrypt(household.resident_name_encrypted);
      const decryptedPhone = household.phone_encrypted ? decrypt(household.phone_encrypted) : null;
      
      console.log(`   ID: ${household.id}`);
      console.log(`   원본 이름: ${household.resident_name}`);
      console.log(`   암호화된 이름: ${household.resident_name_encrypted.substring(0, 50)}...`);
      console.log(`   복호화된 이름: ${decryptedName}`);
      console.log(`   일치 여부: ${household.resident_name === decryptedName ? '✅' : '❌'}`);
      
      if (household.phone_encrypted) {
        console.log(`   원본 전화번호: ${household.phone}`);
        console.log(`   복호화된 전화번호: ${decryptedPhone}`);
        console.log(`   일치 여부: ${household.phone === decryptedPhone ? '✅' : '❌'}`);
      }
      console.log('');
    }
    
    // 2. inspector_registration 테이블 검증
    console.log('📋 inspector_registration 테이블 검증');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const registrations = await pool.query(`
      SELECT 
        id,
        inspector_name,
        inspector_name_encrypted,
        phone,
        phone_encrypted,
        email,
        email_encrypted
      FROM inspector_registration
      WHERE inspector_name_encrypted IS NOT NULL
      LIMIT 3
    `);
    
    console.log(`   발견된 암호화된 레코드: ${registrations.rows.length}개\n`);
    
    for (const reg of registrations.rows) {
      const decryptedName = decrypt(reg.inspector_name_encrypted);
      const decryptedPhone = reg.phone_encrypted ? decrypt(reg.phone_encrypted) : null;
      const decryptedEmail = reg.email_encrypted ? decrypt(reg.email_encrypted) : null;
      
      console.log(`   ID: ${reg.id}`);
      console.log(`   원본 이름: ${reg.inspector_name}`);
      console.log(`   복호화된 이름: ${decryptedName}`);
      console.log(`   일치 여부: ${reg.inspector_name === decryptedName ? '✅' : '❌'}`);
      
      if (reg.phone_encrypted) {
        console.log(`   원본 전화번호: ${reg.phone}`);
        console.log(`   복호화된 전화번호: ${decryptedPhone}`);
        console.log(`   일치 여부: ${reg.phone === decryptedPhone ? '✅' : '❌'}`);
      }
      
      if (reg.email_encrypted) {
        console.log(`   원본 이메일: ${reg.email}`);
        console.log(`   복호화된 이메일: ${decryptedEmail}`);
        console.log(`   일치 여부: ${reg.email === decryptedEmail ? '✅' : '❌'}`);
      }
      console.log('');
    }
    
    // 3. 통계
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 암호화 통계');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const householdStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(resident_name_encrypted) as encrypted
      FROM household
      WHERE resident_name IS NOT NULL
    `);
    
    const registrationStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(inspector_name_encrypted) as encrypted
      FROM inspector_registration
      WHERE inspector_name IS NOT NULL
    `);
    
    console.log(`   household: ${householdStats.rows[0].encrypted}/${householdStats.rows[0].total} 암호화됨`);
    console.log(`   inspector_registration: ${registrationStats.rows[0].encrypted}/${registrationStats.rows[0].total} 암호화됨`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 암호화 검증 완료!\n');

  } catch (error) {
    console.error('❌ 검증 오류:', error.message);
    if (error.stack) {
      console.error('   스택:', error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 실행
if (require.main === module) {
  verifyEncryption()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { verifyEncryption };

