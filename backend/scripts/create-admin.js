// Create Super Admin account
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function createSuperAdmin() {
  // DATABASE_URL 또는 개별 환경 변수 사용
  const databaseUrl = process.env.DATABASE_URL || 
    (process.env.DB_HOST ? 
      `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}` :
      null);
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL 또는 DB_* 환경 변수가 필요합니다');
    console.error('   DATABASE_URL="postgresql://..." node create-admin.js');
    console.error('   또는 DB_HOST, DB_USER, DB_PASSWORD, DB_NAME 설정');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 데이터베이스 연결 중...');
    await client.connect();
    console.log('✅ 연결 성공\n');

    // admin_user 테이블 존재 확인
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_user'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('❌ admin_user 테이블이 존재하지 않습니다');
      console.error('   먼저 데이터베이스 스키마를 생성하세요');
      process.exit(1);
    }

    // 비밀번호 해시 생성
    const password = 'admin123'; // 기본 비밀번호
    const passwordHash = await bcrypt.hash(password, 10);

    // Super Admin 생성
    console.log('👨‍💼 관리자 계정 생성 중...');
    
    const result = await client.query(`
      INSERT INTO admin_user (email, password_hash, name, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE
      SET password_hash = $2, is_active = true, name = $3, role = $4
      RETURNING id, email, name, role
    `, ['admin@insighti.com', passwordHash, 'Super Admin', 'super_admin', true]);

    console.log('✅ 관리자 계정 생성/업데이트 완료:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 이메일:', result.rows[0].email);
    console.log('🔑 비밀번호:', password);
    console.log('👤 이름:', result.rows[0].name);
    console.log('🎖️  역할:', result.rows[0].role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('⚠️  보안 주의:');
    console.log('   프로덕션 환경에서는 비밀번호를 반드시 변경하세요!');
    console.log('   기본 비밀번호: admin123\n');

  } catch (error) {
    console.error('❌ 실패:', error.message);
    if (error.code === '42P01') {
      console.error('   admin_user 테이블이 존재하지 않습니다');
      console.error('   먼저 데이터베이스 스키마를 생성하세요');
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('✅ 완료\n');
  }
}

createSuperAdmin();

