// 푸시 알림 데이터베이스 마이그레이션 스크립트
const { Pool } = require('pg');
require('dotenv').config();

// Render PostgreSQL 연결
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://insighti_user:2eq3v151vjtJ2wUz4PUUQ2VHhlTbjWRy@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migratePushNotifications() {
  console.log('🔧 푸시 알림 시스템 데이터베이스 마이그레이션 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. push_subscription 테이블 생성
    console.log('1️⃣ push_subscription 테이블 생성...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscription (
        id SERIAL PRIMARY KEY,
        household_id INTEGER REFERENCES household(id) ON DELETE CASCADE,
        complex_id INTEGER REFERENCES complex(id),
        dong TEXT,
        ho TEXT,
        name TEXT,
        user_type TEXT DEFAULT 'resident' CHECK (user_type IN ('resident','company','admin','super_admin')),
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        UNIQUE(household_id, endpoint)
      )
    `);
    console.log('✅ push_subscription 테이블 생성 완료');
    
    // 2. 인덱스 생성
    console.log('2️⃣ 인덱스 생성...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_push_subscription_household 
      ON push_subscription(household_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_push_subscription_user_type 
      ON push_subscription(user_type)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_push_subscription_endpoint 
      ON push_subscription(endpoint)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_push_subscription_complex 
      ON push_subscription(complex_id)
    `);
    
    console.log('✅ 인덱스 생성 완료');
    
    // 3. 테이블 존재 확인
    console.log('3️⃣ 테이블 존재 확인...');
    const tableCheck = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'push_subscription'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ push_subscription 테이블 확인됨');
      
      // 컬럼 정보 확인
      const columnCheck = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'push_subscription'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 테이블 컬럼:');
      columnCheck.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      
    } else {
      throw new Error('테이블 생성 실패');
    }
    
    await client.query('COMMIT');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 푸시 알림 시스템 마이그레이션 완료');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
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
  migratePushNotifications()
    .then(() => {
      console.log('🎉 마이그레이션 성공');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ 마이그레이션 실패:', err);
      process.exit(1);
    });
}

module.exports = { migratePushNotifications };