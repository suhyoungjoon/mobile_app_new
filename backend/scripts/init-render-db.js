// Initialize Render PostgreSQL database
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Render PostgreSQL connection
const pool = new Pool({
  connectionString: 'postgresql://insighti_db_user:XdLtT1B6TnbaZrUBRjxX6RjrUoTfCSWK@dpg-d3jle0ndiees73ckef60-a.singapore-postgres.render.com:5432/insighti_db',
  ssl: {
    rejectUnauthorized: false
  }
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 데이터베이스 연결 성공');
    
    // Read SQL file
    const sqlFilePath = path.join(__dirname, 'init-db.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📋 스키마 생성 중...');
    
    // Execute SQL
    await client.query(sql);
    
    console.log('✅ 데이터베이스 초기화 완료!');
    
    // Check tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\n📊 생성된 테이블:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Insert sample data
    console.log('\n📝 샘플 데이터 삽입 중...');
    
    await client.query(`
      INSERT INTO complex (name, address) 
      VALUES ('서울 인싸이트자이', '서울시 강남구') 
      ON CONFLICT DO NOTHING;
    `);
    
    const complexResult = await client.query(`
      SELECT id FROM complex WHERE name = '서울 인싸이트자이';
    `);
    
    if (complexResult.rows.length > 0) {
      const complexId = complexResult.rows[0].id;
      
      await client.query(`
        INSERT INTO household (complex_id, dong, ho, resident_name, phone) 
        VALUES ($1, '101', '1203', '홍길동', '010-0000-0000')
        ON CONFLICT DO NOTHING;
      `, [complexId]);
      
      console.log('✅ 샘플 데이터 삽입 완료!');
    }
    
    console.log('\n🎉 데이터베이스 준비 완료!');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

