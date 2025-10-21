// 점검원 등록 시스템 데이터베이스 마이그레이션
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Render PostgreSQL 연결
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://insighti_user:2eq3v151vjtJ2wUz4PUUQ2VHhlTbjWRy@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateInspectorRegistration() {
  console.log('🔧 점검원 등록 시스템 마이그레이션 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const client = await pool.connect();
  try {
    // 1. inspector_registration 테이블 생성
    console.log('1️⃣ inspector_registration 테이블 생성...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS inspector_registration (
        id SERIAL PRIMARY KEY,
        complex_id INTEGER REFERENCES complex(id),
        dong TEXT NOT NULL,
        ho TEXT NOT NULL,
        inspector_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        company_name TEXT,
        license_number TEXT,
        email TEXT,
        registration_reason TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        approved_by INTEGER REFERENCES admin_user(id),
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `);
    console.log('✅ inspector_registration 테이블 생성 완료');
    
    // 2. 인덱스 생성
    console.log('2️⃣ 인덱스 생성...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_inspector_registration_status 
      ON inspector_registration(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_inspector_registration_complex 
      ON inspector_registration(complex_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_inspector_registration_created 
      ON inspector_registration(created_at)
    `);
    console.log('✅ 인덱스 생성 완료');
    
    // 3. 샘플 데이터 삽입
    console.log('3️⃣ 샘플 데이터 삽입...');
    
    // Complex ID 가져오기
    const complexResult = await client.query('SELECT id FROM complex LIMIT 1');
    if (complexResult.rows.length === 0) {
      console.log('❌ Complex 데이터가 없습니다. 먼저 기본 데이터를 생성해주세요.');
      return false;
    }
    const complexId = complexResult.rows[0].id;
    
    // 샘플 점검원 등록 데이터 삽입
    await client.query(`
      INSERT INTO inspector_registration (
        complex_id, dong, ho, inspector_name, phone, company_name, 
        license_number, email, registration_reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT DO NOTHING
    `, [
      complexId, '101', '1205', '김점검', '010-5555-5555', 
      'ABC 점검회사', '12345', 'kim@abc.com', 
      '장비점검 업무를 위해 등록을 신청합니다.', 'pending'
    ]);
    
    await client.query(`
      INSERT INTO inspector_registration (
        complex_id, dong, ho, inspector_name, phone, company_name, 
        license_number, email, registration_reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT DO NOTHING
    `, [
      complexId, '102', '1206', '이점검', '010-6666-6666', 
      'XYZ 점검회사', '67890', 'lee@xyz.com', 
      '열화상 및 공기질 측정 업무를 위해 등록을 신청합니다.', 'pending'
    ]);
    
    console.log('✅ 샘플 데이터 삽입 완료');
    
    // 4. 마이그레이션 결과 확인
    console.log('4️⃣ 마이그레이션 결과 확인...');
    const tableCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM inspector_registration
    `);
    
    const indexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'inspector_registration'
    `);
    
    console.log('📊 마이그레이션 결과:');
    console.log(`   - 테이블 레코드 수: ${tableCheck.rows[0].count}개`);
    console.log(`   - 생성된 인덱스: ${indexCheck.rows.length}개`);
    
    console.log('\n🎉 점검원 등록 시스템 마이그레이션 완료!');
    return true;
    
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error.message);
    return false;
  } finally {
    client.release();
  }
}

// 마이그레이션 실행
migrateInspectorRegistration()
  .then(success => {
    if (success) {
      console.log('\n✅ 마이그레이션이 성공적으로 완료되었습니다.');
      console.log('이제 서버를 재배포하여 새로운 API 엔드포인트를 활성화하세요.');
    } else {
      console.log('\n❌ 마이그레이션이 실패했습니다.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ 마이그레이션 실행 중 오류:', error);
    process.exit(1);
  });
