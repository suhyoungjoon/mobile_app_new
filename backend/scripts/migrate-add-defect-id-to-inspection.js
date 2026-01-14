// 마이그레이션: inspection_item 테이블에 defect_id 컬럼 추가
const { Client } = require('pg');

async function migrate() {
  // Render PostgreSQL 연결 (다른 마이그레이션 스크립트와 동일한 방식)
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://insighti_user:2eq3v151vjtJ2wUz4PUUQ2VHhlTbjWRy@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk';
  
  const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: isLocalhost ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    // 1. inspection_item 테이블에 defect_id 컬럼 추가
    console.log('📝 Adding defect_id column to inspection_item table...');
    await client.query(`
      ALTER TABLE inspection_item 
      ADD COLUMN IF NOT EXISTS defect_id TEXT REFERENCES defect(id)
    `);
    console.log('✅ defect_id column added\n');

    // 2. 인덱스 추가
    console.log('📝 Creating index for defect_id...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_inspection_defect 
      ON inspection_item(defect_id)
    `);
    console.log('✅ Index created\n');

    console.log('✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('✅ Database connection closed\n');
  }
}

migrate();

