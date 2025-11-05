// 개인정보 암호화 마이그레이션 스크립트
const { Pool } = require('pg');
const { encrypt } = require('../utils/encryption');

// DATABASE_URL 우선 사용, 없으면 database.js 사용
let pool;
if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
  console.log('📊 Using DATABASE_URL for connection');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  // database.js 사용 (기본 연결)
  pool = require('../database');
}

async function migrateEncryptData() {
  console.log('🔒 개인정보 암호화 마이그레이션 시작\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ENCRYPTION_KEY 확인
  if (!process.env.ENCRYPTION_KEY) {
    console.error('❌ ENCRYPTION_KEY 환경변수가 설정되지 않았습니다!');
    console.error('   Render Dashboard → Environment에서 ENCRYPTION_KEY를 설정하세요.');
    process.exit(1);
  }

  try {
    // 1. household 테이블 암호화
    console.log('📋 1단계: household 테이블 암호화');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const households = await pool.query(
      'SELECT id, resident_name, phone FROM household WHERE resident_name IS NOT NULL OR phone IS NOT NULL'
    );
    
    console.log(`   발견된 세대 수: ${households.rows.length}`);
    
    let householdCount = 0;
    for (const household of households.rows) {
      const residentNameEncrypted = household.resident_name 
        ? encrypt(household.resident_name) 
        : null;
      const phoneEncrypted = household.phone 
        ? encrypt(household.phone) 
        : null;
      
      await pool.query(
        `UPDATE household 
         SET resident_name_encrypted = $1, phone_encrypted = $2
         WHERE id = $3`,
        [residentNameEncrypted, phoneEncrypted, household.id]
      );
      householdCount++;
      
      if (householdCount % 10 === 0) {
        console.log(`   진행 중... ${householdCount}/${households.rows.length}`);
      }
    }
    
    console.log(`✅ household 테이블 암호화 완료: ${householdCount}개\n`);

    // 2. inspector_registration 테이블 암호화
    console.log('📋 2단계: inspector_registration 테이블 암호화');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const registrations = await pool.query(
      'SELECT id, inspector_name, phone, email FROM inspector_registration'
    );
    
    console.log(`   발견된 등록 신청 수: ${registrations.rows.length}`);
    
    let registrationCount = 0;
    for (const registration of registrations.rows) {
      const inspectorNameEncrypted = registration.inspector_name 
        ? encrypt(registration.inspector_name) 
        : null;
      const phoneEncrypted = registration.phone 
        ? encrypt(registration.phone) 
        : null;
      const emailEncrypted = registration.email 
        ? encrypt(registration.email) 
        : null;
      
      await pool.query(
        `UPDATE inspector_registration 
         SET inspector_name_encrypted = $1, phone_encrypted = $2, email_encrypted = $3
         WHERE id = $4`,
        [inspectorNameEncrypted, phoneEncrypted, emailEncrypted, registration.id]
      );
      registrationCount++;
    }
    
    console.log(`✅ inspector_registration 테이블 암호화 완료: ${registrationCount}개\n`);

    // 3. 검증
    console.log('📋 3단계: 암호화 검증');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const householdCheck = await pool.query(
      'SELECT COUNT(*) as total, COUNT(resident_name_encrypted) as encrypted FROM household WHERE resident_name IS NOT NULL'
    );
    const registrationCheck = await pool.query(
      'SELECT COUNT(*) as total, COUNT(inspector_name_encrypted) as encrypted FROM inspector_registration WHERE inspector_name IS NOT NULL'
    );
    
    console.log(`   household: ${householdCheck.rows[0].encrypted}/${householdCheck.rows[0].total} 암호화됨`);
    console.log(`   inspector_registration: ${registrationCheck.rows[0].encrypted}/${registrationCheck.rows[0].total} 암호화됨`);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 마이그레이션 완료!\n');
    console.log('⚠️  다음 단계:');
    console.log('   1. 데이터베이스에서 암호화된 데이터가 정상인지 확인');
    console.log('   2. API 코드에서 암호화/복호화 적용');
    console.log('   3. 기존 컬럼 삭제 (선택사항, 백업 후)');
    console.log('');

  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error);
    console.error('   상세 오류:', error.message);
    if (error.stack) {
      console.error('   스택:', error.stack);
    }
    process.exit(1);
  } finally {
    // DATABASE_URL로 직접 연결한 경우에만 종료
    if (process.env.DATABASE_URL) {
      await pool.end();
    }
  }
}

// 실행
if (require.main === module) {
  migrateEncryptData()
    .then(() => {
      console.log('✅ 스크립트 실행 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { migrateEncryptData };

