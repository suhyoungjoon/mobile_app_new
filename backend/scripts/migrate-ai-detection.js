const fs = require('fs');
const path = require('path');
const pool = require('../database');

async function migrateAIDetectionSettings() {
  const sqlPath = path.join(__dirname, 'migrate-ai-detection.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  try {
    console.log('🚀 Running AI detection settings migration...');
    await pool.query(sql);
    console.log('✅ AI detection settings migration completed.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateAIDetectionSettings();

