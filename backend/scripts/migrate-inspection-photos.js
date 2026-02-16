// inspection_photo 테이블 생성 마이그레이션
// 사용: backend에서 node scripts/migrate-inspection-photos.js 또는 npm run migrate:inspection-photos
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = require('pg');
const FALLBACK_URL = 'postgresql://insighti_user:2eq3v151vjtJ2wUz4PUUQ2VHhlTbjWRy@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk';
const connectionString = (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '')
  ? process.env.DATABASE_URL
  : FALLBACK_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('render.com') ? { rejectUnauthorized: false } : false,
  max: 2
});

async function run() {
  const sqlPath = path.join(__dirname, 'migrate-inspection-photos.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  try {
    console.log('🔄 Running inspection_photo migration...');
    await pool.query(sql);
    console.log('✅ inspection_photo migration completed.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('postgres')) {
      console.error('\n💡 DATABASE_URL 또는 fallback URL로 재시도했으나 실패했습니다. DB 연결 정보를 확인하세요.');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
