// 마이그레이션: 점검결과 PDF 양식 컬럼 (001_pdf_form_columns.sql)
const path = require('path');
const envPaths = [path.join(process.cwd(), '.env'), path.join(process.cwd(), '..', '.env')];
for (const p of envPaths) {
  try {
    require('dotenv').config({ path: p });
    if (process.env.DATABASE_URL) break;
  } catch (e) {}
}
const { Client } = require('pg');
const fs = require('fs');

// Render PostgreSQL (다른 마이그레이션 스크립트와 동일한 fallback)
const RENDER_DB_FALLBACK = 'postgresql://insighti_user:2eq3v151vjtJ2wUz4PUUQ2VHhlTbjWRy@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk';

function getDatabaseUrl() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) return process.env.DATABASE_URL;
  return RENDER_DB_FALLBACK;
}

async function migrate() {
  const url = getDatabaseUrl();
  const isFallback = url === RENDER_DB_FALLBACK;
  if (isFallback) console.log('📌 Using Render PostgreSQL (fallback URL from project)\n');

  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
  const client = new Client({
    connectionString: url,
    ssl: isLocalhost ? false : { rejectUnauthorized: false }
  });

  const sqlPath = path.join(__dirname, '../../db/migrations/001_pdf_form_columns.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Run each statement (split by ; at line end, skip comments and empty)
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.replace(/--[^\n]*/g, '').trim())
    .filter((s) => s.length > 0);

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      const preview = stmt.slice(0, 60).replace(/\s+/g, ' ') + '...';
      console.log(`📝 [${i + 1}/${statements.length}] ${preview}`);
      await client.query(stmt);
      console.log('   ✅ OK');
    }

    console.log('\n✅ Migration 001_pdf_form_columns completed successfully.\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('✅ Database connection closed.\n');
  }
}

migrate();
