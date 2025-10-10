// Check database data
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://insighti_db_user:XdLtT1B6TnbaZrUBRjxX6RjrUoTfCSWK@dpg-d3jle0ndiees73ckef60-a.singapore-postgres.render.com:5432/insighti_db',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 데이터베이스 확인 중...\n');
    
    // Check complexes
    const complexes = await client.query('SELECT * FROM complex');
    console.log('📍 Complex 데이터:');
    console.log(complexes.rows);
    console.log('');
    
    // Check households
    const households = await client.query(`
      SELECT h.*, c.name as complex_name 
      FROM household h 
      JOIN complex c ON h.complex_id = c.id
    `);
    console.log('🏠 Household 데이터:');
    console.log(households.rows);
    console.log('');
    
    // Check cases
    const cases = await client.query('SELECT * FROM case_header');
    console.log('📋 Case 데이터:');
    console.log(cases.rows);
    console.log('');
    
    console.log('✅ 확인 완료!');
    
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabase();

