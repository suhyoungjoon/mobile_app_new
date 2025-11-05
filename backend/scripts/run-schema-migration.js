// 데이터베이스 스키마 업데이트 스크립트
const { Pool } = require('pg');

// DATABASE_URL 확인
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL 환경변수가 설정되지 않았습니다!');
  process.exit(1);
}

console.log('🔗 데이터베이스 연결 중...');
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updateSchema() {
  console.log('📋 데이터베이스 스키마 업데이트 시작\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. household 테이블에 암호화된 필드 추가
    console.log('📋 1단계: household 테이블 업데이트');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await pool.query(`
      ALTER TABLE household 
      ADD COLUMN IF NOT EXISTS resident_name_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS phone_encrypted TEXT
    `);
    
    console.log('✅ household 테이블 업데이트 완료\n');

    // 2. inspector_registration 테이블에 암호화된 필드 추가
    console.log('📋 2단계: inspector_registration 테이블 업데이트');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await pool.query(`
      ALTER TABLE inspector_registration
      ADD COLUMN IF NOT EXISTS inspector_name_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS email_encrypted TEXT
    `);
    
    console.log('✅ inspector_registration 테이블 업데이트 완료\n');

    // 3. 검증
    console.log('📋 3단계: 스키마 검증');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const householdCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'household' 
      AND column_name IN ('resident_name_encrypted', 'phone_encrypted')
    `);
    
    const registrationCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'inspector_registration' 
      AND column_name IN ('inspector_name_encrypted', 'phone_encrypted', 'email_encrypted')
    `);
    
    console.log(`   household 컬럼: ${householdCheck.rows.length}/2 추가됨`);
    console.log(`   inspector_registration 컬럼: ${registrationCheck.rows.length}/3 추가됨`);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 스키마 업데이트 완료!\n');

  } catch (error) {
    console.error('❌ 스키마 업데이트 오류:', error.message);
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
  updateSchema()
    .then(() => {
      console.log('✅ 스크립트 실행 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { updateSchema };

