// Push Notification Admin Support Migration Script
// 관리자 계정 푸시 알림 지원을 위한 데이터베이스 마이그레이션

const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function migratePushAdminSupport() {
  console.log('🔧 관리자 계정 푸시 알림 지원 마이그레이션 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. household_id를 NULL 허용
    console.log('1️⃣ household_id 컬럼을 NULL 허용으로 수정...');
    try {
      await client.query(`
        ALTER TABLE push_subscription 
        ALTER COLUMN household_id DROP NOT NULL
      `);
      console.log('✅ household_id NULL 허용 완료');
    } catch (error) {
      if (error.message.includes('does not exist') || error.message.includes('not a constraint')) {
        console.log('ℹ️  household_id는 이미 NULL 허용입니다');
      } else {
        throw error;
      }
    }
    
    // 2. dong, ho, name을 NULL 허용
    console.log('2️⃣ dong, ho, name 컬럼을 NULL 허용으로 수정...');
    const nullableColumns = ['dong', 'ho', 'name'];
    for (const col of nullableColumns) {
      try {
        await client.query(`
          ALTER TABLE push_subscription 
          ALTER COLUMN ${col} DROP NOT NULL
        `);
        console.log(`✅ ${col} NULL 허용 완료`);
      } catch (error) {
        if (error.message.includes('does not exist') || error.message.includes('not a constraint')) {
          console.log(`ℹ️  ${col}는 이미 NULL 허용입니다`);
        } else {
          throw error;
        }
      }
    }
    
    // 3. 기존 UNIQUE 제약 조건 제거
    console.log('3️⃣ 기존 UNIQUE 제약 조건 제거...');
    try {
      await client.query(`
        ALTER TABLE push_subscription 
        DROP CONSTRAINT IF EXISTS push_subscription_household_id_endpoint_key
      `);
      console.log('✅ 기존 UNIQUE 제약 조건 제거 완료');
    } catch (error) {
      console.log('ℹ️  기존 제약 조건이 없거나 이미 제거되었습니다');
    }
    
    // 4. endpoint에 UNIQUE 제약 조건 추가
    console.log('4️⃣ endpoint에 UNIQUE 제약 조건 추가...');
    try {
      await client.query(`
        ALTER TABLE push_subscription 
        ADD CONSTRAINT push_subscription_endpoint_unique UNIQUE (endpoint)
      `);
      console.log('✅ endpoint UNIQUE 제약 조건 추가 완료');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  endpoint UNIQUE 제약 조건이 이미 존재합니다');
      } else {
        throw error;
      }
    }
    
    // 5. 일반 사용자 계정용 복합 UNIQUE 제약 조건 추가
    // PostgreSQL에서는 복합 UNIQUE 제약 조건이 NULL 값을 허용하므로
    // (household_id, endpoint) 제약 조건을 추가해도 관리자 계정(household_id = NULL)과 충돌하지 않음
    console.log('5️⃣ 일반 사용자 계정용 복합 UNIQUE 제약 조건 추가...');
    try {
      await client.query(`
        ALTER TABLE push_subscription 
        ADD CONSTRAINT push_subscription_household_endpoint_unique 
        UNIQUE (household_id, endpoint)
      `);
      console.log('✅ 복합 UNIQUE 제약 조건 추가 완료');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
        console.log('ℹ️  복합 UNIQUE 제약 조건이 이미 존재합니다');
      } else {
        throw error;
      }
    }
    
    // 6. 관리자 계정용 인덱스 생성
    console.log('6️⃣ 관리자 계정용 인덱스 생성...');
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_push_subscription_admin 
        ON push_subscription(user_type) 
        WHERE user_type IN ('admin', 'super_admin')
      `);
      console.log('✅ 관리자 계정 인덱스 생성 완료');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  관리자 계정 인덱스가 이미 존재합니다');
      } else {
        throw error;
      }
    }
    
    await client.query('COMMIT');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 관리자 계정 푸시 알림 지원 마이그레이션 완료');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 변경 사항:');
    console.log('   - household_id, dong, ho, name 컬럼이 NULL 허용');
    console.log('   - endpoint에 UNIQUE 제약 조건 추가 (관리자 계정용)');
    console.log('   - 일반 사용자 계정용 부분 UNIQUE 인덱스 생성');
    console.log('   - 관리자 계정용 인덱스 생성');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 마이그레이션 실패:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 메인 실행
if (require.main === module) {
  migratePushAdminSupport()
    .then(() => {
      console.log('🎉 마이그레이션 성공');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ 마이그레이션 실패:', err);
      process.exit(1);
    });
}

module.exports = { migratePushAdminSupport };

