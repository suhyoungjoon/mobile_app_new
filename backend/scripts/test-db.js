// Database connection test script
const pool = require('../database');

async function testDatabase() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test table existence
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Available tables:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Test sample data
    const complexCount = await client.query('SELECT COUNT(*) FROM complex');
    const householdCount = await client.query('SELECT COUNT(*) FROM household');
    const caseCount = await client.query('SELECT COUNT(*) FROM case_header');
    const defectCount = await client.query('SELECT COUNT(*) FROM defect');
    
    console.log('\n📊 Data counts:');
    console.log(`  - Complexes: ${complexCount.rows[0].count}`);
    console.log(`  - Households: ${householdCount.rows[0].count}`);
    console.log(`  - Cases: ${caseCount.rows[0].count}`);
    console.log(`  - Defects: ${defectCount.rows[0].count}`);
    
    // Test sample query
    const sampleData = await client.query(`
      SELECT 
        c.name as complex_name,
        h.dong,
        h.ho,
        h.resident_name,
        ch.type as case_type,
        COUNT(d.id) as defect_count
      FROM complex c
      JOIN household h ON c.id = h.complex_id
      LEFT JOIN case_header ch ON h.id = ch.household_id
      LEFT JOIN defect d ON ch.id = d.case_id
      GROUP BY c.name, h.dong, h.ho, h.resident_name, ch.type
      ORDER BY c.name, h.dong, h.ho
    `);
    
    console.log('\n🏠 Sample data:');
    sampleData.rows.forEach(row => {
      console.log(`  - ${row.complex_name} ${row.dong}-${row.ho} (${row.resident_name}): ${row.defect_count} defects`);
    });
    
    client.release();
    console.log('\n✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run test
testDatabase();
