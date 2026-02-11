/**
 * inspection_item.type에 'visual'(육안점검) 추가
 * 기존 CHECK (type IN ('thermal','air','radon','level')) → 'visual' 포함
 */
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://insighti_user:2eq3v151vjtJ2wUz4PUUQ2VHhlTbjWRy@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
});

async function run() {
  console.log('🔧 inspection_item type에 "visual" 추가 마이그레이션');
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE inspection_item
      DROP CONSTRAINT IF EXISTS inspection_item_type_check
    `);
    await client.query(`
      ALTER TABLE inspection_item
      ADD CONSTRAINT inspection_item_type_check
      CHECK (type IN ('thermal','air','radon','level','visual'))
    `);
    console.log('✅ inspection_item.type에 "visual" 추가 완료');
  } catch (e) {
    if (e.code === '42701') {
      console.log('ℹ️ constraint가 이미 변경되어 있거나 이름이 다를 수 있습니다. 수동 확인 후 재실행하세요.');
    }
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
